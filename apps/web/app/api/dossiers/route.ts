import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function GET() {
  const { rows } = await pool.query(`SELECT dossiers.*, companies.name AS company_name FROM dossiers JOIN companies ON companies.id=dossiers.company_id ORDER BY dossiers.updated_at DESC LIMIT 120`);
  return NextResponse.json({ dossiers: rows });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const companyId = String(body.company_id ?? "");
  const companyName = String(body.company_name ?? "").trim();
  const industry = body.industry ? String(body.industry).trim() : null;
  const templateId = String(body.template_id ?? "");
  const name = String(body.name ?? "").trim() || "新档案";
  if (!templateId) return NextResponse.json({ error: "请选择评分模板" }, { status: 400 });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    let finalCompanyId = companyId;
    if (!finalCompanyId) {
      if (!companyName) return NextResponse.json({ error: "请选择或创建公司" }, { status: 400 });
      const company = await client.query("INSERT INTO companies (name, industry) VALUES ($1,$2) RETURNING id", [companyName, industry]);
      finalCompanyId = company.rows[0].id;
    }
    const dossier = await client.query("INSERT INTO dossiers (company_id, name, template_id, status) VALUES ($1,$2,$3,'draft') RETURNING *", [finalCompanyId, name, templateId]);
    await client.query("COMMIT");
    return NextResponse.json({ dossier: dossier.rows[0] }, { status: 201 });
  } catch {
    await client.query("ROLLBACK");
    return NextResponse.json({ error: "创建档案失败" }, { status: 500 });
  } finally {
    client.release();
  }
}
