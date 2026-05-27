import assert from "node:assert/strict";

const base = process.env.WEB_BASE_URL ?? "http://localhost:3000";
const stamp = Date.now();

async function json(path, init = {}) {
  const response = await fetch(`${base}${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...(init.headers ?? {}) },
  });
  const data = await response.json().catch(() => ({}));
  assert.ok(response.ok, `${path} failed: ${response.status} ${JSON.stringify(data)}`);
  return data;
}

const dossierResult = await json("/api/dossiers", {
  method: "POST",
  body: JSON.stringify({
    company_name: `Demo 公司 ${stamp}`,
    industry: "企业软件",
    template_id: "investment_dd",
    name: `Demo 投资尽调 ${stamp}`,
  }),
});
const dossierId = dossierResult.dossier.id;

const file = new File([
  `Demo 公司主营企业软件，2025 年营收 1200 万元，利润 180 万元，现金流稳定。核心团队具备 SaaS 产品经验，存在客户集中度风险。`,
], "demo-dossier.txt", { type: "text/plain" });
const form = new FormData();
form.append("dossier_id", dossierId);
form.append("trust_tier", "0.9");
form.append("trust_label", "披露文件");
form.append("file", file);
const uploadResponse = await fetch(`${base}/api/files/upload`, { method: "POST", body: form });
const upload = await uploadResponse.json();
assert.ok(uploadResponse.ok, `upload failed: ${JSON.stringify(upload)}`);

const score = await json(`/api/scoring/${dossierId}/run`, { method: "POST" });
assert.equal(score.version, 1);
assert.ok(score.scorecard.dimensions.length > 0);
assert.ok(score.scorecard.dimensions.some((dimension) => dimension.citations.length > 0));

const studio = await json(`/api/studio/${dossierId}/messages`, {
  method: "POST",
  body: JSON.stringify({ question: "这家公司营收和利润如何？" }),
});
assert.equal(studio.refused, false);
assert.ok(studio.citations.length > 0);

const untrusted = await json(`/api/files/${upload.file.id}`, {
  method: "PATCH",
  body: JSON.stringify({ is_trusted: false }),
});
assert.ok(untrusted.updated_chunks >= 1);

const scoreV2 = await json(`/api/scoring/${dossierId}/run`, { method: "POST" });
assert.equal(scoreV2.version, 2);

console.log(JSON.stringify({ ok: true, dossierId, firstVersion: score.version, secondVersion: scoreV2.version }, null, 2));
