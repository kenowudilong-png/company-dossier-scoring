from app.main import answer_from_chunks, tokenize


def test_refusal_without_chunks():
    answer = answer_from_chunks("没有的问题", [])
    assert answer["refused"] is True


def test_answer_has_citation():
    row = {"chunk_id": "chk_1", "file_id": "file_1", "page_number": 2, "source_ref": "a.pdf", "snippet": "财务", "content": "财务表现良好"}
    answer = answer_from_chunks("财务如何", [row])
    assert answer["citations"][0]["chunk_id"] == "chk_1"


def test_tokenize_chinese():
    assert "财务" in tokenize("财务情况？")
