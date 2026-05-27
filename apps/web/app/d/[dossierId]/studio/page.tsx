import Link from "next/link";
import AppShell from "@/components/AppShell";
import StudioChat from "@/components/StudioChat";
import { getDossierBundle, getDossiers } from "@/lib/data";

export const dynamic = "force-dynamic";
export default async function StudioPage({ params }: { params: { dossierId: string } }) {
  const [dossiers, bundle] = await Promise.all([getDossiers(), getDossierBundle(params.dossierId)]);
  const gaps = bundle.scorecard?.content?.global_gaps ?? [];
  return <AppShell dossiers={dossiers} activeDossierId={params.dossierId} inspector={<Inspector chunks={bundle.chunks} />}><Tabs id={params.dossierId} active="studio" /><StudioChat dossierId={params.dossierId} initialMessages={bundle.messages} gaps={gaps} /></AppShell>;
}
function Tabs({ id, active }: { id: string; active: string }) { return <div className="top-tabs"><Link href={`/d/${id}/report`}>报告</Link><Link className={active === "studio" ? "active" : ""} href={`/d/${id}/studio`}>Studio</Link><Link href={`/d/${id}/library`}>Library</Link></div>; }
function Inspector({ chunks }: { chunks: any[] }) { return <div><h2>可引用知识块</h2>{chunks.slice(0,8).map((c) => <article className="chunk-preview" key={c.id}><b>{c.source_ref} · p{c.page_number}</b><p>{c.snippet}</p></article>)}</div>; }
