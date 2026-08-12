import { DatabaseSync } from "node:sqlite";
import path from "path";
import fs from "fs";
import { randomBytes } from "crypto";
import { seedIfEmpty } from "./seed";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "command-os.db");

export class DbHandle {
  constructor(private raw: DatabaseSync) {}

  exec(sql: string) {
    this.raw.exec(sql);
  }

  prepare(sql: string) {
    return this.raw.prepare(sql);
  }

  transaction<T extends (...args: never[]) => unknown>(fn: T): T {
    return ((...args: Parameters<T>) => {
      this.raw.exec("BEGIN");
      try {
        const result = fn(...args);
        this.raw.exec("COMMIT");
        return result;
      } catch (err) {
        this.raw.exec("ROLLBACK");
        throw err;
      }
    }) as T;
  }
}

declare global {
  // eslint-disable-next-line no-var
  var __commandOsDb: DbHandle | undefined;
}

function initSchema(db: DbHandle) {
  db.exec("PRAGMA journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('internal','client')),
      client_name TEXT,
      domain TEXT,
      status TEXT NOT NULL DEFAULT 'idea',
      phase_index INTEGER NOT NULL DEFAULT 0,
      priority TEXT NOT NULL DEFAULT 'medium',
      revenue_potential TEXT,
      last_update TEXT NOT NULL,
      next_action TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS phases (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      notes TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
      agent TEXT NOT NULL DEFAULT 'none',
      status TEXT NOT NULL DEFAULT 'todo',
      priority TEXT NOT NULL DEFAULT 'medium',
      due_date TEXT,
      notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS agents (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'offline',
      last_seen TEXT NOT NULL,
      current_task TEXT,
      sessions_today INTEGER NOT NULL DEFAULT 0,
      token_usage_month INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS sites (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      url TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'up',
      last_check TEXT,
      http_code INTEGER,
      notes TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS revenue (
      id TEXT PRIMARY KEY,
      source TEXT NOT NULL,
      amount REAL NOT NULL DEFAULT 0,
      currency TEXT NOT NULL DEFAULT 'USD',
      date TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS admin (
      id TEXT PRIMARY KEY,
      display_name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS cron_jobs (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      schedule TEXT NOT NULL,
      agent TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'never',
      last_run TEXT,
      last_message TEXT,
      next_run TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
      task_id TEXT,
      started_at TEXT NOT NULL,
      ended_at TEXT,
      tokens_used INTEGER NOT NULL DEFAULT 0,
      summary TEXT,
      created_at TEXT NOT NULL
    );
  `);

  const existing = db.prepare("SELECT value FROM settings WHERE key = 'session_secret'").get();
  if (!existing) {
    const secret = randomBytes(32).toString("hex");
    db.prepare("INSERT INTO settings (key, value) VALUES ('session_secret', ?)").run(secret);
  }
}

function createConnection(): DbHandle {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const db = new DbHandle(new DatabaseSync(DB_PATH));
  initSchema(db);
  seedIfEmpty(db);
  return db;
}

export function getDb(): DbHandle {
  if (!global.__commandOsDb) {
    global.__commandOsDb = createConnection();
  }
  return global.__commandOsDb;
}
