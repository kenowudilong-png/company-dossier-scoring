import { NextRequest, NextResponse } from "next/server";
import { studioBaseUrl } from "@/lib/services";

export async function POST(request: NextRequest, { params }: { params: { dossierId: string } }) {
  const body = await request.json();
  const response = await fetch(`${studioBaseUrl}/studio/ask`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...body, dossier_id: params.dossierId }) });
  const data = await response.json();
  return NextResponse.json(data, { status: response.status });
}
