// src/core/openaiClient.js — Chat Completions (via local proxy or custom backend).

import { OPENAI_CONFIG } from "../config/openaiConfig.js";

const LS_BASE = "librarian_openai_base_url";
const LS_MODEL = "librarian_openai_model";
const LS_BROWSER_KEY = "librarian_openai_browser_key";

export function getOpenAiBaseUrl() {
  try {
    const u = window.localStorage.getItem(LS_BASE);
    return (u && u.trim()) || OPENAI_CONFIG.defaultBaseUrl;
  } catch {
    return OPENAI_CONFIG.defaultBaseUrl;
  }
}

export function setOpenAiBaseUrl(url) {
  try {
    if (url && String(url).trim()) window.localStorage.setItem(LS_BASE, String(url).trim());
    else window.localStorage.removeItem(LS_BASE);
  } catch {
    /* ignore */
  }
}

export function getOpenAiModel() {
  try {
    const m = window.localStorage.getItem(LS_MODEL);
    return (m && m.trim()) || OPENAI_CONFIG.defaultModel;
  } catch {
    return OPENAI_CONFIG.defaultModel;
  }
}

export function setOpenAiModel(model) {
  try {
    if (model && String(model).trim()) window.localStorage.setItem(LS_MODEL, String(model).trim());
    else window.localStorage.removeItem(LS_MODEL);
  } catch {
    /* ignore */
  }
}

/** Optional: only for non-proxy backends you control that accept browser keys over HTTPS. */
export function getBrowserApiKey() {
  try {
    return window.localStorage.getItem(LS_BROWSER_KEY) || "";
  } catch {
    return "";
  }
}

export function setBrowserApiKey(key) {
  try {
    if (key && String(key).trim()) window.localStorage.setItem(LS_BROWSER_KEY, String(key).trim());
    else window.localStorage.removeItem(LS_BROWSER_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * @param {{
 *   messages: { role: string; content: string }[];
 *   temperature?: number;
 *   max_tokens?: number;
 *   response_format?: { type: 'json_object' | 'text' };
 * }} opts
 * @returns {Promise<{ ok: true; content: string } | { ok: false; error: string }>}
 */
export async function openaiChat(opts) {
  const base = getOpenAiBaseUrl().replace(/\/$/, "");
  const url = `${base}/chat/completions`;
  const model = getOpenAiModel();

  const body = {
    model,
    messages: opts.messages,
    temperature: opts.temperature ?? 0.35,
    max_tokens: opts.max_tokens ?? 4096
  };
  if (opts.response_format) body.response_format = opts.response_format;

  const headers = { "Content-Type": "application/json" };

  const browserKey = getBrowserApiKey().trim();
  const isLocalhostBase = base.includes("127.0.0.1") || base.includes("localhost");
  const useLocalProxyWithoutBrowserKey =
    OPENAI_CONFIG.proxyAddsApiKey && !browserKey && isLocalhostBase;

  if (browserKey) {
    headers.Authorization = `Bearer ${browserKey}`;
  } else if (useLocalProxyWithoutBrowserKey) {
    /* Proxy at localhost injects OPENAI_API_KEY; browser sends no secret. */
  } else {
    return {
      ok: false,
      error:
        "Configure access: (1) Recommended — run `npm run openai-proxy` with OPENAI_API_KEY set and base URL http://127.0.0.1:8787/v1, or (2) Advanced — paste an API key only if your own HTTPS backend accepts it (OpenAI’s API blocks direct browser calls)."
    };
  }

  let res;
  try {
    res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body)
    });
  } catch (e) {
    return {
      ok: false,
      error: `Network error (${e?.message || e}). Is the proxy running on ${base}?`
    };
  }

  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, error: text.slice(0, 400) || `HTTP ${res.status}` };
  }

  if (!res.ok) {
    const msg = json?.error?.message || json?.message || text.slice(0, 300) || `HTTP ${res.status}`;
    return { ok: false, error: msg };
  }

  const content = json?.choices?.[0]?.message?.content;
  if (typeof content !== "string") {
    return { ok: false, error: "Unexpected response shape (no choices[0].message.content)." };
  }

  return { ok: true, content };
}
