from __future__ import annotations

import json
import re
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


def parse_json_object(text: str) -> dict[str, Any]:
    stripped = text.strip()
    if stripped.startswith("```"):
        stripped = re.sub(r"^```(?:json)?", "", stripped).strip()
        stripped = re.sub(r"```$", "", stripped).strip()
    try:
        value = json.loads(stripped)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", stripped, re.S)
        if not match:
            raise
        value = json.loads(match.group(0))
    if not isinstance(value, dict):
        raise ValueError("LLM response must be a JSON object")
    return value


def chat_json(base_url: str, api_key: str, model: str, messages: list[dict[str, str]], timeout: int = 45) -> dict[str, Any]:
    payload = {"model": model, "messages": messages, "temperature": 0.1, "stream": False, "response_format": {"type": "json_object"}}
    request = Request(
        f"{base_url.rstrip('/')}/chat/completions",
        data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {api_key}"},
        method="POST",
    )
    try:
        with urlopen(request, timeout=timeout) as response:
            body = json.loads(response.read().decode("utf-8"))
    except HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="ignore")[:300]
        raise RuntimeError(f"LLM HTTP {exc.code}: {detail}") from exc
    except URLError as exc:
        raise RuntimeError(f"LLM network error: {exc.reason}") from exc
    content = body.get("choices", [{}])[0].get("message", {}).get("content", "")
    return parse_json_object(content)


def model_settings(conn) -> dict[str, str]:
    row = conn.execute("SELECT base_url, api_key, model_name FROM model_settings WHERE id=1").fetchone()
    if not row:
        return {"base_url": "", "api_key": "", "model_name": ""}
    return {"base_url": row.get("base_url") or "", "api_key": row.get("api_key") or "", "model_name": row.get("model_name") or ""}
