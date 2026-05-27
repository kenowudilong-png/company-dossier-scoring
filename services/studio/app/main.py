from __future__ import annotations

from uuid import UUID
from fastapi import FastAPI, HTTPException
from psycopg.types.json import Jsonb
from pydantic import BaseModel

from app.core.config import settings
from app.core.db import connect
from app.llm import chat_json, model_settings

app = FastAPI(title="Studio Service")

class AskRequest(BaseModel):
    dossier_id: UUID
    question: str
    dimension_id: str | None = None
    deep: bool = False


def tokenize(text: str) -> list[str]:
    normalized = text.lower().replace("，", " ").replace("？", " ").replace("。", " ")
    tokens = [item.strip("：:,.!?()[]{}\"'") for item in normalized.split() if len(item.strip()) >= 2]
    cn_terms = [term for term in ["财务", "营收", "利润", "现金流", "收入", "负债", "风险", "产品", "市场", "团队", "合规", "ESG", "融资", "客户", "处罚"] if term in text]
    return tokens + cn_terms


def retrieve(conn, dossier_id: str, question: str, limit: int):
    tokens = tokenize(question)
    rows = conn.execute(
        """
        SELECT chunks.* FROM chunks
        JOIN dossier_chunks ON dossier_chunks.chunk_id = chunks.id
        WHERE dossier_chunks.dossier_id=%s AND chunks.is_trusted=true
        ORDER BY chunks.trust_tier DESC, chunks.created_at DESC
        LIMIT 80
        """,
        (dossier_id,),
    ).fetchall()
    scored = []
    for row in rows:
        haystack = f"{row['content']} {row['snippet']} {row['source_ref']}".lower()
        lexical = sum(1 for token in tokens if token.lower() in haystack)
        score = lexical + float(row["trust_tier"])
        if lexical or not tokens:
            scored.append((score, row))
    scored.sort(key=lambda item: item[0], reverse=True)
    return [row for _, row in scored[:limit]]


def answer_from_chunks(question: str, chunks: list[dict]) -> dict:
    if not chunks:
        return {"answer": "本档案资料未提供该问题的相关信息", "citations": [], "refused": True}
    citations = [{"chunk_id": row["chunk_id"], "file_id": str(row["file_id"]), "page_number": row["page_number"], "source": row["source_ref"], "snippet": row["snippet"]} for row in chunks[:4]]
    bullets = "\n".join(f"- {row['content']} [^{row['chunk_id']}]" for row in chunks[:3])
    return {"answer": f"基于本档案资料，关于“{question}”可引用：\n{bullets}", "citations": citations, "refused": False}


def citation_for(row: dict) -> dict:
    return {"chunk_id": row["chunk_id"], "file_id": str(row["file_id"]), "page_number": row["page_number"], "source": row["source_ref"], "snippet": row["snippet"]}


def answer_with_llm(question: str, chunks: list[dict], model_config: dict[str, str]) -> dict:
    if not chunks:
        return {"answer": "本档案资料未提供该问题的相关信息", "citations": [], "refused": True}
    evidence = [citation_for(row) | {"content": row["content"][:1000], "trust_tier": float(row["trust_tier"])} for row in chunks[:8]]
    prompt = {
        "question": question,
        "evidence": evidence,
        "schema": {"answer": "string", "citations": [{"chunk_id": "must be one of evidence chunk_id"}], "refused": "boolean"},
        "rule": "只能依据 evidence 回答；如果 evidence 不足，answer 必须为“本档案资料未提供该问题的相关信息”，refused=true；citations 必须来自 evidence。",
    }
    raw = chat_json(
        model_config["base_url"], model_config["api_key"], model_config["model_name"],
        [
            {"role": "system", "content": "你是企业档案知识库问答助手。只输出 JSON，不得使用档案外信息。"},
            {"role": "user", "content": str(prompt)},
        ],
    )
    allowed = {item["chunk_id"]: item for item in evidence}
    citations = []
    for item in raw.get("citations", []):
        chunk_id = str(item.get("chunk_id", ""))
        if chunk_id in allowed:
            source = allowed[chunk_id]
            citations.append({key: source[key] for key in ["chunk_id", "file_id", "page_number", "source", "snippet"]})
    refused = bool(raw.get("refused")) or not citations
    if refused:
        return {"answer": "本档案资料未提供该问题的相关信息", "citations": [], "refused": True, "raw": raw, "prompt": prompt}
    answer = str(raw.get("answer", "")).strip()[:2000]
    if not answer:
        answer = "本档案资料未提供该问题的相关信息"
        return {"answer": answer, "citations": [], "refused": True, "raw": raw, "prompt": prompt}
    if citations[0]["chunk_id"] not in answer:
        answer = f"{answer} [^{citations[0]['chunk_id']}]"
    return {"answer": answer, "citations": citations[:5], "refused": False, "raw": raw, "prompt": prompt}


@app.get("/health")
def health():
    return {"ok": True, "service": "studio", "scope": "dossier_chunks_only"}


@app.post("/studio/ask")
def ask(request: AskRequest):
    question = request.question.strip()
    if not question:
        raise HTTPException(status_code=400, detail="question is required")
    dossier_id = str(request.dossier_id)
    with connect() as conn:
        dossier = conn.execute("SELECT id FROM dossiers WHERE id=%s", (dossier_id,)).fetchone()
        if not dossier:
            raise HTTPException(status_code=404, detail="dossier not found")
        conn.execute("INSERT INTO chat_messages (dossier_id, role, content, dimension_id) VALUES (%s,'user',%s,%s)", (dossier_id, question, request.dimension_id))
        chunks = retrieve(conn, dossier_id, question, settings.retrieval_top_k_studio)
        model_config = model_settings(conn)
        if model_config["base_url"] and model_config["api_key"] and model_config["model_name"]:
            try:
                answer = answer_with_llm(question, chunks, model_config)
                model_name = model_config["model_name"]
                call_status = "refused" if answer["refused"] else "ok"
                call_request = answer.get("prompt", {"question": question})
                call_response = answer.get("raw", answer)
            except Exception as exc:
                answer = answer_from_chunks(question, chunks)
                model_name = model_config["model_name"]
                call_status = "fallback"
                call_request = {"question": question}
                call_response = {"error": str(exc), "fallback": answer}
        else:
            answer = answer_from_chunks(question, chunks)
            model_name = "deterministic-v1"
            call_status = "refused" if answer["refused"] else "disabled"
            call_request = {"question": question}
            call_response = answer
        conn.execute(
            "INSERT INTO chat_messages (dossier_id, role, content, citations, refused, dimension_id) VALUES (%s,'assistant',%s,%s,%s,%s)",
            (dossier_id, answer["answer"], Jsonb(answer["citations"]), answer["refused"], request.dimension_id),
        )
        conn.execute("INSERT INTO llm_calls (dossier_id, purpose, model, request, response, status) VALUES (%s,'studio',%s,%s,%s,%s)", (dossier_id, model_name, Jsonb(call_request), Jsonb(call_response), call_status))
        conn.commit()
    return answer
