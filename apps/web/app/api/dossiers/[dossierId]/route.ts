import { NextResponse } from "next/server";
import { getDossierBundle } from "@/lib/data";

export async function GET(_: Request, { params }: { params: { dossierId: string } }) {
  const bundle = await getDossierBundle(params.dossierId);
  if (!bundle.dossier) return NextResponse.json({ error: "档案不存在" }, { status: 404 });
  return NextResponse.json(bundle);
}
