import Link from "next/link";
import ModelSettingsForm from "@/components/ModelSettingsForm";
import { getModelSettings } from "@/lib/model-settings";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const settings = await getModelSettings();
  return (
    <main className="shell narrow">
      <div className="topbar">
        <Link href="/" className="button secondary">返回</Link>
      </div>
      <ModelSettingsForm initial={settings} />
    </main>
  );
}
