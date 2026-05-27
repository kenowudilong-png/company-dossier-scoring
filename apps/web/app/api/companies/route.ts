import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function GET() {
  const { rows } = await pool.query("SELECT id, name, aliases, region, status, created_at, updated_at FROM companies ORDER BY updated_at DESC, created_at DESC LIMIT 80");
  return NextResponse.json({ companies: rows });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const name = String(body.name ?? "").trim();
  const region = body.region ? String(body.region).trim() : null;
  if (!name) return NextResponse.json({ error: "企业名称不能为空" }, { status: 400 });
  const { rows } = await pool.query(
    "INSERT INTO companies (name, region, status) VALUES ($1, $2, 'active') RETURNING id, name, aliases, region, status, created_at, updated_at",
    [name, region],
  );
  return NextResponse.json({ company: rows[0] }, { status: 201 });
}
