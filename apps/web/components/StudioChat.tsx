"use client";
import { useState } from "react";

export default function StudioChat({ dossierId, initialMessages, gaps }: { dossierId: string; initialMessages: any[]; gaps: string[] }) {
  const [messages, setMessages] = useState(initialMessages);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  async function send(event: React.FormEvent) {
    event.preventDefault();
    const content = question.trim();
    if (!content) return;
    setQuestion(""); setLoading(true);
    setMessages((current) => [...current, { id: `u-${Date.now()}`, role: "user", content }]);
    const response = await fetch(`/api/studio/${dossierId}/messages`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ question: content }) });
    const data = await response.json();
    setLoading(false);
    setMessages((current) => [...current, { id: `a-${Date.now()}`, role: "assistant", content: data.answer ?? data.error, citations: data.citations ?? [], refused: data.refused }]);
  }
  return <section className="studio-view"><div className="quick-row">{gaps.slice(0,4).map((gap) => <button onClick={() => setQuestion(`补什么资料能改善：${gap}`)} key={gap}>{gap}</button>)}<button onClick={() => setQuestion("该公司的主要风险是什么？")}>主要风险</button></div><div className="chat-flow">{messages.map((msg) => <article className={`message ${msg.role} ${msg.refused ? "refused" : ""}`} key={msg.id}><p>{msg.content}</p>{msg.citations?.length ? <div className="cite-row">{msg.citations.map((c: any) => <span key={c.chunk_id}>[[{c.chunk_id}]]</span>)}</div> : null}</article>)}</div><form className="chat-input" onSubmit={send}><select aria-label="锚定维度"><option value="">全部维度</option></select><label><input type="checkbox" /> deep 重思考</label><textarea aria-label="Studio 问题" value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="只基于本档案资料提问…" /><button className="button" disabled={loading}>{loading ? "检索中" : "发送"}</button></form></section>;
}
