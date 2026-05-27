"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CompanyCreateForm() {
  const [name, setName] = useState("");
  const [region, setRegion] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const companyName = name.trim();
    if (!companyName) {
      setError("请输入企业名称");
      return;
    }
    setLoading(true);
    setError("");
    const response = await fetch("/api/companies", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: companyName, region: region.trim() || null }),
    });
    const data = await response.json();
    setLoading(false);
    if (!response.ok) {
      setError(data.error ?? "保存失败");
      return;
    }
    setName("");
    setRegion("");
    router.refresh();
  }

  return (
    <form className="create-form" onSubmit={submit} aria-label="新增企业">
      <input className="input" aria-label="企业名称" value={name} onChange={(event) => setName(event.target.value)} placeholder="企业名称" />
      <input className="input" aria-label="地区" value={region} onChange={(event) => setRegion(event.target.value)} placeholder="地区（可选）" />
      <button className="button" disabled={loading}>{loading ? "保存中" : "保存企业"}</button>
      {error ? <p role="alert" className="hint danger">{error}</p> : null}
    </form>
  );
}
