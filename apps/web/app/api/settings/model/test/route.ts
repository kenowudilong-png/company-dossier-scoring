import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { ensureModelSettingsTable } from "@/lib/model-settings";

export const dynamic = "force-dynamic";

export async function POST() {
  await ensureModelSettingsTable();
  const { rows } = await pool.query("SELECT base_url, api_key, model_name FROM model_settings WHERE id=1");
  const settings = rows[0];
  if (!settings?.api_key) return NextResponse.json({ error: "请先填写 API Key" }, { status: 400 });
  const endpoint = `${String(settings.base_url).replace(/\/$/, "")}/chat/completions`;
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${settings.api_key}` },
      body: JSON.stringify({ model: settings.model_name, messages: [{ role: "user", content: "ping" }], max_tokens: 8, stream: false }),
    });
    if (!response.ok) {
      const text = await response.text();
      return NextResponse.json({ error: `连接失败：${response.status} ${text.slice(0, 160)}` }, { status: 502 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "连接失败" }, { status: 502 });
  }
}
