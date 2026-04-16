#!/usr/bin/env node

import * as fs from "node:fs";
import * as path from "node:path";
import { parse as parseYaml } from "node:path"; // We'll use built-in parsing
import { createDeployService } from "./deploy.service";
import type { DeployConfig } from "./deploy.types";

// Simple YAML parser for our config format
function parseYamlConfig(content: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const lines = content.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    // Parse key: value format
    const match = trimmed.match(/^([^:]+):\s*(.+)$/);
    if (match) {
      const key = match[1].trim();
      let value: unknown = match[2].trim();

      // Parse value types
      if (value === "true") {
        value = true;
      } else if (value === "false") {
        value = false;
      } else if (/^\d+$/.test(value as string)) {
        value = parseInt(value as string, 10);
      } else if ((value as string).startsWith('"') && (value as string).endsWith('"')) {
        value = (value as string).slice(1, -1);
      }

      result[key] = value;
    }
  }

  return result;
}

async function main() {
  const args = process.argv.slice(2);
  const configPath = args[0] || "deploy.config.yml";

  // Resolve path relative to current working directory
  const resolvedPath = path.resolve(process.cwd(), configPath);

  if (!fs.existsSync(resolvedPath)) {
    console.error(`❌ Config file not found: ${configPath}`);
    process.exit(1);
  }

  try {
    const configContent = fs.readFileSync(resolvedPath, "utf-8");
    const configData = parseYamlConfig(configContent);

    // Validate required fields
    const required = [
      "remoteHost",
      "remoteUser",
      "deployPath",
      "appName",
      "localDist",
    ];
    for (const field of required) {
      if (!configData[field]) {
        console.error(`❌ Missing required field in config: ${field}`);
        process.exit(1);
      }
    }

    const config: DeployConfig = {
      remoteHost: configData.remoteHost as string,
      remoteUser: configData.remoteUser as string,
      deployPath: configData.deployPath as string,
      appName: configData.appName as string,
      localDist: configData.localDist as string,
      envFile: (configData.envFile as string) || undefined,
      port: (configData.port as number) || undefined,
      skipInstall: (configData.skipInstall as boolean) || false,
      skipRestart: (configData.skipRestart as boolean) || false,
    };

    const deployer = await createDeployService(config);
    const result = await deployer.deploy();

    process.exit(result.success ? 0 : 1);
  } catch (error) {
    console.error(
      `❌ Error: ${error instanceof Error ? error.message : "Unknown error"}`
    );
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
