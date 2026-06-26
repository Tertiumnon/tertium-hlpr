#!/usr/bin/env bun
// @bun

// src/commands/process/kill-port/kill-port.ts
import { execSync, spawnSync } from "child_process";
import { platform } from "os";
function getProcessOnWindowsPort(port) {
  try {
    const output = execSync(`netstat -ano | findstr :${port}`, { encoding: "utf-8" });
    const pids = [];
    const lines = output.split(`
`);
    for (const line of lines) {
      const match = line.match(/\s+(\d+)\s*$/);
      if (match) {
        const pid = parseInt(match[1], 10);
        if (pid > 0 && !pids.includes(pid)) {
          pids.push(pid);
        }
      }
    }
    return pids;
  } catch (error) {
    return [];
  }
}
function getProcessOnLinuxPort(port) {
  try {
    const output = execSync(`lsof -i :${port} -n -P`, { encoding: "utf-8" });
    const pids = [];
    const lines = output.split(`
`);
    for (let i = 1;i < lines.length; i++) {
      const parts = lines[i].trim().split(/\s+/);
      if (parts.length > 1) {
        const pid = parseInt(parts[1], 10);
        if (!isNaN(pid) && !pids.includes(pid)) {
          pids.push(pid);
        }
      }
    }
    return pids;
  } catch {
    try {
      const output = execSync(`netstat -tulnp 2>/dev/null | grep :${port}`, { encoding: "utf-8" });
      const pids = [];
      const lines = output.split(`
`);
      for (const line of lines) {
        const match = line.match(/(\d+)\//);
        if (match) {
          const pid = parseInt(match[1], 10);
          if (!pids.includes(pid)) {
            pids.push(pid);
          }
        }
      }
      return pids;
    } catch {
      return [];
    }
  }
}
function killProcessOnWindows(pid, force, verbose) {
  try {
    const args = force ? ["/PID", pid.toString(), "/F"] : ["/PID", pid.toString()];
    const result = spawnSync("taskkill", args, { encoding: "utf-8" });
    if (result.status === 0) {
      if (verbose)
        console.log(`\u2713 Killed process ${pid}`);
      return true;
    } else {
      if (verbose)
        console.error(`\u2717 Failed to kill process ${pid}: ${result.stderr}`);
      return false;
    }
  } catch (error) {
    if (verbose)
      console.error(`\u2717 Error killing process ${pid}: ${error}`);
    return false;
  }
}
function killProcessOnLinux(pid, force, verbose) {
  try {
    const signal = force ? "SIGKILL" : "SIGTERM";
    const result = spawnSync("kill", [`-${signal}`, pid.toString()], { encoding: "utf-8" });
    if (result.status === 0) {
      if (verbose)
        console.log(`\u2713 Killed process ${pid} with ${signal}`);
      return true;
    } else {
      if (verbose)
        console.error(`\u2717 Failed to kill process ${pid}: ${result.stderr}`);
      return false;
    }
  } catch (error) {
    if (verbose)
      console.error(`\u2717 Error killing process ${pid}: ${error}`);
    return false;
  }
}
async function killPort(port, options = {}) {
  const { force = false, verbose = false } = options;
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid port number: ${port}. Port must be between 1 and 65535.`);
  }
  const os = platform();
  let pids = [];
  if (verbose)
    console.log(`Searching for processes on port ${port} (${os})...`);
  if (os === "win32") {
    pids = getProcessOnWindowsPort(port);
  } else {
    pids = getProcessOnLinuxPort(port);
  }
  if (pids.length === 0) {
    if (verbose)
      console.log(`No processes found on port ${port}`);
    return { killed: [], failed: [] };
  }
  if (verbose)
    console.log(`Found ${pids.length} process(es) on port ${port}: ${pids.join(", ")}`);
  const killed = [];
  const failed = [];
  for (const pid of pids) {
    let success;
    if (os === "win32") {
      success = killProcessOnWindows(pid, force, verbose);
    } else {
      success = killProcessOnLinux(pid, force, verbose);
    }
    if (success) {
      killed.push(pid);
    } else {
      failed.push(pid);
    }
  }
  return { killed, failed };
}
if (import.meta.url.endsWith(process.argv[1]?.replace(/\\/g, "/"))) {
  const args = process.argv.slice(2);
  if (args.includes("--help") || args.includes("-h") || args.length === 0) {
    console.log("Usage: kill-port <port> [options]");
    console.log("Kill process(es) running on a specified port (Windows & Linux support)");
    console.log();
    console.log("Arguments:");
    console.log("  port                  Port number (1-65535)");
    console.log();
    console.log("Options:");
    console.log("  -f, --force           Force kill (SIGKILL on Linux, /F on Windows)");
    console.log("  -v, --verbose         Show verbose output");
    console.log("  -h, --help            Show this help message");
    console.log();
    console.log("Examples:");
    console.log("  hlpr process kill-port 3000");
    console.log("  hlpr process kill-port 8080 --force");
    console.log("  hlpr process kill-port 5432 -v");
    process.exit(0);
  }
  const port = parseInt(args[0], 10);
  const force = args.includes("-f") || args.includes("--force");
  const verbose = args.includes("-v") || args.includes("--verbose");
  killPort(port, { force, verbose }).then((result) => {
    if (result.killed.length > 0) {
      console.log(`Successfully killed ${result.killed.length} process(es) on port ${port}`);
    }
    if (result.failed.length > 0) {
      console.error(`Failed to kill ${result.failed.length} process(es): ${result.failed.join(", ")}`);
      process.exit(1);
    }
    if (result.killed.length === 0 && result.failed.length === 0) {
      console.log(`No processes found on port ${port}`);
    }
    process.exit(0);
  }).catch((error) => {
    console.error("Error:", error.message);
    process.exit(1);
  });
}
var kill_port_default = { killPort };
export {
  killPort,
  kill_port_default as default
};
