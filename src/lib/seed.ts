import type { DbHandle } from "./db";
import { makeId } from "./id";
import { PHASES } from "./types";
import type { Priority, ProjectStatus, ProjectType, TaskAgent, TaskStatus } from "./types";

const PHASE_LABELS = ["Idea", "Research", "Design", "Build", "Deploy", "SEO", "Launch", "Scale", "Done"];

interface SeedProject {
  name: string;
  type: ProjectType;
  client_name?: string;
  domain?: string;
  status: ProjectStatus;
  phase_index: number;
  priority: Priority;
  next_action: string;
  revenue_potential?: string;
}

const SEED_PROJECTS: SeedProject[] = [
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
  { name: "VPS Hermes", role: "vps" as const, status: "online" as const, current_task: "Project pipeline build" },
  { name: "Laptop Hermes", role: "laptop" as const, status: "idle" as const, current_task: null },
  {
    name: "Client Receptionist (Waqas)",
    role: "client" as const,
    status: "online" as const,
    current_task: "PRO client support",
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
  { name: "Opsync", url: "https://opsync.tech" },
];

const SEED_TASKS: { title: string; agent: TaskAgent; status: TaskStatus; priority: Priority }[] = [
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

export function seedIfEmpty(db: DbHandle) {
  const { count } = db.prepare("SELECT COUNT(*) as count FROM projects").get() as { count: number };
  if (count > 0) return;

  const now = new Date().toISOString();

  const insertProject = db.prepare(`
    INSERT INTO projects (id, name, type, client_name, domain, status, phase_index, priority, revenue_potential, last_update, next_action, created_at, updated_at)
    VALUES (@id, @name, @type, @client_name, @domain, @status, @phase_index, @priority, @revenue_potential, @last_update, @next_action, @created_at, @updated_at)
  `);
  const insertPhase = db.prepare(`
    INSERT INTO phases (id, project_id, name, status, notes, updated_at)
    VALUES (@id, @project_id, @name, @status, @notes, @updated_at)
  `);

  const seedProjects = db.transaction(() => {
    for (const p of SEED_PROJECTS) {
      const projectId = makeId("proj");
      insertProject.run({
        id: projectId,
        name: p.name,
        type: p.type,
        client_name: p.client_name ?? null,
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
  });
  seedProjects();

  const insertAgent = db.prepare(`
    INSERT INTO agents (id, name, role, status, last_seen, current_task, sessions_today, token_usage_month)
    VALUES (@id, @name, @role, @status, @last_seen, @current_task, @sessions_today, @token_usage_month)
  `);
  const agentIds: Record<string, string> = {};
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
    INSERT INTO sites (id, name, url, status, last_check, http_code, notes)
    VALUES (@id, @name, @url, @status, @last_check, @http_code, @notes)
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

  const insertRevenue = db.prepare(`
    INSERT INTO revenue (id, source, amount, currency, date, description)
    VALUES (@id, @source, @amount, @currency, @date, @description)
  `);
  insertRevenue.run({
    id: makeId("rev"),
    source: "stripe",
    amount: 0,
    currency: "USD",
    date: now,
    description: "Aug 2026 — awaiting first sale",
  });
  insertRevenue.run({
    id: makeId("rev"),
    source: "gumroad",
    amount: 0,
    currency: "USD",
    date: now,
    description: "Aug 2026 — awaiting first sale",
  });
  insertRevenue.run({
    id: makeId("rev"),
    source: "adsense",
    amount: 0,
    currency: "USD",
    date: now,
    description: "Aug 2026 — awaiting first sale",
  });
}

export { PHASES, PHASE_LABELS };
