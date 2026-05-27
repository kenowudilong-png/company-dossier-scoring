import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function PATCH(request: NextRequest, { params }: { params: { fileId: string } }) {
  const body = await request.json();
  const isTrusted = body.is_trusted === false ? false : true;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query("UPDATE chunks SET is_trusted=$2 WHERE file_id=$1 RETURNING id", [params.fileId, isTrusted]);
    await client.query("UPDATE files SET status=$2, updated_at=now() WHERE id=$1", [params.fileId, isTrusted ? "parsed" : "untrusted"]);
    await client.query(
      "UPDATE dossiers SET status='needs_rescore', updated_at=now() WHERE id IN (SELECT dossier_id FROM dossier_files WHERE file_id=$1) AND current_version > 0",
      [params.fileId],
    );
    await client.query("COMMIT");
    return NextResponse.json({ updated_chunks: rows.length, needs_rescore: true });
  } catch {
    await client.query("ROLLBACK");
    return NextResponse.json({ error: "更新文件可信状态失败" }, { status: 500 });
  } finally {
    client.release();
  }
}
