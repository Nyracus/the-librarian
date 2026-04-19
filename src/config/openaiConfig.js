// src/config/openaiConfig.js — OpenAI defaults (no secrets here).
//
// WHY A PROXY: Browsers cannot call https://api.openai.com directly (CORS). Run:
//   npm run openai-proxy
// with OPENAI_API_KEY set, then in AI Lab set base URL to http://127.0.0.1:8787/v1
//
// Optional overrides (localStorage from AI Lab): librarian_openai_base_url, librarian_openai_model

export const OPENAI_CONFIG = {
  /** Chat Completions base including /v1 */
  defaultBaseUrl: "http://127.0.0.1:8787/v1",
  defaultModel: "gpt-4o-mini",
  /** When using the local proxy, the app does not send an API key from the browser. */
  proxyAddsApiKey: true
};
