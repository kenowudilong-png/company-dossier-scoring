from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID
from fastapi import FastAPI, HTTPException
from psycopg.types.json import Jsonb
from pydantic import BaseModel

from app.core.db import connect
from app.engine.llm import chat_json, model_settings
from app.engine.scoring import aggregate, citation_for, eligible_chunks, load_template, score_dimension, validate_dimension_llm

app = FastAPI(title="Scoring Service")

class ScoreRun(BaseModel):
    dossier_id: UUID
    force_deterministic: bool = False

@app.get("/health")
def health():
    return {"ok": True, "service": "scoring"}

@app.post("/score/run")
def score_run(request: ScoreRun):
    dossier_id = str(request.dossier_id)
    with connect() as conn:
        dossier = conn.execute("SELECT id, template_id FROM dossiers WHERE id=%s", (dossier_id,)).fetchone()
        if not dossier:
            raise HTTPException(status_code=404, detail="dossier not found")
        conn.execute("UPDATE dossiers SET status='scoring', updated_at=now() WHERE id=%s", (dossier_id,))
        chunks = conn.execute(
            """
            SELECT chunks.* FROM chunks
            JOIN dossier_chunks ON dossier_chunks.chunk_id = chunks.id
            WHERE dossier_chunks.dossier_id=%s AND chunks.is_trusted=true
            ORDER BY chunks.trust_tier DESC, chunks.created_at DESC
            """,
            (dossier_id,),
        ).fetchall()
        template = load_template(dossier["template_id"])
        settings = model_settings(conn)
        dimensions = []
        llm_enabled = bool(settings["base_url"] and settings["api_key"] and settings["model_name"] and not request.force_deterministic)
        llm_status = "disabled"
        for dimension in template["dimensions"]:
            selected = eligible_chunks(dimension, chunks)[:12]
            if not selected:
                dimensions.append(score_dimension(dimension, chunks))
                continue
            if not llm_enabled:
                dimensions.append(score_dimension(dimension, chunks))
                continue
            evidence = [citation_for(chunk) | {"content": chunk["content"][:900], "trust_tier": float(chunk["trust_tier"])} for chunk in selected]
            prompt = {
                "dimension": {"id": dimension["id"], "name": dimension["name"], "required_evidence": dimension["required_evidence"], "min_trust_tier": dimension["min_trust_tier"]},
                "evidence": evidence,
                "schema": {"score": "0-100 integer", "rationale": "string with cited chunk_id", "strengths": ["string"], "weaknesses": ["string"], "gaps": ["string"], "citations": [{"chunk_id": "must be one of evidence chunk_id"}]},
                "rule": "只能依据 evidence 评分；无证据必须低分并写入 gaps；citations 必须来自 evidence。",
            }
            try:
                raw = chat_json(
                    settings["base_url"], settings["api_key"], settings["model_name"],
                    [
                        {"role": "system", "content": "你是严格的企业档案评分器。只输出 JSON，不得编造证据。"},
                        {"role": "user", "content": str(prompt)},
                    ],
                )
                dimensions.append(validate_dimension_llm(dimension, raw, selected))
                conn.execute("INSERT INTO llm_calls (dossier_id, purpose, model, request, response, status) VALUES (%s,'score_dimension',%s,%s,%s,'ok')", (dossier_id, settings["model_name"], Jsonb(prompt), Jsonb(raw)))
                llm_status = "ok"
            except Exception as exc:
                fallback = score_dimension(dimension, chunks)
                fallback["rationale"] = f"LLM 调用失败，已降级为本地证据评分：{fallback['rationale']}"
                dimensions.append(fallback)
                conn.execute("INSERT INTO llm_calls (dossier_id, purpose, model, request, response, status) VALUES (%s,'score_dimension',%s,%s,%s,'fallback')", (dossier_id, settings["model_name"] or "not-configured", Jsonb(prompt), Jsonb({"error": str(exc)})))
                llm_status = "fallback"
        overall = aggregate({item["id"]: item["score"] for item in dimensions}, template)
        content = {
            "dossier_id": dossier_id,
            "template_id": template["id"],
            "template_version": template["version"],
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "overall": overall,
            "dimensions": dimensions,
            "executive_summary": "本报告仅基于已上传档案资料生成，所有结论均需回溯引用证据。" + (" 已启用真实 LLM JSON 评分。" if llm_status == "ok" else " 当前使用本地证据规则或降级评分。"),
            "global_gaps": sorted({gap for dim in dimensions for gap in dim["gaps"]}),
            "llm_status": llm_status,
        }
        version = conn.execute("SELECT COALESCE(MAX(version), 0) + 1 AS version FROM scorecards WHERE dossier_id=%s", (dossier_id,)).fetchone()["version"]
        row = conn.execute(
            "INSERT INTO scorecards (dossier_id, template_id, template_version, version, content) VALUES (%s,%s,%s,%s,%s) RETURNING id",
            (dossier_id, template["id"], template["version"], version, Jsonb(content)),
        ).fetchone()
        conn.execute("UPDATE dossiers SET status='ready', current_version=%s, updated_at=now() WHERE id=%s", (version, dossier_id))
        conn.execute("INSERT INTO llm_calls (dossier_id, purpose, model, request, response, status) VALUES (%s,'score',%s,%s,%s,%s)", (dossier_id, settings["model_name"] or "deterministic-v1", Jsonb({"template_id": template["id"], "llm_enabled": llm_enabled}), Jsonb(content), llm_status))
        conn.commit()
    return {"scorecard_id": str(row["id"]), "version": version, "scorecard": content}

@app.get("/scorecards/{dossier_id}/latest")
def latest_scorecard(dossier_id: UUID):
    with connect() as conn:
        row = conn.execute("SELECT id, dossier_id, version, content, generated_at FROM scorecards WHERE dossier_id=%s ORDER BY version DESC LIMIT 1", (str(dossier_id),)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="scorecard not found")
    row["id"] = str(row["id"])
    row["dossier_id"] = str(row["dossier_id"])
    return row
