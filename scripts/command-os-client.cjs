#!/usr/bin/env node
"use strict";

// Reference connect-back poller for a client box.
//
// This script is a TEMPLATE — copy it onto the client's box and adapt the
// command -> shell-command mapping below to that box's real services.
// It never receives SSH access or credentials from Command OS: it POLLS
// Command OS for pending commands, executes them locally, and reports the
// result back. Command OS never reaches into the box directly.
//
// Env vars:
//   COMMAND_OS_URL  base URL of the Command OS instance (default below)
//   CLIENT_TOKEN    this client's connect-back token (required)
//   WORKDIR         working directory for `redeploy` (default: cwd)
//   FIX_COMMAND     shell command to run for `fix` (default: docker restart <target>)
//   ONCE            if set, run a single poll+execute cycle then exit
//   POLL_INTERVAL_MS  ms between polls when looping (default: 5000)

const { exec } = require("child_process");

const COMMAND_OS_URL = process.env.COMMAND_OS_URL || "https://os.aiinvention.tech";
const CLIENT_TOKEN = process.env.CLIENT_TOKEN;
const WORKDIR = process.env.WORKDIR || process.cwd();
const ONCE = !!process.env.ONCE;
const POLL_INTERVAL_MS = Number(process.env.POLL_INTERVAL_MS || 5000);
const EXEC_TIMEOUT_MS = 120 * 1000;
const MAX_OUTPUT_CHARS = 4000;

if (!CLIENT_TOKEN) {
  console.error("[command-os-client] CLIENT_TOKEN is required");
  process.exit(1);
}

function log(msg) {
  console.log(`[command-os-client] ${msg}`);
}

function truncate(text) {
  if (!text) return "";
  return text.length > MAX_OUTPUT_CHARS ? text.slice(-MAX_OUTPUT_CHARS) : text;
}

function runShell(cmd) {
  return new Promise((resolve) => {
    exec(cmd, { cwd: WORKDIR, timeout: EXEC_TIMEOUT_MS }, (err, stdout, stderr) => {
      if (err) {
        resolve({ ok: false, output: truncate(stderr || err.message) });
      } else {
        resolve({ ok: true, output: truncate(stdout) });
      }
    });
  });
}

// Adapt this mapping to the real services running on this box.
async function executeCommand(command) {
  const { type, target, payload } = command;

  switch (type) {
    case "restart":
      if (!target) return { ok: false, output: "target required" };
      return runShell(`docker restart ${target}`);

    case "redeploy":
      if (!target) return { ok: false, output: "target required" };
      return runShell(`git pull && docker compose up -d --build ${target}`);

    case "fix": {
      const fixCmd = process.env.FIX_COMMAND || (target ? `docker restart ${target}` : "");
      if (!fixCmd) return { ok: false, output: "target or FIX_COMMAND required" };
      return runShell(fixCmd);
    }

    case "healthcheck":
      if (target && /^https?:\/\//.test(target)) {
        return runShell(`curl -sI ${target}`);
      }
      return runShell(`docker ps --format "table {{.Names}}\\t{{.Status}}"`);

    case "custom":
      if (!payload) return { ok: false, output: "payload required" };
      return runShell(payload);

    default:
      return { ok: false, output: `unknown command type: ${type}` };
  }
}

async function reportResult(id, status, result, error) {
  const res = await fetch(`${COMMAND_OS_URL}/api/commands/${id}/result`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_token: CLIENT_TOKEN, status, result, error }),
  });
  if (!res.ok) {
    log(`failed to report result for ${id}: ${res.status}`);
  }
}

async function pollOnce() {
  const res = await fetch(
    `${COMMAND_OS_URL}/api/commands/next?client_token=${encodeURIComponent(CLIENT_TOKEN)}`
  );
  if (!res.ok) {
    log(`poll failed: ${res.status}`);
    return false;
  }
  const { command } = await res.json();
  if (!command) return false;

  log(`received command ${command.id} (${command.type} ${command.target || ""})`.trim());
  await reportResult(command.id, "running");

  const { ok, output } = await executeCommand(command);
  if (ok) {
    log(`command ${command.id} succeeded`);
    await reportResult(command.id, "success", output);
  } else {
    log(`command ${command.id} failed: ${output}`);
    await reportResult(command.id, "failed", null, output);
  }
  return true;
}

async function main() {
  log(`polling ${COMMAND_OS_URL}`);
  if (ONCE) {
    await pollOnce();
    return;
  }
  for (;;) {
    let hadCommand = false;
    try {
      hadCommand = await pollOnce();
    } catch (err) {
      log(`poll error: ${err.message}`);
    }
    await new Promise((resolve) => setTimeout(resolve, hadCommand ? 0 : POLL_INTERVAL_MS));
  }
}

main();
