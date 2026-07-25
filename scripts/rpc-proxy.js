#!/usr/bin/env node
/**
 * RPC Proxy / Cache Service — INFRA-206
 *
 * Lightweight HTTP server that proxies JSON-RPC requests to a Soroban RPC
 * endpoint and caches read-only responses to reduce network round-trips
 * during local development and testing.
 *
 * Usage:
 *   node scripts/rpc-proxy.js
 *
 * Optional env vars:
 *   RPC_PROXY_PORT     - listen port (default: 7545)
 *   SOROBAN_RPC_URL    - upstream Soroban RPC URL (default: testnet)
 *   RPC_CACHE_TTL_MS   - cache TTL in milliseconds (default: 30000)
 *   RPC_PROXY_UPSTREAM - alias for SOROBAN_RPC_URL
 *
 * Cached methods (read-only):
 *   - getLedgerEntry
 *   - getTransaction
 *   - getLedgerEntries
 *   - getNetwork
 *   - getLatestLedger
 *   - simulateTransaction (with caveats — see docs)
 *
 * Non-cached methods (always forwarded):
 *   - sendTransaction
 *   - sendTransactionSubmission
 */

"use strict";

const http = require("http");
const https = require("https");

const PORT = parseInt(process.env.RPC_PROXY_PORT || "7545", 10);
const UPSTREAM =
  process.env.SOROBAN_RPC_URL ||
  process.env.RPC_PROXY_UPSTREAM ||
  "https://soroban-testnet.stellar.org";
const CACHE_TTL_MS = parseInt(process.env.RPC_CACHE_TTL_MS || "30000", 10);

// ---------------------------------------------------------------------------
// Simple in-memory cache
// ---------------------------------------------------------------------------

const cache = new Map();
let cacheHits = 0;
let cacheMisses = 0;

function cacheKey(method, params) {
  return `${method}:${JSON.stringify(params)}`;
}

function cacheGet(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.value;
}

function cacheSet(key, value) {
  cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
  // Evict oldest entries if cache grows beyond 500 items
  if (cache.size > 500) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }
}

// ---------------------------------------------------------------------------
// Which JSON-RPC methods are considered read-only and safe to cache
// ---------------------------------------------------------------------------

const CACHEABLE_METHODS = new Set([
  "getLedgerEntry",
  "getTransaction",
  "getLedgerEntries",
  "getNetwork",
  "getLatestLedger",
  "simulateTransaction",
]);

const NONCE_METHODS = new Set(["sendTransaction", "sendTransactionSubmission"]);

// ---------------------------------------------------------------------------
// HTTP helpers
// ---------------------------------------------------------------------------

function upstreamRequest(body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const url = new URL(UPSTREAM);
    const mod = url.protocol === "https:" ? https : http;

    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === "https:" ? 443 : 80),
      path: url.pathname || "/",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(data),
        Accept: "application/json",
      },
    };

    const req = mod.request(options, (res) => {
      let raw = "";
      res.on("data", (chunk) => (raw += chunk));
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(raw) });
        } catch {
          resolve({ status: res.statusCode, body: raw });
        }
      });
    });

    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

// ---------------------------------------------------------------------------
// Request handler
// ---------------------------------------------------------------------------

async function handleRequest(req, res) {
  // CORS headers for local dev
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method !== "POST") {
    res.writeHead(405, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Method not allowed" }));
    return;
  }

  let raw = "";
  req.on("data", (chunk) => (raw += chunk));
  req.on("end", async () => {
    let rpcRequest;
    try {
      rpcRequest = JSON.parse(raw);
    } catch {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Invalid JSON" }));
      return;
    }

    const { method, params, id } = rpcRequest;

    // Health endpoint
    if (req.url === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          status: "ok",
          upstream: UPSTREAM,
          cacheSize: cache.size,
          cacheHits,
          cacheMisses,
          uptimeSeconds: Math.floor(process.uptime()),
        }),
      );
      return;
    }

    if (!method) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Missing method" }));
      return;
    }

    // Nonce-based methods should never be cached
    if (NONCE_METHODS.has(method)) {
      const upstream = await upstreamRequest(rpcRequest);
      res.writeHead(upstream.status, { "Content-Type": "application/json" });
      res.end(JSON.stringify(upstream.body));
      return;
    }

    // Cache lookup for read-only methods
    if (CACHEABLE_METHODS.has(method)) {
      const key = cacheKey(method, params);
      const cached = cacheGet(key);
      if (cached) {
        cacheHits++;
        res.writeHead(200, { "Content-Type": "application/json", "X-Cache": "HIT" });
        res.end(JSON.stringify(cached));
        return;
      }
      cacheMisses++;

      const upstream = await upstreamRequest(rpcRequest);
      if (upstream.status === 200) {
        cacheSet(key, upstream.body);
      }
      res.writeHead(upstream.status, { "Content-Type": "application/json", "X-Cache": "MISS" });
      res.end(JSON.stringify(upstream.body));
      return;
    }

    // Unknown method — pass through without caching
    const upstream = await upstreamRequest(rpcRequest);
    res.writeHead(upstream.status, { "Content-Type": "application/json" });
    res.end(JSON.stringify(upstream.body));
  });
}

// ---------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------

const server = http.createServer(handleRequest);

function startServer() {
  server.listen(PORT, () => {
    console.log(`RPC Proxy listening on http://localhost:${PORT}`);
    console.log(`Upstream: ${UPSTREAM}`);
    console.log(`Cache TTL: ${CACHE_TTL_MS}ms`);
    console.log(`Cached methods: ${[...CACHEABLE_METHODS].join(", ")}`);
  });
}

function stopServer() {
  return new Promise((resolve) => server.close(() => resolve()));
}

if (require.main === module) {
  startServer();

  // Graceful shutdown
  process.on("SIGINT", () => {
    console.log("\nShutting down…");
    stopServer().then(() => process.exit(0));
  });
}

module.exports = { cache, cacheKey, CACHEABLE_METHODS, NONCE_METHODS, startServer, stopServer };
