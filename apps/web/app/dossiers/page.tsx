import Link from "next/link";
import AppShell from "@/components/AppShell";
import { getDashboardStats, getDossiers } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function DossiersPage() {
  const [dossiers, stats] = await Promise.all([getDossiers(), getDashboardStats()]);
  return (
    <AppShell dossiers={dossiers}>
      <div className="top-tabs"><strong>档案总览</strong><Link href="/settings">设置</Link></div>
      <section className="dashboard-grid">
        <div className="score-hero"><p className="eyebrow">BYOD Scoring</p><h1>档案评分工作台</h1><p>上传公司资料，按投资、信用、ESG、合规模板生成带证据评分报告。</p><Link className="button" href="/dossiers/new">新建档案</Link></div>
        <div className="metric-card"><strong>{stats.company_count}</strong><span>公司</span></div>
        <div className="metric-card"><strong>{stats.dossier_count}</strong><span>档案</span></div>
        <div className="metric-card"><strong>{stats.file_count}</strong><span>文件</span></div>
        <div className="metric-card"><strong>{stats.chunk_count}</strong><span>知识块</span></div>
      </section>
      <section className="card-list">
        {dossiers.map((dossier) => <Link className="dossier-card" href={`/d/${dossier.id}/report`} key={dossier.id}><span>{dossier.company_name}</span><h2>{dossier.name}</h2><p>{dossier.template_id} · {dossier.status} · v{dossier.current_version}</p></Link>)}
      </section>
    </AppShell>
  );
}
