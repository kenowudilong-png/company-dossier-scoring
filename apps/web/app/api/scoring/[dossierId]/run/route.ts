import { NextResponse } from "next/server";
import { parserBaseUrl, scoringBaseUrl } from "@/lib/services";

export async function POST(_: Request, { params }: { params: { dossierId: string } }) {
  const parse = await fetch(`${parserBaseUrl}/parse/start`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ dossier_id: params.dossierId }) });
  if (!parse.ok) return NextResponse.json(await parse.json(), { status: parse.status });
  const score = await fetch(`${scoringBaseUrl}/score/run`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ dossier_id: params.dossierId }) });
  const data = await score.json();
  return NextResponse.json(data, { status: score.status });
}
