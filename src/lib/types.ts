export const PHASES = [
  "idea",
  "research",
  "design",
  "build",
  "deploy",
  "seo",
  "launch",
  "scale",
  "done",
] as const;

export type ProjectStatus = (typeof PHASES)[number];
export type ProjectType = "internal" | "client";
export type Priority = "low" | "medium" | "high";

export interface Project {
  id: string;
  name: string;
  type: ProjectType;
  client_name: string | null;
  domain: string | null;
  status: ProjectStatus;
  phase_index: number;
  priority: Priority;
  revenue_potential: string | null;
  last_update: string;
  next_action: string;
  created_at: string;
  updated_at: string;
}

export type PhaseStatus = "pending" | "in_progress" | "done" | "blocked";

export interface Phase {
  id: string;
  project_id: string;
  name: string;
  status: PhaseStatus;
  notes: string;
  updated_at: string;
}

export type TaskAgent = "vps" | "laptop" | "faraz" | "none";
export type TaskStatus = "todo" | "in_progress" | "review" | "done";

export interface Task {
  id: string;
  title: string;
  project_id: string | null;
  agent: TaskAgent;
  status: TaskStatus;
  priority: Priority;
  due_date: string | null;
  notes: string;
  created_at: string;
  updated_at: string;
}

export type AgentRole = "vps" | "laptop" | "client";
export type AgentStatus = "online" | "offline" | "busy" | "idle";

export interface AgentRecord {
  id: string;
  name: string;
  role: AgentRole;
  status: AgentStatus;
  last_seen: string;
  current_task: string | null;
  sessions_today: number;
  token_usage_month: number;
}

export type SiteStatus = "up" | "down" | "degraded";

export interface Site {
  id: string;
  name: string;
  url: string;
  status: SiteStatus;
  last_check: string | null;
  http_code: number | null;
  notes: string;
}

export type RevenueSource = "stripe" | "gumroad" | "adsense" | "manual";

export interface Revenue {
  id: string;
  source: RevenueSource;
  amount: number;
  currency: string;
  date: string;
  description: string;
}
