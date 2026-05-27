from __future__ import annotations

from uuid import UUID
from fastapi import FastAPI, HTTPException
from psycopg.types.json import Jsonb
from pydantic import BaseModel
from minio import Minio

from app.core.config import settings
from app.core.db import connect
from app.pipeline.processing import chunk_pages, parse_file, stable_vector, vector_literal

app = FastAPI(title="Parser Service")

class ParseStart(BaseModel):
    dossier_id: UUID


def minio_client() -> Minio:
    return Minio(settings.minio_endpoint, access_key=settings.minio_access_key, secret_key=settings.minio_secret_key, secure=False)


def read_object(key: str) -> bytes:
    client = minio_client()
    response = client.get_object(settings.minio_bucket, key)
    try:
        return response.read()
    finally:
        response.close()
        response.release_conn()


def update_job(job_id: str, status: str, percent: int, message: str, error: str | None = None) -> None:
    with connect() as conn:
        conn.execute(
            "UPDATE parse_jobs SET status=%s, progress=%s, error=%s, started_at=COALESCE(started_at, now()), finished_at=CASE WHEN %s IN ('done','failed') THEN now() ELSE finished_at END WHERE id=%s",
            (status, Jsonb({"percent": percent, "message": message}), error, status, job_id),
        )
        conn.commit()


def run_parse(job_id: str, dossier_id: str) -> None:
    try:
        update_job(job_id, "parsing", 10, "读取档案文件")
        with connect() as conn:
            dossier = conn.execute("SELECT company_id FROM dossiers WHERE id=%s", (dossier_id,)).fetchone()
            if not dossier:
                raise ValueError("dossier not found")
            files = conn.execute(
                """
                SELECT files.* FROM files
                JOIN dossier_files ON dossier_files.file_id = files.id
                WHERE dossier_files.dossier_id=%s
                ORDER BY files.created_at
                """,
                (dossier_id,),
            ).fetchall()
        total_chunks = 0
        for file_index, file_row in enumerate(files, start=1):
            update_job(job_id, "parsing", 20 + int(file_index / max(1, len(files)) * 40), f"解析 {file_row['filename']}")
            data = read_object(file_row["object_key"])
            pages = parse_file(file_row["filename"], file_row["mime_type"], data)
            chunks = chunk_pages(str(file_row["id"]), pages)
            parsed_text = "\n".join(page.text for page in pages)
            with connect() as conn:
                conn.execute("UPDATE files SET parsed_text=%s, status='parsed', updated_at=now() WHERE id=%s", (parsed_text, file_row["id"]))
                for chunk in chunks:
                    embedding = vector_literal(stable_vector(chunk.content))
                    row = conn.execute(
                        """
                        INSERT INTO chunks (company_id, file_id, chunk_id, page_number, content, snippet, trust_tier, trust_label, embedding, source_ref)
                        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s::vector,%s)
                        ON CONFLICT (chunk_id) DO UPDATE SET snippet=EXCLUDED.snippet
                        RETURNING id
                        """,
                        (dossier["company_id"], file_row["id"], chunk.chunk_id, chunk.page_number, chunk.content, chunk.snippet, file_row["trust_tier"], file_row["trust_label"], embedding, file_row["filename"]),
                    ).fetchone()
                    conn.execute("INSERT INTO dossier_chunks (dossier_id, chunk_id) VALUES (%s,%s) ON CONFLICT DO NOTHING", (dossier_id, row["id"]))
                    total_chunks += 1
                conn.commit()
        with connect() as conn:
            conn.execute("UPDATE dossiers SET status='ready', updated_at=now() WHERE id=%s", (dossier_id,))
            conn.commit()
        update_job(job_id, "done", 100, f"解析完成，入库 {total_chunks} 个知识块")
    except Exception as exc:
        with connect() as conn:
            conn.execute("UPDATE dossiers SET status='failed', updated_at=now() WHERE id=%s", (dossier_id,))
            conn.commit()
        update_job(job_id, "failed", 100, str(exc), str(exc))


@app.get("/health")
def health():
    return {"ok": True, "service": "parser"}


@app.post("/parse/start")
def parse_start(request: ParseStart):
    with connect() as conn:
        dossier = conn.execute("SELECT id FROM dossiers WHERE id=%s", (str(request.dossier_id),)).fetchone()
        if not dossier:
            raise HTTPException(status_code=404, detail="dossier not found")
        job = conn.execute("INSERT INTO parse_jobs (dossier_id, status, progress) VALUES (%s,'queued',%s) RETURNING id", (str(request.dossier_id), Jsonb({"percent": 0, "message": "等待解析"}))).fetchone()
        conn.execute("UPDATE dossiers SET status='parsing', updated_at=now() WHERE id=%s", (str(request.dossier_id),))
        conn.commit()
    run_parse(str(job["id"]), str(request.dossier_id))
    return {"job_id": str(job["id"]), "status": "done"}


@app.get("/parse/jobs/{job_id}")
def parse_job(job_id: UUID):
    with connect() as conn:
        row = conn.execute("SELECT id, dossier_id, status, progress, error, started_at, finished_at FROM parse_jobs WHERE id=%s", (str(job_id),)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="job not found")
    return {key: str(value) if key in {"id", "dossier_id"} and value is not None else value for key, value in row.items()}
