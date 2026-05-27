"use client";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer } from "recharts";

export default function ScoreReport({ scorecard }: { scorecard: any }) {
  const content = scorecard?.content;
  if (!content) return <div className="empty-card"><h1>暂无评分报告</h1><p>请先上传资料并运行评分。</p></div>;
  const data = content.dimensions.map((dim: any) => ({ name: dim.name, score: dim.score }));
  return <div className="report-view">
    <section className="total-card"><div><span>综合评分</span><strong>{content.overall.total}</strong><p>{content.overall.band} · v{scorecard.version}</p>{content.overall.vetoed ? <em>受 veto 规则限制</em> : null}</div><ResponsiveContainer width="45%" height={220}><RadarChart data={data}><PolarGrid /><PolarAngleAxis dataKey="name" /><Radar dataKey="score" stroke="#1E40AF" fill="#3B82F6" fillOpacity={0.35} /></RadarChart></ResponsiveContainer></section>
    <section className="dimension-list">{content.dimensions.map((dim: any) => <article className="dimension-card" key={dim.id}><header><h2>{dim.name}</h2><strong>{dim.score}</strong></header><p>{dim.rationale}</p><div className="two-col"><div><b>优势</b>{dim.strengths.map((s: string) => <span key={s}>{s}</span>)}</div><div><b>弱点</b>{dim.weaknesses.map((s: string) => <span key={s}>{s}</span>)}</div></div>{dim.gaps.length ? <div className="gap-box">缺少证据：{dim.gaps.join("、")}</div> : null}<footer>{dim.citations.length} 条引用</footer></article>)}</section>
    <section className="summary-card"><h2>综合结论</h2><p>{content.executive_summary}</p><h3>信息缺口</h3>{content.global_gaps.map((gap: string) => <span className="gap-chip" key={gap}>{gap}</span>)}</section>
  </div>;
}
