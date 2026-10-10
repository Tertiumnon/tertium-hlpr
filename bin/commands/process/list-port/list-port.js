#!/usr/bin/env bun
// @bun

// src/commands/process/list-port/list-port.ts
import { execSync } from "child_process";
import { platform } from "os";
function getProcessesOnWindowsPort(port) {
  try {
    const output = execSync(`netstat -ano | findstr :${port}`, { encoding: "utf-8" });
    const processes = [];
    const lines = output.split(`
`);
    const pids = new Set;
    for (const line of lines) {
      const match = line.match(/\s+(\d+)\s*$/);
      if (match) {
        const pid = parseInt(match[1], 10);
        if (pid > 0 && !pids.has(pid)) {
          pids.add(pid);
          try {
            const taskOutput = execSync(`tasklist /FI "PID eq ${pid}" /NH /FO CSV`, { encoding: "utf-8" }).trim();
            const parts = taskOutput.split('","');
            const command = parts[0].replace(/^"|"$/g, "");
            processes.push({
              pid,
              state: "LISTENING",
              command
            });
          } catch {
            processes.push({
              pid,
              state: "LISTENING"
            });
          }
        }
      }
    }
    return processes;
  } catch (error) {
    return [];
  }
}
function getProcessesOnLinuxPort(port) {
  try {
    const output = execSync(`lsof -i :${port} -n -P`, { encoding: "utf-8" });
    const processes = [];
    const lines = output.split(`
`);
    const pids = new Set;
    for (let i = 1;i < lines.length; i++) {
      const parts = lines[i].trim().split(/\s+/);
      if (parts.length > 2) {
        const command = parts[0];
        const pid = parseInt(parts[1], 10);
        const state = parts[7] || "LISTENING";
        if (!isNaN(pid) && pid > 0 && !pids.has(pid)) {
          pids.add(pid);
          processes.push({
            pid,
            state,
            command
          });
        }
      }
    }
    return processes;
  } catch {
    try {
      const output = execSync(`netstat -tulnp 2>/dev/null | grep :${port}`, { encoding: "utf-8" });
      const processes = [];
      const lines = output.split(`
`);
      const pids = new Set;
      for (const line of lines) {
        const match = line.match(/(\d+)\/(.+)/);
        if (match) {
          const pid = parseInt(match[1], 10);
          const command = match[2];
          if (!pids.has(pid)) {
            pids.add(pid);
            processes.push({
              pid,
              state: "LISTENING",
              command
            });
          }
        }
      }
      return processes;
    } catch {
      return [];
    }
  }
}
function formatTable(processes) {
  if (processes.length === 0) {
    return "No processes found";
  }
  const pidWidth = 10;
  const stateWidth = 12;
  const commandWidth = 50;
  const header = `${"PID".padEnd(pidWidth)} ${"STATE".padEnd(stateWidth)} COMMAND`;
  const separator = "\u2500".repeat(pidWidth + stateWidth + commandWidth + 2);
  const rows = processes.map((p) => {
    const command = p.command || "unknown";
    const truncated = command.length > commandWidth ? command.substring(0, commandWidth - 3) + "..." : command;
    return `${p.pid.toString().padEnd(pidWidth)} ${p.state.padEnd(stateWidth)} ${truncated}`;
  });
  return `${header}
${separator}
${rows.join(`
`)}`;
}
async function listPort(port, options = {}) {
  const { verbose = false } = options;
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid port number: ${port}. Port must be between 1 and 65535.`);
  }
  const os = platform();
  if (verbose)
    console.log(`Searching for processes on port ${port} (${os})...
`);
  let processes = [];
  if (os === "win32") {
    processes = getProcessesOnWindowsPort(port);
  } else {
    processes = getProcessesOnLinuxPort(port);
  }
  return processes;
}
if (import.meta.url.endsWith(process.argv[1]?.replace(/\\/g, "/"))) {
  const args = process.argv.slice(2);
  if (args.includes("--help") || args.includes("-h") || args.length === 0) {
    console.log("Usage: list-port <port> [options]");
    console.log("List process(es) running on a specified port (Windows & Linux support)");
    console.log();
    console.log("Arguments:");
    console.log("  port                  Port number (1-65535)");
    console.log();
    console.log("Options:");
    console.log("  -v, --verbose         Show verbose output");
    console.log("  -h, --help            Show this help message");
    console.log();
    console.log("Examples:");
    console.log("  hlpr process list-port 3000");
    console.log("  hlpr process list-port 8080 --verbose");
    console.log("  hlpr process list-port 5432 -v");
    process.exit(0);
  }
  const port = parseInt(args[0], 10);
  const verbose = args.includes("-v") || args.includes("--verbose");
  listPort(port, { verbose }).then((processes) => {
    console.log(formatTable(processes));
    process.exit(processes.length === 0 ? 1 : 0);
  }).catch((error) => {
    console.error("Error:", error.message);
    process.exit(1);
  });
}
var list_port_default = { listPort };
export {
  list_port_default as default,
  listPort
};
