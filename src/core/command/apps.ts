import { spawnSync } from 'node:child_process'

export type App = { manager: string; name: string; id: string }
type Query = { manager: string; command: string; args: string[] }

const lines = (output: string) => output.split(/\r?\n/).map(line => line.trim()).filter(Boolean)

export function parsePackages(manager: string, output: string): App[] {
  if (manager === 'winget') {
    const rows = output.split(/\r?\n/)
    const header = rows.findIndex(row => /\bId\s+Version\b/i.test(row))
    if (header < 0) throw new Error('Could not read winget package columns')
    const idStart = rows[header].search(/\bId\s+Version\b/i)
    const versionStart = rows[header].slice(idStart).search(/\bVersion\b/i) + idStart
    return rows.slice(header + 2).filter(row => row.length > versionStart).map(row => ({
      manager, name: row.slice(0, idStart).trim(), id: row.slice(idStart, versionStart).trim(),
    })).filter(app => app.name && app.id)
  }
  if (manager === 'choco') return lines(output).filter(line => line.includes('|')).map(line => {
    const [id] = line.split('|')
    return { manager, name: id, id }
  })
  if (manager === 'scoop') {
    if (/There aren't any apps installed\./i.test(output)) return []
    const rows = lines(output)
    const header = rows.findIndex(row => /^Name\s+Version\b/i.test(row))
    if (header < 0) throw new Error('Could not read scoop package columns')
    return rows.slice(header + 2).map(row => row.split(/\s{2,}/)[0]).filter(Boolean).map(id => ({ manager, name: id, id }))
  }
  return lines(output).map(line => {
    const id = line.split(/\s+/)[0]
    return { manager, name: id, id }
  })
}

export function packageQueries(platform: NodeJS.Platform): Query[] {
  if (platform === 'win32') return [
    { manager: 'winget', command: 'winget', args: ['list'] },
    { manager: 'choco', command: 'cmd.exe', args: ['/d', '/c', 'choco', 'list', '--limit-output'] },
    { manager: 'scoop', command: 'cmd.exe', args: ['/d', '/c', 'scoop', 'list'] },
  ]
  if (platform === 'darwin') return [
    { manager: 'brew', command: 'brew', args: ['list', '--formula', '--versions'] },
    { manager: 'brew-cask', command: 'brew', args: ['list', '--cask', '--versions'] },
  ]
  if (platform === 'linux') return [
    { manager: 'apt', command: 'dpkg-query', args: ['-W', `-f=\${binary:Package}\n`] },
    { manager: 'dnf', command: 'rpm', args: ['-qa', '--qf', '%{NAME}\n'] },
    { manager: 'pacman', command: 'pacman', args: ['-Qq'] },
    { manager: 'brew', command: 'brew', args: ['list', '--formula', '--versions'] },
  ]
  return []
}

export function installedApps(platform: NodeJS.Platform): App[] {
  const apps: App[] = []
  let available = 0
  for (const query of packageQueries(platform)) {
    if (platform === 'win32' && (query.manager === 'choco' || query.manager === 'scoop') && spawnSync('where.exe', [query.manager], { stdio: 'ignore' }).status !== 0) continue
    if (query.manager === 'dnf' && spawnSync('dnf', ['--version'], { stdio: 'ignore' }).error) continue
    const result = spawnSync(query.command, query.args, { encoding: 'utf8', windowsHide: true })
    if ((result.error as NodeJS.ErrnoException | undefined)?.code === 'ENOENT') continue
    available++
    if (result.error || result.status !== 0) throw new Error(`${query.manager} listing failed: ${result.error?.message || result.stderr.trim() || `exit code ${result.status}`}`)
    apps.push(...parsePackages(query.manager, result.stdout))
  }
  if (!available) throw new Error(`No supported package manager found on ${platform}`)
  return apps
}

export function uninstallCommand(app: App): { command: string; args: string[] } {
  if (app.manager === 'winget') return { command: 'winget', args: ['uninstall', '--id', app.id, '--exact'] }
  if (app.manager === 'choco' || app.manager === 'scoop') {
    if (!/^[\w.-]+$/.test(app.id)) throw new Error(`Invalid ${app.manager} package ID`)
    return { command: 'cmd.exe', args: ['/d', '/c', app.manager, 'uninstall', app.id] }
  }
  if (app.manager === 'brew-cask') return { command: 'brew', args: ['uninstall', '--cask', app.id] }
  if (app.manager === 'brew') return { command: 'brew', args: ['uninstall', '--formula', app.id] }
  if (app.manager === 'dnf') return { command: 'sudo', args: ['dnf', 'remove', app.id] }
  if (app.manager === 'pacman') return { command: 'sudo', args: ['pacman', '-R', app.id] }
  return { command: 'sudo', args: ['apt-get', 'remove', app.id] }
}
