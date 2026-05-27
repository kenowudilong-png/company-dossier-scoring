import { pool } from "@/lib/db";

export type CompanyRow = { id: string; name: string; aliases?: string[] | null; industry?: string | null; region?: string | null; status: string; };
export type DossierRow = { id: string; company_id: string; company_name: string; name: string; template_id: string; status: string; current_version: number; updated_at?: string; };

export async function getCompanies(): Promise<CompanyRow[]> {
  const { rows } = await pool.query("SELECT id, name, aliases, industry, region, status FROM companies ORDER BY updated_at DESC LIMIT 80");
  return rows;
}

export async function getDossiers(): Promise<DossierRow[]> {
  const { rows } = await pool.query(`
    SELECT dossiers.id, dossiers.company_id, companies.name AS company_name, dossiers.name, dossiers.template_id, dossiers.status, dossiers.current_version, dossiers.updated_at
    FROM dossiers JOIN companies ON companies.id = dossiers.company_id
    ORDER BY dossiers.updated_at DESC
    LIMIT 120
  `);
  return rows;
}

export async function getDossierBundle(dossierId: string) {
  const [dossier, files, chunks, scorecard, messages, jobs] = await Promise.all([
    pool.query(`SELECT dossiers.*, companies.name AS company_name FROM dossiers JOIN companies ON companies.id=dossiers.company_id WHERE dossiers.id=$1`, [dossierId]),
    pool.query(`SELECT files.* FROM files JOIN dossier_files ON dossier_files.file_id=files.id WHERE dossier_files.dossier_id=$1 ORDER BY files.created_at DESC`, [dossierId]),
    pool.query(`SELECT chunks.* FROM chunks JOIN dossier_chunks ON dossier_chunks.chunk_id=chunks.id WHERE dossier_chunks.dossier_id=$1 ORDER BY chunks.trust_tier DESC, chunks.created_at DESC LIMIT 120`, [dossierId]),
    pool.query(`SELECT id, version, content, generated_at FROM scorecards WHERE dossier_id=$1 ORDER BY version DESC LIMIT 1`, [dossierId]),
    pool.query(`SELECT id, role, content, citations, refused, dimension_id, created_at FROM chat_messages WHERE dossier_id=$1 ORDER BY created_at ASC LIMIT 100`, [dossierId]),
    pool.query(`SELECT id, status, progress, error, started_at, finished_at FROM parse_jobs WHERE dossier_id=$1 ORDER BY created_at DESC LIMIT 10`, [dossierId]),
  ]);
  return { dossier: dossier.rows[0], files: files.rows, chunks: chunks.rows, scorecard: scorecard.rows[0], messages: messages.rows, jobs: jobs.rows };
}

export async function getDashboardStats() {
  const { rows } = await pool.query(`
    SELECT
      (SELECT COUNT(*)::int FROM companies) AS company_count,
      (SELECT COUNT(*)::int FROM dossiers) AS dossier_count,
      (SELECT COUNT(*)::int FROM files) AS file_count,
      (SELECT COUNT(*)::int FROM chunks) AS chunk_count
  `);
  return rows[0] ?? { company_count: 0, dossier_count: 0, file_count: 0, chunk_count: 0 };
}
