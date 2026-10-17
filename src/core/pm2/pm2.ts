import { spawnSync } from 'node:child_process'
import { parseFlags } from '../args.js'
import { type DestinationDeps, destinationFor, sshTargetFromFlags } from '../ssh/destination.js'

// PM2 on a remote host, over ssh. Shared by every `hlpr pm2 <action>` command.

export type Pm2Action = 'restart' | 'stop' | 'start' | 'status'

export interface Pm2Args {
  sshConfig: string
  name?: string
  dir?: string
  config?: string
}

const NAME = /^[A-Za-z0-9._-]+$/

/**
 * Parses the flags of one action: `-ssh-host` and `-ssh-user`, or `-ssm-param` (the host and user it names), always; `-name` for
 * restart, stop and status; `-dir` and `-config` for start (pm2 start <config> from that directory).
 */
export function parsePm2Args(action: Pm2Action, args: string[], usage: string, deps: DestinationDeps = {}): Pm2Args {
  const needsName = action !== 'start';
  const valued = needsName ? ['-ssh-host', '-ssh-user', '-ssm-param', '-name'] : ['-ssh-host', '-ssh-user', '-ssm-param', '-dir', '-config'];
  let values: Record<string, string | true>;
  try {
    values = parseFlags(args, valued);
  } catch (error) {
    throw new Error(`${error instanceof Error ? error.message : error}\n${usage}`);
  }
  if (needsName) {
    const name = values['-name'];
    if (typeof name !== 'string') throw new Error(usage);
    return { sshConfig: destinationFor(sshTargetFromFlags(values), deps), name: validatePm2Name(name) };
  }
  const dir = values['-dir'];
  const config = values['-config'];
  if (typeof dir !== 'string' || typeof config !== 'string') throw new Error(usage);
  return { sshConfig: destinationFor(sshTargetFromFlags(values), deps), dir: validateRemoteDir(dir), config: validateConfigFile(config) };
}

/** Single-quoted shell word for the remote shell. */
export function quote(value: string): string {
  return `'${value.replace(/'/g, "'\\''")}'`
}

export function validatePm2Name(name: string): string {
  if (!NAME.test(name)) throw new Error('Invalid -name: use the PM2 process name (letters, digits, . _ -)')
  return name
}

export function validateRemoteDir(dir: string): string {
  if (!/^\/[A-Za-z0-9_./-]+$/.test(dir)) throw new Error('Invalid -dir: use an absolute path such as /var/www/app')
  return dir
}

export function validateConfigFile(file: string): string {
  if (!/^[A-Za-z0-9_./-]+$/.test(file) || file.startsWith('-')) throw new Error('Invalid -config: use a file name such as pm2.config.cjs')
  return file
}

/** The pm2 command line for one action, run from `dir` when one is given. */
export function pm2Command(action: Pm2Action, name?: string, options: { dir?: string, config?: string } = {}): string {
  const cd = options.dir === undefined ? '' : `cd ${quote(options.dir)} && `;
  switch (action) {
    case 'restart':
      return `${cd}pm2 restart ${quote(name as string)} --update-env`;
    case 'stop':
      return `${cd}pm2 stop ${quote(name as string)}`;
    case 'start':
      return `${cd}pm2 start ${quote(options.config as string)}`;
    case 'status':
      return `${cd}pm2 jlist`;
  }
}

/**
 * Runs the pm2 command with the remote login shell's PATH: `zsh -i` loads ~/.zshrc, where pm2 is usually put on PATH,
 * and a host without zsh falls back to a login sh.
 */
export function remoteShell(command: string): string {
  return `if command -v zsh >/dev/null 2>&1; then zsh -i -c ${quote(command)}; else sh -lc ${quote(command)}; fi`;
}

/** The status PM2 reports for the named process, or "missing". Ignores shell noise before the JSON list. */
export function parsePm2Status(jlistOutput: string, name: string): string {
  const start = jlistOutput.indexOf('[');
  if (start < 0) throw new Error('pm2 jlist printed no process list');
  const list = JSON.parse(jlistOutput.slice(start)) as { name: string; pm2_env?: { status?: string } }[];
  return list.find(item => item.name === name)?.pm2_env?.status ?? 'missing';
}

/** Runs one remote command over ssh and returns its stdout. Throws with ssh's stderr on failure. */
export function sshRun(sshConfig: string, command: string): string {
  const result = spawnSync('ssh', ['-o', 'BatchMode=yes', sshConfig, command], { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'] });
  if (result.error) throw new Error(`Cannot run ssh: ${result.error.message}`);
  if (result.status !== 0) throw new Error(`ssh ${sshConfig} failed (exit ${result.status}): ${result.stderr.trim()}`);
  return result.stdout;
}

/** Runs a pm2 action on the host and returns its output. */
export function runPm2(sshConfig: string, action: Pm2Action, name?: string, options: { dir?: string, config?: string } = {}): string {
  return sshRun(sshConfig, remoteShell(pm2Command(action, name, options)));
}

/** The status of the named process on the host. */
export function pm2Status(sshConfig: string, name: string): string {
  return parsePm2Status(runPm2(sshConfig, 'status'), name);
}
