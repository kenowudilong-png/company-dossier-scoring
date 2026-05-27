"use client";

import { useMemo, useState } from "react";

type Provider = "deepseek" | "custom";
type Settings = { provider: Provider; base_url: string; has_key: boolean; model_name: string };

const defaults: Record<Provider, { label: string; baseUrl: string; modelName: string; help: string }> = {
  deepseek: {
    label: "DeepSeek",
    baseUrl: "https://api.deepseek.com/v1",
    modelName: "deepseek-chat",
    help: "填写 DeepSeek API Key；Base URL 和模型名使用官方默认值。",
  },
  custom: {
    label: "自定义（OpenAI 协议）",
    baseUrl: "",
    modelName: "",
    help: "适用于任何兼容 OpenAI /v1/chat/completions 的中转站或私有网关。",
  },
};

export default function ModelSettingsForm({ initial }: { initial: Settings }) {
  const [provider, setProvider] = useState<Provider>(initial.provider === "custom" ? "custom" : "deepseek");
  const [baseUrl, setBaseUrl] = useState(initial.base_url);
  const [modelName, setModelName] = useState(initial.model_name);
  const [apiKey, setApiKey] = useState("");
  const [message, setMessage] = useState("");
  const [testing, setTesting] = useState(false);
  const custom = provider === "custom";
  const effective = useMemo(() => ({
    baseUrl: custom ? baseUrl : defaults.deepseek.baseUrl,
    modelName: custom ? modelName : defaults.deepseek.modelName,
  }), [custom, baseUrl, modelName]);

  function chooseProvider(next: Provider) {
    setProvider(next);
    if (next === "deepseek") {
      setBaseUrl(defaults.deepseek.baseUrl);
      setModelName(defaults.deepseek.modelName);
    }
  }

  async function save(event?: React.FormEvent) {
    event?.preventDefault();
    setMessage("保存中…");
    const response = await fetch("/api/settings/model", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ provider, baseUrl: effective.baseUrl, modelName: effective.modelName, apiKey }),
    });
    const data = await response.json();
    setMessage(response.ok ? "已保存" : data.error ?? "保存失败");
    return response.ok;
  }

  async function testConnection() {
    setTesting(true);
    setMessage("正在测试连接…");
    const saved = await save();
    if (!saved) {
      setTesting(false);
      return;
    }
    const response = await fetch("/api/settings/model/test", { method: "POST" });
    const data = await response.json();
    setTesting(false);
    setMessage(response.ok ? "连接成功" : data.error ?? "连接失败");
  }

  return (
    <form className="settings-card" onSubmit={save}>
      <div className="settings-head">
        <div>
          <p className="eyebrow">API Settings</p>
          <h1>模型 API 设置</h1>
          <p>参考 InkOS 的服务配置方式：选择服务商、填写 API Key，可测试连接。密钥只保存在本地数据库，不写入代码。</p>
        </div>
      </div>

      <div className="provider-grid" role="radiogroup" aria-label="模型服务商">
        {(["deepseek", "custom"] as Provider[]).map((item) => (
          <button key={item} type="button" className={provider === item ? "provider-card active" : "provider-card"} onClick={() => chooseProvider(item)}>
            <strong>{defaults[item].label}</strong>
            <span>{defaults[item].help}</span>
          </button>
        ))}
      </div>

      <label className="field">
        <span>API Key</span>
        <input className="input" value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder={initial.has_key ? "已保存，留空不变" : "sk-..."} type="password" autoComplete="off" />
      </label>

      <label className="field">
        <span>Base URL</span>
        <input className="input" value={effective.baseUrl} onChange={(event) => setBaseUrl(event.target.value)} disabled={!custom} placeholder="https://api.example.com/v1" />
      </label>

      <label className="field">
        <span>模型名称</span>
        <input className="input" value={effective.modelName} onChange={(event) => setModelName(event.target.value)} disabled={!custom} placeholder="deepseek-chat / gpt-4o-mini / ..." />
      </label>

      <div className="api-preview">
        <span>协议</span><strong>OpenAI Chat Completions</strong>
        <span>Endpoint</span><code>{effective.baseUrl.replace(/\/$/, "")}/chat/completions</code>
      </div>

      <div className="form-actions">
        <button className="button" type="submit">保存设置</button>
        <button className="button secondary" type="button" onClick={testConnection} disabled={testing}>{testing ? "测试中" : "测试连接"}</button>
        {message ? <span className="hint">{message}</span> : null}
      </div>
    </form>
  );
}
