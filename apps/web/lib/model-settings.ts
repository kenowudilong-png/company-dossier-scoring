import { pool } from "@/lib/db";

export type ModelProvider = "deepseek" | "custom";

export const providerDefaults: Record<ModelProvider, { baseUrl: string; modelName: string; label: string; help: string }> = {
  deepseek: {
    baseUrl: "https://api.deepseek.com/v1",
    modelName: "deepseek-chat",
    label: "DeepSeek",
    help: "适合直接填写 DeepSeek API Key，接口兼容 OpenAI Chat Completions。",
  },
  custom: {
    baseUrl: "",
    modelName: "",
    label: "自定义（OpenAI 协议）",
    help: "填写兼容 OpenAI /v1/chat/completions 的 Base URL、模型名和 API Key。",
  },
};

export async function ensureModelSettingsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS model_settings (
      id INT PRIMARY KEY DEFAULT 1,
      provider TEXT NOT NULL DEFAULT 'deepseek',
      base_url TEXT NOT NULL DEFAULT 'https://api.deepseek.com/v1',
      api_key TEXT DEFAULT '',
      model_name TEXT NOT NULL DEFAULT 'deepseek-chat',
      updated_at TIMESTAMPTZ DEFAULT now(),
      CONSTRAINT single_model_settings CHECK (id = 1)
    )
  `);
  await pool.query("ALTER TABLE model_settings DROP CONSTRAINT IF EXISTS model_provider_valid");
  await pool.query("UPDATE model_settings SET provider='deepseek', base_url='https://api.deepseek.com/v1', model_name='deepseek-chat' WHERE provider NOT IN ('deepseek', 'custom')");
  await pool.query("ALTER TABLE model_settings ADD CONSTRAINT model_provider_valid CHECK (provider IN ('deepseek', 'custom'))");
  await pool.query(`
    INSERT INTO model_settings (id, provider, base_url, api_key, model_name)
    VALUES (1, 'deepseek', 'https://api.deepseek.com/v1', '', 'deepseek-chat')
    ON CONFLICT (id) DO NOTHING
  `);
}

export async function getModelSettings() {
  await ensureModelSettingsTable();
  const { rows } = await pool.query("SELECT provider, base_url, CASE WHEN api_key = '' THEN false ELSE true END AS has_key, model_name, updated_at FROM model_settings WHERE id=1");
  return rows[0] ?? { provider: "deepseek", base_url: providerDefaults.deepseek.baseUrl, has_key: false, model_name: providerDefaults.deepseek.modelName };
}
