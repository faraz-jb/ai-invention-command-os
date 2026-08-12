import { randomBytes, scryptSync, timingSafeEqual, createHmac } from "crypto";
import { getDb } from "./db";
import { makeId } from "./id";

const SESSION_COOKIE = "cos_session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  if (candidate.length !== expected.length) return false;
  return timingSafeEqual(candidate, expected);
}

function getSessionSecret(): string {
  const db = getDb();
  const row = db.prepare("SELECT value FROM settings WHERE key = 'session_secret'").get() as
    | { value: string }
    | undefined;
  if (!row) throw new Error("session secret not initialized");
  return row.value;
}

export function adminExists(): boolean {
  if (process.env.AUTH_PASS) return true;
  const db = getDb();
  const row = db.prepare("SELECT id FROM admin LIMIT 1").get();
  return !!row;
}

export function checkPassword(password: string): boolean {
  const db = getDb();
  const admin = db.prepare("SELECT password_hash FROM admin LIMIT 1").get() as
    | { password_hash: string }
    | undefined;
  if (admin) return verifyPassword(password, admin.password_hash);
  if (process.env.AUTH_PASS) return password === process.env.AUTH_PASS;
  return false;
}

export function createAdmin(displayName: string, password: string) {
  const db = getDb();
  db.prepare(
    "INSERT INTO admin (id, display_name, password_hash, created_at) VALUES (?, ?, ?, ?)"
  ).run(makeId("admin"), displayName, hashPassword(password), new Date().toISOString());
}

export function createSessionToken(): string {
  const expires = Date.now() + SESSION_TTL_MS;
  const secret = getSessionSecret();
  const payload = `${expires}`;
  const sig = createHmac("sha256", secret).update(payload).digest("hex");
  return `${payload}.${sig}`;
}

export function verifySessionToken(token: string | undefined | null): boolean {
  if (!token) return false;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return false;
  const expires = Number(payload);
  if (!Number.isFinite(expires) || expires < Date.now()) return false;
  const secret = getSessionSecret();
  const expected = createHmac("sha256", secret).update(payload).digest("hex");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export { SESSION_COOKIE, SESSION_TTL_MS };
