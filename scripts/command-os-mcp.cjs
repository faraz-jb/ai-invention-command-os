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
    dbInit.seedClientsIfEmpty(db);
    dbInit.ensureClientTokens(db);
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
  {
    name: "clients_list",
    description: "List all clients with deliverable/agent/project counts",
    inputSchema: { type: "object", properties: {} },
    handler() {
      const db = getDb();
      try {
        return db
          .prepare(
            `SELECT c.*,
              (SELECT COUNT(*) FROM deliverables d WHERE d.client_id = c.id) as deliverables_count,
              (SELECT COUNT(*) FROM agents a WHERE a.client_id = c.id) as agents_count,
              (SELECT COUNT(*) FROM projects p WHERE p.client_id = c.id) as projects_count
            FROM clients c
            ORDER BY c.name ASC`
          )
          .all();
      } finally {
        db.close();
      }
    },
  },
  {
    name: "clients_get",
    description: "Get a client with its deliverables, agents, projects, and sites",
    inputSchema: {
      type: "object",
      properties: { id: { type: "string" } },
      required: ["id"],
    },
    handler(args) {
      if (!args.id) throw new Error("id is required");
      const db = getDb();
      try {
        const client = db.prepare("SELECT * FROM clients WHERE id = ?").get(args.id);
        if (!client) throw new Error("client not found");
        return {
          client,
          deliverables: db
            .prepare("SELECT * FROM deliverables WHERE client_id = ? ORDER BY created_at DESC")
            .all(args.id),
          agents: db.prepare("SELECT * FROM agents WHERE client_id = ? ORDER BY name ASC").all(args.id),
          projects: db
            .prepare("SELECT * FROM projects WHERE client_id = ? ORDER BY updated_at DESC")
            .all(args.id),
          sites: db.prepare("SELECT * FROM sites WHERE client_id = ? ORDER BY name ASC").all(args.id),
        };
      } finally {
        db.close();
      }
    },
  },
  {
    name: "deliverables_list",
    description: "List deliverables, optionally filtered by client_id",
    inputSchema: {
      type: "object",
      properties: { client_id: { type: "string" } },
    },
    handler(args) {
      const db = getDb();
      try {
        if (args.client_id) {
          return db
            .prepare("SELECT * FROM deliverables WHERE client_id = ? ORDER BY created_at DESC")
            .all(args.client_id);
        }
        return db.prepare("SELECT * FROM deliverables ORDER BY created_at DESC").all();
      } finally {
        db.close();
      }
    },
  },
  {
    name: "deliverables_create",
    description: "Create a deliverable for a client",
    inputSchema: {
      type: "object",
      properties: {
        client_id: { type: "string" },
        name: { type: "string" },
        type: {
          type: "string",
          enum: ["receptionist", "portal", "website", "dashboard", "automation", "agent", "other"],
        },
        url: { type: "string" },
        status: { type: "string", enum: ["live", "building", "planned"] },
      },
      required: ["client_id", "name"],
    },
    handler(args) {
      if (!args.client_id) throw new Error("client_id is required");
      if (!args.name || !String(args.name).trim()) throw new Error("name is required");
      const db = getDb();
      try {
        const client = db.prepare("SELECT id FROM clients WHERE id = ?").get(args.client_id);
        if (!client) throw new Error("client not found");
        const now = new Date().toISOString();
        const deliverable = {
          id: makeId("deliv"),
          client_id: args.client_id,
          name: String(args.name).trim(),
          type: args.type || "other",
          url: args.url ? String(args.url) : "",
          status: args.status || "live",
          deployed_at: args.status === "planned" ? null : now,
          notes: "",
          created_at: now,
        };
        db.prepare(`
          INSERT INTO deliverables (id, client_id, name, type, url, status, deployed_at, notes, created_at)
          VALUES (@id, @client_id, @name, @type, @url, @status, @deployed_at, @notes, @created_at)
        `).run(deliverable);
        return deliverable;
      } finally {
        db.close();
      }
    },
  },
  {
    name: "commands_create",
    description: "Enqueue a remote-exec command for a client's box (pull-based connect-back)",
    inputSchema: {
      type: "object",
      properties: {
        client_id: { type: "string" },
        type: { type: "string", enum: ["restart", "redeploy", "fix", "healthcheck", "custom"] },
        target: { type: "string" },
        payload: { type: "string" },
      },
      required: ["client_id", "type"],
    },
    handler(args) {
      if (!args.client_id) throw new Error("client_id is required");
      const types = ["restart", "redeploy", "fix", "healthcheck", "custom"];
      if (!types.includes(args.type)) throw new Error("invalid type");
      const db = getDb();
      try {
        const client = db.prepare("SELECT id FROM clients WHERE id = ?").get(args.client_id);
        if (!client) throw new Error("client not found");
        const now = new Date().toISOString();
        const command = {
          id: makeId("cmd"),
          client_id: args.client_id,
          type: args.type,
          target: args.target ? String(args.target) : "",
          payload: args.payload ? String(args.payload) : "",
          status: "pending",
          result: null,
          error: null,
          created_at: now,
          dispatched_at: null,
          completed_at: null,
        };
        db.prepare(`
          INSERT INTO commands (id, client_id, type, target, payload, status, result, error, created_at, dispatched_at, completed_at)
          VALUES (@id, @client_id, @type, @target, @payload, @status, @result, @error, @created_at, @dispatched_at, @completed_at)
        `).run(command);
        return command;
      } finally {
        db.close();
      }
    },
  },
  {
    name: "commands_list",
    description: "List remote-exec commands, optionally filtered by client_id and/or status",
    inputSchema: {
      type: "object",
      properties: {
        client_id: { type: "string" },
        status: {
          type: "string",
          enum: ["pending", "dispatched", "running", "success", "failed", "timeout"],
        },
      },
    },
    handler(args) {
      const db = getDb();
      try {
        let query = `
          SELECT cmd.*, c.name as client_name
          FROM commands cmd
          JOIN clients c ON c.id = cmd.client_id
          WHERE 1=1
        `;
        const params = [];
        if (args.client_id) {
          query += " AND cmd.client_id = ?";
          params.push(args.client_id);
        }
        if (args.status) {
          query += " AND cmd.status = ?";
          params.push(args.status);
        }
        query += " ORDER BY cmd.created_at DESC LIMIT 100";
        return db.prepare(query).all(...params);
      } finally {
        db.close();
      }
    },
  },
  {
    name: "commands_get",
    description: "Get a single remote-exec command by id",
    inputSchema: {
      type: "object",
      properties: { id: { type: "string" } },
      required: ["id"],
    },
    handler(args) {
      if (!args.id) throw new Error("id is required");
      const db = getDb();
      try {
        const command = db
          .prepare(
            `SELECT cmd.*, c.name as client_name
             FROM commands cmd
             JOIN clients c ON c.id = cmd.client_id
             WHERE cmd.id = ?`
          )
          .get(args.id);
        if (!command) throw new Error("command not found");
        return command;
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
