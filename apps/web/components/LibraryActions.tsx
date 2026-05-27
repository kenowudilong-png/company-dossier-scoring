"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LibraryActions({ dossierId, fileId }: { dossierId: string; fileId?: string }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  async function rescore() {
    setMessage("正在重新评分…");
    const response = await fetch(`/api/scoring/${dossierId}/run`, { method: "POST" });
    setMessage(response.ok ? "已生成新版本报告" : "重新评分失败");
    router.refresh();
  }
  async function markUntrusted() {
    if (!fileId) return;
    setMessage("正在标记不可信…");
    const response = await fetch(`/api/files/${fileId}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ is_trusted: false }) });
    setMessage(response.ok ? "已标记不可信，请重新评分" : "标记失败");
    router.refresh();
  }
  return <div className="quick-row"><button className="button" onClick={rescore}>重新评分</button>{fileId ? <button onClick={markUntrusted}>标记不可信</button> : null}{message ? <span className="hint">{message}</span> : null}</div>;
}
