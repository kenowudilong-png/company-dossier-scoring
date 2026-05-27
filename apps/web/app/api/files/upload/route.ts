import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { Client } from "minio";

function minioClient() {
  const endpoint = process.env.MINIO_ENDPOINT ?? "localhost:9000";
  return new Client({ endPoint: endpoint.split(":")[0], port: Number(endpoint.split(":")[1] ?? 9000), useSSL: false, accessKey: process.env.MINIO_ACCESS_KEY ?? "minioadmin", secretKey: process.env.MINIO_SECRET_KEY ?? "minioadmin" });
}

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const dossierId = String(form.get("dossier_id") ?? "");
  const trustTier = Number(form.get("trust_tier") ?? 0.7);
  const trustLabel = String(form.get("trust_label") ?? "公司提供");
  const upload = form.get("file");
  if (!dossierId || !(upload instanceof File)) return NextResponse.json({ error: "缺少档案或文件" }, { status: 400 });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const dossier = await client.query("SELECT company_id FROM dossiers WHERE id=$1", [dossierId]);
    if (!dossier.rows[0]) return NextResponse.json({ error: "档案不存在" }, { status: 404 });
    const fileId = crypto.randomUUID();
    const objectKey = `${dossier.rows[0].company_id}/${fileId}/${upload.name}`;
    const minio = minioClient();
    const bucket = process.env.MINIO_BUCKET ?? "company-intel-files";
    if (!(await minio.bucketExists(bucket))) await minio.makeBucket(bucket);
    const buffer = Buffer.from(await upload.arrayBuffer());
    await minio.putObject(bucket, objectKey, buffer, buffer.length, { "Content-Type": upload.type || "application/octet-stream" });
    const file = await client.query(
      "INSERT INTO files (id, company_id, filename, mime_type, object_key, trust_tier, trust_label) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *",
      [fileId, dossier.rows[0].company_id, upload.name, upload.type || "application/octet-stream", objectKey, trustTier, trustLabel],
    );
    await client.query("INSERT INTO dossier_files (dossier_id, file_id) VALUES ($1,$2) ON CONFLICT DO NOTHING", [dossierId, fileId]);
    await client.query("UPDATE dossiers SET status='uploading', updated_at=now() WHERE id=$1", [dossierId]);
    await client.query("COMMIT");
    return NextResponse.json({ file: file.rows[0] }, { status: 201 });
  } catch {
    await client.query("ROLLBACK");
    return NextResponse.json({ error: "上传失败" }, { status: 500 });
  } finally {
    client.release();
  }
}
