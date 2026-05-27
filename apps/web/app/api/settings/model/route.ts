import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { ensureModelSettingsTable, getModelSettings, providerDefaults, type ModelProvider } from "@/lib/model-settings";

export const dynamic = "force-dynamic";

function isProvider(value: string): value is ModelProvider {
  return value === "deepseek" || value === "custom";
}

export async function GET() {
  const settings = await getModelSettings();
  return NextResponse.json({ settings });
}

export async function PUT(request: NextRequest) {
  await ensureModelSettingsTable();
  const body = await request.json();
  const provider = String(body.provider ?? "");
  if (!isProvider(provider)) return NextResponse.json({ error: "服务商无效" }, { status: 400 });
  const defaults = providerDefaults[provider];
  const baseUrl = provider === "custom" ? String(body.baseUrl ?? "").trim().replace(/\/$/, "") : defaults.baseUrl;
  const modelName = provider === "custom" ? String(body.modelName ?? "").trim() : defaults.modelName;
  const apiKey = String(body.apiKey ?? "").trim();
  if (!baseUrl || !modelName) return NextResponse.json({ error: "Base URL 和模型名称不能为空" }, { status: 400 });
  await pool.query(
    "UPDATE model_settings SET provider=$1, base_url=$2, api_key=COALESCE(NULLIF($3, ''), api_key), model_name=$4, updated_at=now() WHERE id=1",
    [provider, baseUrl, apiKey, modelName],
  );
  const settings = await getModelSettings();
  return NextResponse.json({ settings });
}
