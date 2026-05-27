from app.pipeline.processing import chunk_pages, parse_txt, stable_vector


def test_parse_txt_and_chunk():
    pages = parse_txt("公司财务表现良好，存在少量风险。".encode())
    chunks = chunk_pages("file-1", pages, max_chars=10)
    assert pages[0].page_number == 1
    assert chunks
    assert chunks[0].chunk_id.startswith("chk_")


def test_stable_vector_dim():
    assert len(stable_vector("abc")) == 1536
    assert stable_vector("abc") == stable_vector("abc")
