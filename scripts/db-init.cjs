#!/usr/bin/env node
"use strict";

// Shared schema + seed logic for the Command OS SQLite database.
// Used by BOTH src/lib/db.ts (Next.js app) and scripts/command-os-mcp.cjs (standalone MCP server)
// so a fresh clone works for either entry point with zero setup.

const path = require("path");
const fs = require("fs");
const { randomBytes, randomUUID } = require("crypto");

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "command-os.db");

function makeId(prefix) {
  return `${prefix}_${randomUUID().replace(/-/g, "").slice(0, 12)}`;
}

const SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS clients (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    box_host TEXT NOT NULL DEFAULT '',
    plan TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'active',
    contact_email TEXT NOT NULL DEFAULT '',
    notes TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS deliverables (
    id TEXT PRIMARY KEY,
    client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'other',
    url TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'live',
    deployed_at TEXT,
    notes TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('internal','client')),
    client_name TEXT,
    client_id TEXT,
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
    token_usage_month INTEGER NOT NULL DEFAULT 0,
    client_id TEXT
  );

  CREATE TABLE IF NOT EXISTS sites (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'up',
    last_check TEXT,
    http_code INTEGER,
    notes TEXT NOT NULL DEFAULT '',
    client_id TEXT
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
`;

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function ensureColumn(db, table, col, ddl) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all();
  if (!cols.some((c) => c.name === col)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${col} ${ddl}`);
  }
}

function initSchema(db) {
  db.exec("PRAGMA journal_mode = WAL");
  db.exec(SCHEMA_SQL);

  ensureColumn(db, "agents", "client_id", "TEXT");
  ensureColumn(db, "projects", "client_id", "TEXT");
  ensureColumn(db, "sites", "client_id", "TEXT");

  const existing = db.prepare("SELECT value FROM settings WHERE key = 'session_secret'").get();
  if (!existing) {
    const secret = randomBytes(32).toString("hex");
    db.prepare("INSERT INTO settings (key, value) VALUES ('session_secret', ?)").run(secret);
  }
}

const PHASE_LABELS = ["Idea", "Research", "Design", "Build", "Deploy", "SEO", "Launch", "Scale", "Done"];

const SEED_CLIENTS = [
  {
    name: "Waqas Bhai (PRO Office)",
    box_host: "PRO VPS",
    plan: "PRO",
    status: "active",
    contact_email: "",
    notes: "UAE PRO office — receptionist + 16 agents + portal",
  },
  {
    name: "Opsync",
    box_host: "Opsync VPS",
    plan: "Amazon Expert",
    status: "active",
    contact_email: "",
    notes: "Amazon seller operations dashboard + MCP",
  },
];

const SEED_DELIVERABLES = [
  {
    client: "Waqas Bhai (PRO Office)",
    name: "AI Receptionist",
    type: "receptionist",
    status: "live",
    url: "https://professionalbusiness.com",
  },
  { client: "Waqas Bhai (PRO Office)", name: "PRO Client Portal", type: "portal", status: "live", url: "" },
  {
    client: "Waqas Bhai (PRO Office)",
    name: "PRO Playbook System (16 agents)",
    type: "agent",
    status: "live",
    url: "",
  },
  {
    client: "Opsync",
    name: "Opsync Dashboard",
    type: "dashboard",
    status: "live",
    url: "https://opsync.tech",
  },
  { client: "Opsync", name: "Opsync MCP Server", type: "automation", status: "live", url: "" },
];

const SEED_PROJECTS = [
  {
    name: "Command Centre",
    type: "internal",
    domain: "command.aiinvention.tech",
    status: "scale",
    phase_index: 7,
    priority: "high",
    next_action: "Add pipeline board + agent connect",
    revenue_potential: "$500-2000/mo",
  },
  {
    name: "Blog",
    type: "internal",
    domain: "blog.aiinvention.tech",
    status: "seo",
    phase_index: 5,
    priority: "high",
    next_action: "Backlink submissions",
    revenue_potential: "AdSense $50-200/mo",
  },
  {
    name: "Tools Site",
    type: "internal",
    domain: "tools.aiinvention.tech",
    status: "launch",
    phase_index: 6,
    priority: "medium",
    next_action: "GA4 verify + directory submissions",
  },
  {
    name: "Main Website",
    type: "internal",
    domain: "aiinvention.tech",
    status: "scale",
    phase_index: 7,
    priority: "high",
    next_action: "Whop product listings",
  },
  {
    name: "Gumroad Products",
    type: "internal",
    domain: "aiinvention.gumroad.com",
    status: "launch",
    phase_index: 6,
    priority: "high",
    next_action: "Whop migration + email capture fix",
  },
  {
    name: "PRO Office (Waqas)",
    type: "client",
    client_name: "Waqas Bhai",
    client: "Waqas Bhai (PRO Office)",
    domain: "professionalbusiness.com",
    status: "deploy",
    phase_index: 4,
    priority: "high",
    next_action: "Client portal upgrade to Product OS standard",
  },
  {
    name: "Opsync",
    type: "client",
    client_name: "Opsync",
    client: "Opsync",
    domain: "opsync.tech",
    status: "launch",
    phase_index: 6,
    priority: "high",
    next_action: "SP-API OAuth live test",
  },
  {
    name: "News Site",
    type: "internal",
    domain: "news.aiinvention.tech",
    status: "launch",
    phase_index: 6,
    priority: "medium",
    next_action: "Content pipeline + sponsorships",
  },
];

const SEED_AGENTS = [
  { name: "VPS Hermes", role: "vps", status: "online", current_task: "Project pipeline build" },
  { name: "Laptop Hermes", role: "laptop", status: "idle", current_task: null },
  {
    name: "Client Receptionist (Waqas)",
    role: "client",
    status: "online",
    current_task: "PRO client support",
    client: "Waqas Bhai (PRO Office)",
  },
];

const SEED_SITES = [
  { name: "Main Website", url: "https://aiinvention.tech" },
  { name: "Blog", url: "https://blog.aiinvention.tech" },
  { name: "Tools", url: "https://tools.aiinvention.tech" },
  { name: "Command Centre", url: "https://command.aiinvention.tech" },
  { name: "News", url: "https://news.aiinvention.tech" },
  { name: "Admin", url: "https://admin.aiinvention.tech" },
  { name: "SerpBear", url: "https://serp.aiinvention.tech" },
  { name: "Opsync", url: "https://opsync.tech", client: "Opsync" },
];

const SEED_TASKS = [
  { title: "Maria Tang follow-up send", agent: "vps", status: "done", priority: "medium" },
  { title: "Whop migration prep", agent: "laptop", status: "todo", priority: "high" },
  { title: "Backlink directory submissions", agent: "laptop", status: "todo", priority: "medium" },
  { title: "Email capture forms fix", agent: "laptop", status: "todo", priority: "high" },
  { title: "GA4 verify all sites", agent: "vps", status: "in_progress", priority: "medium" },
  { title: "PRO client portal upgrade", agent: "laptop", status: "todo", priority: "medium" },
];

const SEED_CRONS = [
  { name: "Daily briefing", schedule: "0 9 * * *", agent: "vps" },
  { name: "Property inspection reminder", schedule: "45 9 * * *", agent: "vps" },
  { name: "Supabase health check", schedule: "*/30 * * * *", agent: "vps" },
  { name: "LinkedIn poster", schedule: "0 10 * * 1-5", agent: "laptop" },
];

function seedIfEmpty(db) {
  const { count } = db.prepare("SELECT COUNT(*) as count FROM projects").get();
  if (count > 0) return;

  const now = new Date().toISOString();

  const insertClient = db.prepare(`
    INSERT INTO clients (id, name, box_host, plan, status, contact_email, notes, created_at, updated_at)
    VALUES (@id, @name, @box_host, @plan, @status, @contact_email, @notes, @created_at, @updated_at)
  `);
  const clientIds = {};
  for (const c of SEED_CLIENTS) {
    const clientId = makeId("client");
    clientIds[c.name] = clientId;
    insertClient.run({
      id: clientId,
      name: c.name,
      box_host: c.box_host,
      plan: c.plan,
      status: c.status,
      contact_email: c.contact_email,
      notes: c.notes,
      created_at: now,
      updated_at: now,
    });
  }

  const insertDeliverable = db.prepare(`
    INSERT INTO deliverables (id, client_id, name, type, url, status, deployed_at, notes, created_at)
    VALUES (@id, @client_id, @name, @type, @url, @status, @deployed_at, @notes, @created_at)
  `);
  for (const d of SEED_DELIVERABLES) {
    const clientId = clientIds[d.client];
    if (!clientId) continue;
    insertDeliverable.run({
      id: makeId("deliv"),
      client_id: clientId,
      name: d.name,
      type: d.type,
      url: d.url,
      status: d.status,
      deployed_at: now,
      notes: "",
      created_at: now,
    });
  }

  const insertProject = db.prepare(`
    INSERT INTO projects (id, name, type, client_name, client_id, domain, status, phase_index, priority, revenue_potential, last_update, next_action, created_at, updated_at)
    VALUES (@id, @name, @type, @client_name, @client_id, @domain, @status, @phase_index, @priority, @revenue_potential, @last_update, @next_action, @created_at, @updated_at)
  `);
  const insertPhase = db.prepare(`
    INSERT INTO phases (id, project_id, name, status, notes, updated_at)
    VALUES (@id, @project_id, @name, @status, @notes, @updated_at)
  `);

  db.exec("BEGIN");
  try {
    for (const p of SEED_PROJECTS) {
      const projectId = makeId("proj");
      insertProject.run({
        id: projectId,
        name: p.name,
        type: p.type,
        client_name: p.client_name ?? null,
        client_id: p.client ? clientIds[p.client] ?? null : null,
        domain: p.domain ?? null,
        status: p.status,
        phase_index: p.phase_index,
        priority: p.priority,
        revenue_potential: p.revenue_potential ?? null,
        last_update: now,
        next_action: p.next_action,
        created_at: now,
        updated_at: now,
      });

      PHASE_LABELS.forEach((label, idx) => {
        const status = idx < p.phase_index ? "done" : idx === p.phase_index ? "in_progress" : "pending";
        insertPhase.run({
          id: makeId("phase"),
          project_id: projectId,
          name: label,
          status,
          notes: "",
          updated_at: now,
        });
      });
    }
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }

  const insertAgent = db.prepare(`
    INSERT INTO agents (id, name, role, status, last_seen, current_task, sessions_today, token_usage_month, client_id)
    VALUES (@id, @name, @role, @status, @last_seen, @current_task, @sessions_today, @token_usage_month, @client_id)
  `);
  const agentIds = {};
  for (const a of SEED_AGENTS) {
    const agentId = makeId("agent");
    agentIds[a.name] = agentId;
    insertAgent.run({
      id: agentId,
      name: a.name,
      role: a.role,
      status: a.status,
      last_seen: now,
      current_task: a.current_task,
      sessions_today: a.name === "VPS Hermes" ? 2 : 0,
      token_usage_month: a.name === "VPS Hermes" ? 48000 : 0,
      client_id: a.client ? clientIds[a.client] ?? null : null,
    });
  }

  const insertCron = db.prepare(`
    INSERT INTO cron_jobs (id, name, schedule, agent, status, last_run, last_message, next_run, created_at)
    VALUES (@id, @name, @schedule, @agent, @status, @last_run, @last_message, @next_run, @created_at)
  `);
  for (const c of SEED_CRONS) {
    insertCron.run({
      id: makeId("cron"),
      name: c.name,
      schedule: c.schedule,
      agent: c.agent,
      status: "ok",
      last_run: now,
      last_message: "completed successfully",
      next_run: null,
      created_at: now,
    });
  }

  const vpsAgentId = agentIds["VPS Hermes"];
  if (vpsAgentId) {
    const insertSession = db.prepare(`
      INSERT INTO sessions (id, agent_id, task_id, started_at, ended_at, tokens_used, summary, created_at)
      VALUES (@id, @agent_id, @task_id, @started_at, @ended_at, @tokens_used, @summary, @created_at)
    `);
    insertSession.run({
      id: makeId("sess"),
      agent_id: vpsAgentId,
      task_id: null,
      started_at: now,
      ended_at: now,
      tokens_used: 18000,
      summary: "Daily briefing + inspection reminder run",
      created_at: now,
    });
    insertSession.run({
      id: makeId("sess"),
      agent_id: vpsAgentId,
      task_id: null,
      started_at: now,
      ended_at: null,
      tokens_used: 30000,
      summary: "Project pipeline build",
      created_at: now,
    });
  }

  const insertSite = db.prepare(`
    INSERT INTO sites (id, name, url, status, last_check, http_code, notes, client_id)
    VALUES (@id, @name, @url, @status, @last_check, @http_code, @notes, @client_id)
  `);
  for (const s of SEED_SITES) {
    insertSite.run({
      id: makeId("site"),
      name: s.name,
      url: s.url,
      status: "up",
      last_check: null,
      http_code: null,
      notes: "",
      client_id: s.client ? clientIds[s.client] ?? null : null,
    });
  }

  const insertTask = db.prepare(`
    INSERT INTO tasks (id, title, project_id, agent, status, priority, due_date, notes, created_at, updated_at)
    VALUES (@id, @title, @project_id, @agent, @status, @priority, @due_date, @notes, @created_at, @updated_at)
  `);
  for (const t of SEED_TASKS) {
    insertTask.run({
      id: makeId("task"),
      title: t.title,
      project_id: null,
      agent: t.agent,
      status: t.status,
      priority: t.priority,
      due_date: null,
      notes: "",
      created_at: now,
      updated_at: now,
    });
  }

  // revenue table intentionally left empty — real data only, no fake/placeholder rows
}

function seedClientsIfEmpty(db) {
  // Seed clients + deliverables independently of the main project seed,
  // and backfill client_id links on existing rows. Idempotent — safe every startup.
  const { count } = db.prepare("SELECT COUNT(*) as count FROM clients").get();
  if (count === 0) {
    const now = new Date().toISOString();
    const insertClient = db.prepare(`
      INSERT INTO clients (id, name, box_host, plan, status, contact_email, notes, created_at, updated_at)
      VALUES (@id, @name, @box_host, @plan, @status, @contact_email, @notes, @created_at, @updated_at)
    `);
    const clientIds = {};
    for (const c of SEED_CLIENTS) {
      const clientId = makeId("client");
      clientIds[c.name] = clientId;
      insertClient.run({ id: clientId, name: c.name, box_host: c.box_host, plan: c.plan, status: c.status, contact_email: c.contact_email, notes: c.notes, created_at: now, updated_at: now });
    }
    const insertDeliverable = db.prepare(`
      INSERT INTO deliverables (id, client_id, name, type, url, status, deployed_at, notes, created_at)
      VALUES (@id, @client_id, @name, @type, @url, @status, @deployed_at, @notes, @created_at)
    `);
    for (const d of SEED_DELIVERABLES) {
      const clientId = clientIds[d.client];
      if (!clientId) continue;
      insertDeliverable.run({ id: makeId("deliv"), client_id: clientId, name: d.name, type: d.type, url: d.url, status: d.status, deployed_at: d.status === "live" ? now : null, notes: "", created_at: now });
    }
  }
  // Backfill client_id links by name (idempotent)
  const rows = db.prepare("SELECT id, name FROM clients").all();
  const byName = {};
  for (const r of rows) byName[r.name] = r.id;
  const link = (table, name, clientName) => {
    const cid = byName[clientName];
    if (!cid) return;
    db.prepare(`UPDATE ${table} SET client_id = ? WHERE name = ? AND client_id IS NULL`).run(cid, name);
  };
  const linkSite = (urlLike, clientName) => {
    const cid = byName[clientName];
    if (!cid) return;
    db.prepare(`UPDATE sites SET client_id = ? WHERE url LIKE ? AND client_id IS NULL`).run(cid, urlLike);
  };
  link("agents", "Client Receptionist (Waqas)", "Waqas Bhai (PRO Office)");
  link("projects", "PRO Office (Waqas)", "Waqas Bhai (PRO Office)");
  link("projects", "Opsync", "Opsync");
  linkSite("%opsync.tech%", "Opsync");
}

module.exports = { ensureDataDir, initSchema, seedIfEmpty, seedClientsIfEmpty, makeId, DB_PATH, DATA_DIR, PHASE_LABELS };
