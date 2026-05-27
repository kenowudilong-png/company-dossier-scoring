from app.engine.scoring import aggregate, load_template, score_dimension


def test_template_loads():
    template = load_template("investment_dd")
    assert sum(dim["weight"] for dim in template["dimensions"]) == 100


def test_veto_caps_total():
    template = load_template("investment_dd")
    scores = {dim["id"]: 80 for dim in template["dimensions"]}
    scores["risk_factors"] = 10
    result = aggregate(scores, template)
    assert result["total"] == 50
    assert result["vetoed"] is True


def test_dimension_requires_trust():
    dim = {"id": "financial", "name": "财务", "weight": 100, "min_trust_tier": 0.9, "required_evidence": "财报"}
    result = score_dimension(dim, [{"trust_tier": 0.5, "is_trusted": True, "content": "财务", "chunk_id": "c", "source_ref": "f", "snippet": "s", "file_id": "x", "page_number": 1}])
    assert result["score"] == 0
    assert result["gaps"]
