import { execFileSync } from 'node:child_process'

export interface ProcessInfo {
  pid: number
  state: string
  command: string
}

export const parseWindowsProcesses = (output: string): ProcessInfo[] => output.split(/\r?\n/).flatMap((line) => {
  const match = line.match(/^"([^"]+)","(\d+)"/)
  return match ? [{ pid: Number(match[2]), state: 'RUNNING', command: match[1] }] : []
})

export const parseUnixProcesses = (output: string): ProcessInfo[] => output.split(/\r?\n/).flatMap((line) => {
  const match = line.match(/^\s*(\d+)\s+(\S+)\s+(.+)$/)
  return match ? [{ pid: Number(match[1]), state: match[2], command: match[3] }] : []
})

export const listProcesses = (): ProcessInfo[] => {
  if (process.platform === 'win32') return parseWindowsProcesses(execFileSync('tasklist', ['/FO', 'CSV', '/NH'], { encoding: 'utf8' }))
  return parseUnixProcesses(execFileSync('ps', ['-eo', 'pid=,state=,comm='], { encoding: 'utf8' }))
}

export const formatTable = (processes: ProcessInfo[]): string => {
  const pidWidth = Math.max(3, ...processes.map(({ pid }) => String(pid).length))
  const stateWidth = Math.max(5, ...processes.map(({ state }) => state.length))
  const header = `${'PID'.padEnd(pidWidth)}  ${'STATE'.padEnd(stateWidth)}  COMMAND`
  return [header, ...processes.map(({ pid, state, command }) => `${String(pid).padEnd(pidWidth)}  ${state.padEnd(stateWidth)}  ${command}`)].join('\n')
}
