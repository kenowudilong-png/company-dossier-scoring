import Link from "next/link";
import AppShell from "@/components/AppShell";
import ScoreReport from "@/components/ScoreReport";
import { getDossierBundle, getDossiers } from "@/lib/data";

export const dynamic = "force-dynamic";
export default async function ReportPage({ params }: { params: { dossierId: string } }) {
  const [dossiers, bundle] = await Promise.all([getDossiers(), getDossierBundle(params.dossierId)]);
  return <AppShell dossiers={dossiers} activeDossierId={params.dossierId} inspector={<Inspector chunks={bundle.chunks} jobs={bundle.jobs} />}><Tabs id={params.dossierId} active="report" /><ScoreReport scorecard={bundle.scorecard} /></AppShell>;
}
function Tabs({ id, active }: { id: string; active: string }) { return <div className="top-tabs"><Link className={active === "report" ? "active" : ""} href={`/d/${id}/report`}>报告</Link><Link href={`/d/${id}/studio`}>Studio</Link><Link href={`/d/${id}/library`}>Library</Link></div>; }
function Inspector({ chunks, jobs }: { chunks: any[]; jobs: any[] }) { return <div><h2>证据详情</h2>{chunks.slice(0,5).map((c) => <article className="chunk-preview" key={c.id}><b>{c.source_ref} · p{c.page_number}</b><p>{c.snippet}</p><small>{c.chunk_id} · trust {c.trust_tier}</small></article>)}<h2>任务日志</h2>{jobs.map((job) => <p className="hint" key={job.id}>{job.status} · {job.progress?.message}</p>)}</div>; }
