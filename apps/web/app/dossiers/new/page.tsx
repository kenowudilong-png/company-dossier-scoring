import AppShell from "@/components/AppShell";
import NewDossierWizard from "@/components/NewDossierWizard";
import { getCompanies, getDossiers } from "@/lib/data";

export const dynamic = "force-dynamic";
export default async function NewDossierPage() {
  const [companies, dossiers] = await Promise.all([getCompanies(), getDossiers()]);
  return <AppShell dossiers={dossiers}><div className="top-tabs"><strong>新建档案</strong></div><NewDossierWizard companies={companies} /></AppShell>;
}
