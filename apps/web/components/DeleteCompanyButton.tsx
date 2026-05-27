"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function DeleteCompanyButton({ companyId, companyName }: { companyId: string; companyName: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function remove(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (!window.confirm(`确认删除「${companyName}」？该企业记录会被移除。`)) return;
    setLoading(true);
    const response = await fetch(`/api/companies/${companyId}`, { method: "DELETE" });
    setLoading(false);
    if (!response.ok) {
      window.alert("删除失败");
      return;
    }
    router.refresh();
  }

  return <button className="delete-company" onClick={remove} disabled={loading} title="删除">{loading ? "…" : "删"}</button>;
}
