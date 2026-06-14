/**
 * KV adapter — Upstash Redis in production, local filesystem in development.
 *
 * Production (Vercel):
 *   Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in Vercel env vars.
 *   Get these from your Upstash dashboard → Redis → REST API.
 *
 * Development (local):
 *   Reads/writes JSON files under .kv-store/ in the project root.
 *   No external service needed for local testing.
 *
 * TTL: reports expire after 90 days (7_776_000 seconds).
 */

import fs from "fs";
import path from "path";

const REPORT_TTL_SECONDS = 60 * 60 * 24 * 90; // 90 days

// ── Upstash Redis client (lazy — only instantiated when env vars are set) ────

let _redis: import("@upstash/redis").Redis | null = null;

function getRedis(): import("@upstash/redis").Redis | null {
  if (_redis) return _redis;
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!url || !token) return null;
  // Lazy import so the module doesn't crash when env vars are absent in dev
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Redis } = require("@upstash/redis");
  _redis = new Redis({ url, token });
  return _redis;
}

// ── Filesystem fallback for local dev ────────────────────────────────────────

const KV_DIR = path.join(process.cwd(), ".kv-store");

function fsKey(key: string): string {
  // Sanitise key to a safe filename
  return path.join(KV_DIR, key.replace(/[^a-zA-Z0-9_-]/g, "_") + ".json");
}

function fsGet(key: string): unknown | null {
  const file = fsKey(key);
  if (!fs.existsSync(file)) return null;
  try {
    const raw = fs.readFileSync(file, "utf8");
    const { value, expiresAt } = JSON.parse(raw) as {
      value: unknown;
      expiresAt: number;
    };
    if (expiresAt && Date.now() > expiresAt) {
      fs.unlinkSync(file);
      return null;
    }
    return value;
  } catch {
    return null;
  }
}

function fsSet(key: string, value: unknown, ttlSeconds: number): void {
  if (!fs.existsSync(KV_DIR)) fs.mkdirSync(KV_DIR, { recursive: true });
  const file = fsKey(key);
  fs.writeFileSync(
    file,
    JSON.stringify({ value, expiresAt: Date.now() + ttlSeconds * 1000 }),
    "utf8"
  );
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function kvSet(key: string, value: unknown): Promise<void> {
  const redis = getRedis();
  if (redis) {
    await redis.set(key, JSON.stringify(value), { ex: REPORT_TTL_SECONDS });
  } else {
    fsSet(key, value, REPORT_TTL_SECONDS);
  }
}

export async function kvGet<T>(key: string): Promise<T | null> {
  const redis = getRedis();
  if (redis) {
    const raw = await redis.get<string>(key);
    if (raw == null) return null;
    try {
      return JSON.parse(typeof raw === "string" ? raw : JSON.stringify(raw)) as T;
    } catch {
      return raw as unknown as T;
    }
  }
  return fsGet(key) as T | null;
}

export function kvBackend(): "upstash" | "filesystem" {
  return getRedis() ? "upstash" : "filesystem";
}
