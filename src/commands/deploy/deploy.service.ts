import { execSync, spawn } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import type { DeployConfig, DeployResult } from "./deploy.types";

export class DeployService {
  private config: DeployConfig;

  constructor(config: DeployConfig) {
    this.config = config;
  }

  private log(message: string): void {
    console.log(`[${new Date().toISOString()}] ${message}`);
  }

  async copyToServer(): Promise<void> {
    this.log("Copying dist folder to remote server...");

    const { remoteHost, remoteUser, deployPath, localDist, envFile } =
      this.config;

    // Verify local dist exists
    if (!fs.existsSync(localDist)) {
      throw new Error(`Local dist folder not found: ${localDist}`);
    }

    const sshHost = `${remoteUser}@${remoteHost}`;
    const tempPath = `${deployPath}_tmp`;

    try {
      // Create temp directory on remote
      this.log(`Creating temp directory on remote: ${tempPath}`);
      execSync(
        `ssh ${sshHost} "mkdir -p ${tempPath} && rm -rf ${tempPath}/*"`,
        { stdio: "inherit" }
      );

      // Copy dist folder
      this.log(`Copying ${localDist} to ${sshHost}:${tempPath}/`);
      execSync(`scp -r "${localDist}" ${sshHost}:${tempPath}/dist`, {
        stdio: "inherit",
      });

      // Copy .env if specified
      if (envFile && fs.existsSync(envFile)) {
        this.log(`Copying ${envFile} to remote`);
        execSync(`scp "${envFile}" ${sshHost}:${tempPath}/.env`, {
          stdio: "inherit",
        });
      }

      // Copy package.json if exists
      if (fs.existsSync("package.json")) {
        this.log("Copying package.json to remote");
        execSync(`scp package.json ${sshHost}:${tempPath}/`, {
          stdio: "inherit",
        });
      }

      // Move files from temp to deploy path
      this.log(`Moving files from temp to deploy path...`);
      const moveCmd =
        `rm -rf ${deployPath}/dist && ` +
        `mv ${tempPath}/dist ${deployPath}/ && ` +
        `[ -f ${tempPath}/.env ] && mv ${tempPath}/.env ${deployPath}/.env || true && ` +
        `[ -f ${tempPath}/package.json ] && mv ${tempPath}/package.json ${deployPath}/ || true && ` +
        `rm -rf ${tempPath}`;

      execSync(`ssh ${sshHost} "${moveCmd}"`, { stdio: "inherit" });

      this.log("✓ Files copied successfully");
    } catch (error) {
      throw new Error(`Failed to copy files: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async installDependencies(): Promise<void> {
    if (this.config.skipInstall) {
      this.log("Skipping dependency installation");
      return;
    }

    this.log("Installing dependencies on server...");
    const { remoteHost, remoteUser, deployPath } = this.config;
    const sshHost = `${remoteUser}@${remoteHost}`;

    try {
      const cmd = `cd ${deployPath} && bun install --production`;
      execSync(`ssh ${sshHost} "${cmd}"`, { stdio: "inherit" });
      this.log("✓ Dependencies installed");
    } catch (error) {
      this.log("⚠ Dependency installation skipped or failed");
    }
  }

  async restartProcess(): Promise<void> {
    if (this.config.skipRestart) {
      this.log("Skipping process restart");
      return;
    }

    this.log("Restarting application via PM2...");
    const { remoteHost, remoteUser, deployPath, appName, port } = this.config;
    const sshHost = `${remoteUser}@${remoteHost}`;

    try {
      const portOpt = port ? ` --env PORT=${port}` : "";
      const cmd =
        `cd ${deployPath} && ` +
        `(pm2 restart ${appName} --update-env 2>/dev/null || ` +
        `pm2 start dist/index.js --name ${appName}${portOpt} 2>/dev/null) && ` +
        `pm2 save 2>/dev/null || true`;

      execSync(`ssh ${sshHost} "bash -l -c '${cmd}'"`, { stdio: "inherit" });
      this.log("✓ Process restart attempted");
    } catch (error) {
      this.log("⚠ PM2 restart skipped - may need manual setup");
    }
  }

  async deploy(): Promise<DeployResult> {
    const startTime = new Date().toISOString();

    try {
      this.log("Starting deployment...");
      await this.copyToServer();
      await this.installDependencies();
      await this.restartProcess();

      this.log("✅ Deployment completed successfully");

      return {
        success: true,
        message: "Deployment completed successfully",
        timestamp: startTime,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown error";
      this.log(`❌ Deployment failed: ${message}`);

      return {
        success: false,
        message,
        timestamp: startTime,
      };
    }
  }
}

export async function createDeployService(
  config: DeployConfig
): Promise<DeployService> {
  return new DeployService(config);
}
