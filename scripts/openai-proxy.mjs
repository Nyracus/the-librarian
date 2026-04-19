#!/usr/bin/env node
/**
 * Minimal CORS-safe proxy for OpenAI Chat Completions.
 *
 * Set OPENAI_API_KEY in the environment (never commit it), then run:
 *   npm run openai-proxy
 * or:
 *   node scripts/openai-proxy.mjs
 *
 * The app defaults to http://127.0.0.1:8787/v1 — point the in-app "API base URL" there.
 * The browser does not send your secret; this process adds Authorization.
 */

import http from "node:http";

const PORT = Number(process.env.OPENAI_PROXY_PORT || 8787);
const OPENAI_KEY = process.env.OPENAI_API_KEY || "";

if (!OPENAI_KEY) {
  console.error(
    "[openai-proxy] Missing OPENAI_API_KEY. Example (PowerShell):\n" +
      '  $env:OPENAI_API_KEY="sk-..."; npm run openai-proxy'
  );
  process.exit(1);
}

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

const server = http.createServer(async (req, res) => {
  cors(res);

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === "GET" && (req.url === "/" || req.url === "/health")) {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, service: "librarian-openai-proxy" }));
    return;
  }

  if (req.method !== "POST" || !req.url?.startsWith("/v1/")) {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not found. POST /v1/chat/completions only.");
    return;
  }

  let body = "";
  for await (const chunk of req) {
    body += chunk;
  }

  const upstream = "https://api.openai.com" + req.url;
  try {
    const upstreamRes = await fetch(upstream, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_KEY}`
      },
      body
    });

    const text = await upstreamRes.text();
    const ct = upstreamRes.headers.get("content-type") || "application/json";
    res.writeHead(upstreamRes.status, { "Content-Type": ct });
    res.end(text);
  } catch (err) {
    console.error("[openai-proxy]", err);
    res.writeHead(502, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: { message: String(err?.message || err) } }));
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`[openai-proxy] http://127.0.0.1:${PORT}/v1  →  https://api.openai.com/v1`);
});
