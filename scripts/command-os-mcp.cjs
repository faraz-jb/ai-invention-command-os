#!/usr/bin/env node
"use strict";

const readline = require("readline");
const { DatabaseSync } = require("node:sqlite");
const dbInit = require("./db-init.cjs");
const { makeId } = dbInit;

function getDb() {
  dbInit.ensureDataDir();
  return new DatabaseSync(dbInit.DB_PATH);
}

function initDb() {
  dbInit.ensureDataDir();
  const db = new DatabaseSync(dbInit.DB_PATH);
  try {
    dbInit.initSchema(db);
    dbInit.seedIfEmpty(db);
  } finally {
    db.close();
  }
}

const TASK_AGENTS = ["vps", "laptop", "faraz", "none"];
const TASK_STATUSES = ["todo", "in_progress", "review", "done"];
const AGENT_STATUSES = ["online", "offline", "busy", "idle"];

async function checkUrl(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(url, { signal: controller.signal, redirect: "follow" });
    clearTimeout(timeout);
    if (res.ok) return { status: "up", httpCode: res.status };
    if (res.status >= 500) return { status: "down", httpCode: res.status };
    return { status: "degraded", httpCode: res.status };
  } catch {
    clearTimeout(timeout);
    return { status: "down", httpCode: null };
  }
}

const TOOLS = [
  {
    name: "tasks_list",
    description: "List tasks, optionally filtered by status and/or agent",
    inputSchema: {
      type: "object",
      properties: {
        status: { type: "string", enum: TASK_STATUSES },
        agent: { type: "string", enum: TASK_AGENTS },
      },
    },
    handler(args) {
      const db = getDb();
      try {
        let query = "SELECT id, title, status, priority, agent, project_id, due_date FROM tasks WHERE 1=1";
        const params = [];
        if (args.status && TASK_STATUSES.includes(args.status)) {
          query += " AND status = ?";
          params.push(args.status);
        }
        if (args.agent && TASK_AGENTS.includes(args.agent)) {
          query += " AND agent = ?";
          params.push(args.agent);
        }
        query += " ORDER BY updated_at DESC";
        return db.prepare(query).all(...params);
      } finally {
        db.close();
      }
    },
  },
  {
    name: "tasks_create",
    description: "Create a new task",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string" },
        priority: { type: "string", enum: ["low", "medium", "high"] },
        agent: { type: "string", enum: TASK_AGENTS },
        project_id: { type: "string" },
      },
      required: ["title"],
    },
    handler(args) {
      if (!args.title || !String(args.title).trim()) throw new Error("title is required");
      const db = getDb();
      try {
        const now = new Date().toISOString();
        const task = {
          id: makeId("task"),
          title: String(args.title).trim(),
          project_id: args.project_id ? String(args.project_id) : null,
          agent: TASK_AGENTS.includes(args.agent) ? args.agent : "none",
          status: "todo",
          priority: ["low", "medium", "high"].includes(args.priority) ? args.priority : "medium",
          due_date: null,
          notes: "",
          created_at: now,
          updated_at: now,
        };
        db.prepare(`
          INSERT INTO tasks (id, title, project_id, agent, status, priority, due_date, notes, created_at, updated_at)
          VALUES (@id, @title, @project_id, @agent, @status, @priority, @due_date, @notes, @created_at, @updated_at)
        `).run(task);
        return task;
      } finally {
        db.close();
      }
    },
  },
  {
    name: "tasks_update",
    description: "Update a task's status, assignee (agent), or notes",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string" },
        status: { type: "string", enum: TASK_STATUSES },
        assignee: { type: "string", enum: TASK_AGENTS },
        notes: { type: "string" },
      },
      required: ["id"],
    },
    handler(args) {
      if (!args.id) throw new Error("id is required");
      const db = getDb();
      try {
        const existing = db.prepare("SELECT * FROM tasks WHERE id = ?").get(args.id);
        if (!existing) throw new Error("task not found");
        if (args.status !== undefined && !TASK_STATUSES.includes(args.status)) {
          throw new Error("invalid status");
        }
        if (args.assignee !== undefined && !TASK_AGENTS.includes(args.assignee)) {
          throw new Error("invalid assignee");
        }
        const now = new Date().toISOString();
        const updated = {
          id: args.id,
          title: existing.title,
          agent: args.assignee ?? existing.agent,
          status: args.status ?? existing.status,
          priority: existing.priority,
          due_date: existing.due_date,
          notes: args.notes !== undefined ? String(args.notes) : existing.notes,
          updated_at: now,
        };
        db.prepare(`
          UPDATE tasks SET title=@title, agent=@agent, status=@status, priority=@priority,
            due_date=@due_date, notes=@notes, updated_at=@updated_at
          WHERE id=@id
        `).run(updated);
        return db.prepare("SELECT * FROM tasks WHERE id = ?").get(args.id);
      } finally {
        db.close();
      }
    },
  },
  {
    name: "projects_list",
    description: "List all projects with phase_index and status",
    inputSchema: { type: "object", properties: {} },
    handler() {
      const db = getDb();
      try {
        return db.prepare("SELECT id, name, type, status, phase_index, priority, next_action FROM projects ORDER BY updated_at DESC").all();
      } finally {
        db.close();
      }
    },
  },
  {
    name: "agents_list",
    description: "List agents with status and last_seen",
    inputSchema: { type: "object", properties: {} },
    handler() {
      const db = getDb();
      try {
        return db.prepare("SELECT * FROM agents ORDER BY name ASC").all();
      } finally {
        db.close();
      }
    },
  },
  {
    name: "agents_heartbeat",
    description: "Update an agent's last_seen (and optionally status / current_task)",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string" },
        status: { type: "string", enum: AGENT_STATUSES },
        current_task: { type: "string" },
      },
      required: ["id"],
    },
    handler(args) {
      if (!args.id) throw new Error("id is required");
      const db = getDb();
      try {
        const existing = db.prepare("SELECT * FROM agents WHERE id = ?").get(args.id);
        if (!existing) throw new Error("agent not found");
        if (args.status !== undefined && !AGENT_STATUSES.includes(args.status)) {
          throw new Error("invalid status");
        }
        const now = new Date().toISOString();
        const status = args.status ?? existing.status;
        const currentTask = args.current_task !== undefined ? String(args.current_task) : existing.current_task;
        db.prepare(`
          UPDATE agents SET status=?, last_seen=?, current_task=? WHERE id=?
        `).run(status, now, currentTask, args.id);
        return db.prepare("SELECT * FROM agents WHERE id = ?").get(args.id);
      } finally {
        db.close();
      }
    },
  },
  {
    name: "sites_list",
    description: "List sites with last http_code and status",
    inputSchema: { type: "object", properties: {} },
    handler() {
      const db = getDb();
      try {
        return db.prepare("SELECT * FROM sites ORDER BY name ASC").all();
      } finally {
        db.close();
      }
    },
  },
  {
    name: "sites_check",
    description: "Run a live health check on all sites and persist the results",
    inputSchema: { type: "object", properties: {} },
    async handler() {
      const db = getDb();
      try {
        const sites = db.prepare("SELECT * FROM sites").all();
        const results = await Promise.all(
          sites.map(async (site) => {
            const { status, httpCode } = await checkUrl(site.url);
            return { id: site.id, status, httpCode };
          })
        );
        const now = new Date().toISOString();
        const update = db.prepare("UPDATE sites SET status=?, last_check=?, http_code=? WHERE id=?");
        for (const r of results) {
          update.run(r.status, now, r.httpCode, r.id);
        }
        return db.prepare("SELECT * FROM sites ORDER BY name ASC").all();
      } finally {
        db.close();
      }
    },
  },
  {
    name: "crons_list",
    description: "List cron jobs with status",
    inputSchema: { type: "object", properties: {} },
    handler() {
      const db = getDb();
      try {
        return db.prepare("SELECT * FROM cron_jobs ORDER BY name ASC").all();
      } finally {
        db.close();
      }
    },
  },
  {
    name: "revenue_list",
    description: "List revenue entries",
    inputSchema: { type: "object", properties: {} },
    handler() {
      const db = getDb();
      try {
        return db.prepare("SELECT * FROM revenue ORDER BY date DESC").all();
      } finally {
        db.close();
      }
    },
  },
];

const TOOLS_BY_NAME = new Map(TOOLS.map((t) => [t.name, t]));

function send(obj) {
  process.stdout.write(JSON.stringify(obj) + "\n");
}

function toolsListPayload() {
  return TOOLS.map((t) => ({ name: t.name, description: t.description, inputSchema: t.inputSchema }));
}

async function handleRequest(req) {
  const { id, method, params } = req;

  if (method === "initialize") {
    send({
      jsonrpc: "2.0",
      id,
      result: {
        protocolVersion: "2024-11-05",
        serverInfo: { name: "command-os-mcp", version: "1.0.0" },
        capabilities: { tools: {} },
        tools: toolsListPayload(),
      },
    });
    return;
  }

  if (method === "tools/list") {
    send({ jsonrpc: "2.0", id, result: { tools: toolsListPayload() } });
    return;
  }

  if (method === "tools/call") {
    const name = params && params.name;
    const args = (params && params.arguments) || {};
    const tool = TOOLS_BY_NAME.get(name);
    if (!tool) {
      send({ jsonrpc: "2.0", id, error: { code: -32601, message: `unknown tool: ${name}` } });
      return;
    }
    try {
      process.stderr.write(`[command-os-mcp] tools/call ${name} ${JSON.stringify(args)}\n`);
      const result = await tool.handler(args);
      send({
        jsonrpc: "2.0",
        id,
        result: { content: [{ type: "text", text: JSON.stringify(result) }] },
      });
    } catch (err) {
      process.stderr.write(`[command-os-mcp] error in ${name}: ${err.message}\n`);
      send({ jsonrpc: "2.0", id, error: { code: -32000, message: err.message } });
    }
    return;
  }

  send({ jsonrpc: "2.0", id, error: { code: -32601, message: `unknown method: ${method}` } });
}

initDb();

const rl = readline.createInterface({ input: process.stdin, terminal: false });

rl.on("line", (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;
  let req;
  try {
    req = JSON.parse(trimmed);
  } catch {
    send({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "parse error" } });
    return;
  }
  handleRequest(req).catch((err) => {
    process.stderr.write(`[command-os-mcp] unhandled error: ${err.message}\n`);
    send({ jsonrpc: "2.0", id: req.id ?? null, error: { code: -32000, message: err.message } });
  });
});

process.stderr.write("[command-os-mcp] server ready\n");
