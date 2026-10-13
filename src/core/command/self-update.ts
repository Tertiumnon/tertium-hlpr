import { execSync } from 'node:child_process'
import os from 'node:os'
import path from 'node:path'

function isVoltaInstall(packagePath: string, voltaHome = process.env.VOLTA_HOME || path.join(os.homedir(), '.volta')): boolean {
  const voltaPackages = path.resolve(voltaHome, 'tools', 'image', 'packages') + path.sep
  return path.resolve(packagePath).startsWith(voltaPackages)
}

export function selfUpdateInstallCommand(packagePath: string, voltaHome?: string): string {
  return isVoltaInstall(packagePath, voltaHome)
    ? 'volta install @tertium/hlpr@latest'
    : 'npm install -g @tertium/hlpr@latest'
}

export function selfFixCommands(packagePath: string, voltaHome?: string): string[] {
  return isVoltaInstall(packagePath, voltaHome)
    ? ['volta uninstall @tertium/hlpr', 'volta install @tertium/hlpr@latest']
    : ['npm install -g --force @tertium/hlpr@latest']
}

export function repairInstallation(packagePath: string): void {
  for (const command of selfFixCommands(packagePath)) execSync(command, { stdio: 'inherit' })
}

export function installedCommandsWork(expectedVersion: string): boolean {
  try {
    if (execSync('hlpr -v', { encoding: 'utf8', stdio: 'pipe' }).trim() !== `hlpr version ${expectedVersion}`) return false
    for (const [command, usage] of [
      ['hlpr app list --help', 'Usage: hlpr app list'],
      ['hlpr self update --help', 'Usage: hlpr self update'],
      ['hlpr self fix --help', 'Usage: hlpr self fix'],
    ]) {
      if (!execSync(command, { encoding: 'utf8', stdio: 'pipe' }).includes(usage)) return false
    }
    return true
  } catch {
    return false
  }
}
