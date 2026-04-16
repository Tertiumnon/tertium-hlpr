/**
 * @description Deployment configuration types
 */

export interface DeployConfig {
  remoteHost: string;
  remoteUser: string;
  deployPath: string;
  appName: string;
  localDist: string;
  envFile?: string;
  port?: number;
  skipInstall?: boolean;
  skipRestart?: boolean;
}

export interface DeployResult {
  success: boolean;
  message: string;
  timestamp: string;
}
