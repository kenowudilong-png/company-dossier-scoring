"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const templates = [
  ["investment_dd", "投资尽调", "商业、财务、市场、团队、产品与风险"],
  ["credit_assessment", "信用评估", "财务健康、偿债、经营稳定与负面信号"],
  ["esg_review", "ESG", "环境、员工、供应链、治理"],
  ["compliance_review", "合规审查", "资质、诉讼、处罚、数据与关联方"],
];
const tiers = [[0.9, "招股书/披露文件"], [0.7, "公司提供"], [0.5, "第三方"]] as const;

export default function NewDossierWizard({ companies }: { companies: any[] }) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [companyId, setCompanyId] = useState(companies[0]?.id ?? "");
  const [companyName, setCompanyName] = useState("");
  const [industry, setIndustry] = useState("");
  const [templateId, setTemplateId] = useState("investment_dd");
  const [files, setFiles] = useState<Array<{ file: File; trust: number; label: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function addFiles(list: FileList | null) {
    if (!list) return;
    setFiles((current) => [...current, ...Array.from(list).map((file) => ({ file, trust: 0.7, label: "公司提供" }))]);
  }

  async function start() {
    setLoading(true); setError("");
    const dossierResponse = await fetch("/api/dossiers", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ company_id: companyId || undefined, company_name: companyName, industry, template_id: templateId, name: `${companyName || companies.find(c => c.id === companyId)?.name || "公司"} ${templates.find(t => t[0] === templateId)?.[1]}` }) });
    const dossierData = await dossierResponse.json();
    if (!dossierResponse.ok) { setError(dossierData.error ?? "创建失败"); setLoading(false); return; }
    for (const item of files) {
      const form = new FormData();
      form.append("dossier_id", dossierData.dossier.id);
      form.append("trust_tier", String(item.trust));
      form.append("trust_label", item.label);
      form.append("file", item.file);
      const upload = await fetch("/api/files/upload", { method: "POST", body: form });
      if (!upload.ok) { setError("文件上传失败"); setLoading(false); return; }
    }
    const score = await fetch(`/api/scoring/${dossierData.dossier.id}/run`, { method: "POST" });
    if (!score.ok) { setError("解析或评分失败"); setLoading(false); return; }
    router.push(`/d/${dossierData.dossier.id}/report`);
  }

  return <div className="wizard">
    <div className="stepper">{[1,2,3,4].map((item) => <button className={item === step ? "active" : ""} onClick={() => item < step && setStep(item)} key={item}>Step {item}</button>)}</div>
    {step === 1 ? <section className="wizard-card"><h1>选公司</h1><select value={companyId} onChange={(e) => setCompanyId(e.target.value)}><option value="">+ 创建新公司</option>{companies.map((company) => <option value={company.id} key={company.id}>{company.name}</option>)}</select>{!companyId ? <><input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="公司名称" /><input value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="行业（可选）" /></> : null}<button className="button" onClick={() => setStep(2)}>下一步</button></section> : null}
    {step === 2 ? <section className="wizard-card"><h1>选模板</h1><div className="template-grid">{templates.map(([id, name, desc]) => <button className={templateId === id ? "template-card active" : "template-card"} onClick={() => setTemplateId(id)} key={id}><strong>{name}</strong><span>{desc}</span></button>)}</div><button className="button" onClick={() => setStep(3)}>下一步</button></section> : null}
    {step === 3 ? <section className="wizard-card"><h1>上传资料</h1><label className="drop-zone"><input type="file" multiple onChange={(e) => addFiles(e.target.files)} />选择 PDF / Word / TXT / Excel</label>{files.map((item, index) => <div className="file-row" key={`${item.file.name}-${index}`}><strong>{item.file.name}</strong><select value={item.trust} onChange={(e) => setFiles(files.map((f, i) => i === index ? { ...f, trust: Number(e.target.value), label: tiers.find(t => t[0] === Number(e.target.value))?.[1] ?? f.label } : f))}>{tiers.map(([tier, label]) => <option value={tier} key={tier}>{label} · {tier}</option>)}</select></div>)}<button className="button" disabled={!files.length} onClick={() => setStep(4)}>下一步</button></section> : null}
    {step === 4 ? <section className="wizard-card"><h1>确认启动</h1><p>模板：{templates.find(t => t[0] === templateId)?.[1]} · 文件：{files.length} 个</p><button className="button" disabled={loading || !files.length} onClick={start}>{loading ? "处理中" : "创建并评分"}</button>{error ? <p className="danger">{error}</p> : null}</section> : null}
  </div>;
}
