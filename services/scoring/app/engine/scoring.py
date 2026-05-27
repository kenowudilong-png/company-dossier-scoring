from __future__ import annotations

from pathlib import Path
from typing import Any
import yaml

TEMPLATE_DIR = Path(__file__).resolve().parents[1] / "templates"
BANDS = [
    ((80, 100), "优秀", "success"),
    ((60, 79), "良好", "info"),
    ((40, 59), "合格", "warning"),
    ((20, 39), "偏弱", "warning"),
    ((0, 19), "较差", "danger"),
]
KEYWORDS = {
    "financial": ["营收", "利润", "现金", "负债", "资产", "收入", "财务"],
    "risk": ["风险", "诉讼", "处罚", "监管", "依赖", "负面"],
    "market": ["市场", "客户", "行业", "份额", "竞争"],
    "team": ["团队", "管理", "董事", "治理", "股权"],
    "technology": ["技术", "产品", "专利", "研发", "平台"],
    "esg": ["环保", "员工", "供应链", "反腐", "董事会", "ESG"],
}

def load_template(template_id: str) -> dict[str, Any]:
    path = TEMPLATE_DIR / f"{template_id}.yaml"
    if not path.exists():
        raise ValueError(f"template not found: {template_id}")
    return yaml.safe_load(path.read_text())


def band_for(score: int) -> dict[str, Any]:
    for (lo, hi), label, color in BANDS:
        if lo <= score <= hi:
            return {"label": label, "color": color}
    return {"label": "较差", "color": "danger"}


def score_dimension(dimension: dict[str, Any], chunks: list[dict[str, Any]]) -> dict[str, Any]:
    eligible = [chunk for chunk in chunks if float(chunk["trust_tier"]) >= float(dimension["min_trust_tier"]) and chunk.get("is_trusted", True)]
    if not eligible:
        return {
            "id": dimension["id"], "name": dimension["name"], "weight": dimension["weight"], "score": 0,
            "band": "较差", "rationale": f"本维度缺少可信度 ≥ {dimension['min_trust_tier']} 的证据。",
            "strengths": [], "weaknesses": ["证据不足"], "citations": [], "gaps": [dimension["required_evidence"]],
        }
    text = "\n".join(chunk["content"] for chunk in eligible)
    keyword_hits = 0
    lower = text.lower()
    for words in KEYWORDS.values():
        keyword_hits += sum(1 for word in words if word.lower() in lower)
    score = min(85, 45 + keyword_hits * 5 + len(eligible) * 4)
    citations = [{"chunk_id": chunk["chunk_id"], "source": chunk["source_ref"], "snippet": chunk["snippet"], "file_id": str(chunk["file_id"]), "page_number": chunk["page_number"]} for chunk in eligible[:3]]
    band = band_for(score)["label"]
    return {
        "id": dimension["id"], "name": dimension["name"], "weight": dimension["weight"], "score": score, "band": band,
        "rationale": f"根据 {len(citations)} 条档案证据，本维度暂评为{band}。[^{citations[0]['chunk_id']}]",
        "strengths": ["已有可引用资料支撑该维度判断"],
        "weaknesses": [] if score >= 60 else ["证据覆盖仍偏少"],
        "citations": citations,
        "gaps": [] if score >= 60 else [dimension["required_evidence"]],
    }


def eligible_chunks(dimension: dict[str, Any], chunks: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [chunk for chunk in chunks if float(chunk["trust_tier"]) >= float(dimension["min_trust_tier"]) and chunk.get("is_trusted", True)]


def citation_for(chunk: dict[str, Any]) -> dict[str, Any]:
    return {"chunk_id": chunk["chunk_id"], "source": chunk["source_ref"], "snippet": chunk["snippet"], "file_id": str(chunk["file_id"]), "page_number": chunk["page_number"]}


def validate_dimension_llm(dimension: dict[str, Any], raw: dict[str, Any], chunks: list[dict[str, Any]]) -> dict[str, Any]:
    allowed = {chunk["chunk_id"]: chunk for chunk in chunks}
    citations = []
    for item in raw.get("citations", []):
        chunk_id = str(item.get("chunk_id", ""))
        if chunk_id in allowed:
            citations.append(citation_for(allowed[chunk_id]))
    if not citations:
        return {
            "id": dimension["id"], "name": dimension["name"], "weight": dimension["weight"], "score": 0,
            "band": "较差", "rationale": "LLM 未返回可校验引用，本维度按证据不足处理。",
            "strengths": [], "weaknesses": ["证据不足"], "citations": [], "gaps": [dimension["required_evidence"]],
        }
    score = int(raw.get("score", 0))
    score = max(0, min(100, score))
    band = band_for(score)["label"]
    strengths = [str(item)[:160] for item in raw.get("strengths", []) if str(item).strip()][:5]
    weaknesses = [str(item)[:160] for item in raw.get("weaknesses", []) if str(item).strip()][:5]
    gaps = [str(item)[:160] for item in raw.get("gaps", []) if str(item).strip()][:5]
    rationale = str(raw.get("rationale", "")).strip()[:500] or f"基于 {len(citations)} 条档案证据评分。"
    first_chunk = citations[0]["chunk_id"]
    if first_chunk not in rationale:
        rationale = f"{rationale} [^{first_chunk}]"
    return {
        "id": dimension["id"], "name": dimension["name"], "weight": dimension["weight"], "score": score,
        "band": band, "rationale": rationale, "strengths": strengths, "weaknesses": weaknesses,
        "citations": citations[:5], "gaps": gaps,
    }


def aggregate(dim_scores: dict[str, int], template: dict[str, Any]) -> dict[str, Any]:
    weights = {dim["id"]: dim["weight"] for dim in template["dimensions"]}
    raw = sum(dim_scores[key] * weights[key] for key in dim_scores) / 100
    total = round(raw)
    vetoed = False
    veto_reason = None
    for rule in template.get("aggregation", {}).get("veto_rules", []):
        if dim_scores.get(rule["dimension"], 100) < rule["threshold"] and rule["effect"].startswith("cap_total_at_"):
            cap = int(rule["effect"].split("_")[-1])
            if total > cap:
                total = cap
                vetoed = True
                veto_reason = {"dimension": rule["dimension"], "cap": cap}
    band = band_for(total)
    return {"total": total, "band": band["label"], "color": band["color"], "vetoed": vetoed, "veto_reason": veto_reason, "dimension_scores": dim_scores}
