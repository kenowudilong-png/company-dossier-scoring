import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function GET(_: Request, { params }: { params: { companyId: string } }) {
  const { rows } = await pool.query("SELECT id, name, aliases, region, status, created_at, updated_at FROM companies WHERE id=$1", [params.companyId]);
  if (!rows[0]) return NextResponse.json({ error: "企业不存在" }, { status: 404 });
  return NextResponse.json({ company: rows[0] });
}

export async function PATCH(request: NextRequest, { params }: { params: { companyId: string } }) {
  const body = await request.json();
  const name = body.name === undefined ? null : String(body.name).trim();
  const region = body.region === undefined ? null : (body.region ? String(body.region).trim() : "");
  const status = body.status === "archived" ? "archived" : body.status === "active" ? "active" : null;
  const { rows } = await pool.query(
    `UPDATE companies
     SET name=COALESCE(NULLIF($2, ''), name),
         region=CASE WHEN $3 IS NULL THEN region ELSE NULLIF($3, '') END,
         status=COALESCE($4, status),
         updated_at=now()
     WHERE id=$1
     RETURNING id, name, aliases, region, status, created_at, updated_at`,
    [params.companyId, name, region, status],
  );
  if (!rows[0]) return NextResponse.json({ error: "企业不存在" }, { status: 404 });
  return NextResponse.json({ company: rows[0] });
}

export async function DELETE(_: Request, { params }: { params: { companyId: string } }) {
  const result = await pool.query("DELETE FROM companies WHERE id=$1 RETURNING id", [params.companyId]);
  if (!result.rows[0]) return NextResponse.json({ error: "企业不存在" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
