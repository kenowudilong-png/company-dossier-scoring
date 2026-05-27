import Link from "next/link";
import AppShell from "@/components/AppShell";
import LibraryActions from "@/components/LibraryActions";
import { getDossierBundle, getDossiers } from "@/lib/data";

export const dynamic = "force-dynamic";
export default async function LibraryPage({ params }: { params: { dossierId: string } }) {
  const [dossiers, bundle] = await Promise.all([getDossiers(), getDossierBundle(params.dossierId)]);
  return <AppShell dossiers={dossiers} activeDossierId={params.dossierId}><Tabs id={params.dossierId} active="library" /><section className="library-view"><h1>档案资料库</h1><LibraryActions dossierId={params.dossierId} />{bundle.files.map((file: any) => <article className="file-card" key={file.id}><header><h2>{file.filename}</h2><LibraryActions dossierId={params.dossierId} fileId={file.id} /></header><p>{file.trust_label} · {file.trust_tier} · {file.status}</p></article>)}<h2>知识块</h2>{bundle.chunks.map((chunk: any) => <article className="chunk-preview" key={chunk.id}><b>{chunk.chunk_id} · p{chunk.page_number}</b><p>{chunk.snippet}</p></article>)}</section></AppShell>;
}
function Tabs({ id, active }: { id: string; active: string }) { return <div className="top-tabs"><Link href={`/d/${id}/report`}>报告</Link><Link href={`/d/${id}/studio`}>Studio</Link><Link className={active === "library" ? "active" : ""} href={`/d/${id}/library`}>Library</Link></div>; }
