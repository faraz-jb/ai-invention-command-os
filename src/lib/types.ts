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
  client_id: string | null;
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

export type ClientStatus = "active" | "onboarding" | "paused" | "done";

export interface Client {
  id: string;
  name: string;
  box_host: string;
  plan: string;
  status: ClientStatus;
  contact_email: string;
  notes: string;
  client_token: string;
  created_at: string;
  updated_at: string;
}

export type CommandType = "restart" | "redeploy" | "fix" | "healthcheck" | "custom";
export type CommandStatus = "pending" | "dispatched" | "running" | "success" | "failed" | "timeout";

export interface Command {
  id: string;
  client_id: string;
  type: CommandType;
  target: string;
  payload: string;
  status: CommandStatus;
  result: string | null;
  error: string | null;
  created_at: string;
  dispatched_at: string | null;
  completed_at: string | null;
}

export type DeliverableType =
  | "receptionist"
  | "portal"
  | "website"
  | "dashboard"
  | "automation"
  | "agent"
  | "other";
export type DeliverableStatus = "live" | "building" | "planned";

export interface Deliverable {
  id: string;
  client_id: string;
  name: string;
  type: DeliverableType;
  url: string;
  status: DeliverableStatus;
  deployed_at: string | null;
  notes: string;
  created_at: string;
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
  client_id: string | null;
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
  client_id: string | null;
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

export type CronStatus = "ok" | "failed" | "never";

export interface CronJob {
  id: string;
  name: string;
  schedule: string;
  agent: string;
  status: CronStatus;
  last_run: string | null;
  last_message: string | null;
  next_run: string | null;
  created_at: string;
}

export interface CronSyncErrorEntry {
  name: string;
  error: string;
}

export interface CronsAnalytics {
  summary: { total: number; ok: number; error: number; never_run: number };
  errors: CronSyncErrorEntry[];
}

export interface SeoAuditEntry {
  url: string;
  http_status: number;
  ttfb_ms: number;
  title: boolean;
  meta_description: boolean;
  canonical: boolean;
  json_ld: boolean;
  viewport: boolean;
  adsense_tag: boolean;
  og_image: boolean;
  h1_count: number;
  robots_txt: boolean;
  sitemap: boolean;
  sitemap_urls: number;
}

export interface SeoAuditData {
  updated: string | null;
  audits: Record<string, SeoAuditEntry>;
}

export type PositionTrend = "improving" | "dropping" | "stable";

export interface PositionQuery {
  query: string;
  position: number;
  impressions: number;
  clicks: number;
}

export interface PositionTrendQuery {
  query: string;
  position: number;
  pos_28d: number;
  trend: PositionTrend;
}

export interface PositionTrackerSite {
  top_queries: PositionQuery[];
  top_7d: PositionTrendQuery[];
}

export interface PositionTrackerData {
  updated: string | null;
  sites: Record<string, PositionTrackerSite>;
}

export interface KeywordGapOpportunity {
  query: string;
  position: number;
  impressions: number;
  clicks: number;
}

export interface AutocompleteIdea {
  seed: string;
  suggestion: string;
}

export interface KeywordGapData {
  updated: string | null;
  gsc_opportunities: Record<string, KeywordGapOpportunity[]>;
  autocomplete_ideas: AutocompleteIdea[];
}

export interface SeoToolsData {
  audit: SeoAuditData | null;
  positions: PositionTrackerData | null;
  keywordGap: KeywordGapData | null;
}

export interface Session {
  id: string;
  agent_id: string;
  task_id: string | null;
  started_at: string;
  ended_at: string | null;
  tokens_used: number;
  summary: string | null;
  created_at: string;
}
