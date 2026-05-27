import Link from "next/link";
import type { DossierRow } from "@/lib/data";

export default function AppShell({ dossiers, activeDossierId, children, inspector }: { dossiers: DossierRow[]; activeDossierId?: string; children: React.ReactNode; inspector?: React.ReactNode }) {
  const grouped = dossiers.reduce<Record<string, DossierRow[]>>((acc, dossier) => {
    acc[dossier.company_name] = acc[dossier.company_name] ?? [];
    acc[dossier.company_name].push(dossier);
    return acc;
  }, {});
  return (
    <main className="app-shell">
      <aside className="sidebar">
        <Link href="/dossiers/new" className="primary-link">+ 新建档案</Link>
        <div className="workspace-list">
          {Object.entries(grouped).map(([company, items]) => (
            <section key={company}>
              <h3>{company}</h3>
              {items.map((item) => <Link className={`dossier-link${item.id === activeDossierId ? " active" : ""}`} href={`/d/${item.id}/report`} key={item.id}><span>{templateIcon(item.template_id)}</span><strong>{item.name}</strong><small>{item.status}</small></Link>)}
            </section>
          ))}
          {!dossiers.length ? <p className="hint">还没有档案。</p> : null}
        </div>
        <input className="sidebar-search" placeholder="跨档案搜索 chunk…" />
      </aside>
      <section className="center-pane">{children}</section>
      <aside className="inspector">{inspector ?? <p className="hint">点击引用后在这里查看证据详情。</p>}</aside>
    </main>
  );
}

function templateIcon(templateId: string) {
  if (templateId === "credit_assessment") return "💳";
  if (templateId === "esg_review") return "🌿";
  if (templateId === "compliance_review") return "⚖️";
  return "📈";
}
