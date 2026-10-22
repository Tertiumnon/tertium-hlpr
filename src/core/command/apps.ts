import { spawnSync, type SpawnSyncOptionsWithStringEncoding, type SpawnSyncReturns } from 'node:child_process'

export type App = { manager: string; name: string; id: string }
type Query = { manager: string; command: string; args: string[] }
type AppRunner = (command: string, args: string[], options: SpawnSyncOptionsWithStringEncoding) => SpawnSyncReturns<string>

const lines = (output: string) => output.split(/\r?\n/).map(line => line.trim()).filter(Boolean)

// snap prints a table headed by "Name"; output without that header means nothing matched.
function snapRows(manager: string, output: string): App[] {
  const rows = lines(output)
  const header = rows.findIndex(row => /^Name\s/.test(row))
  if (header < 0) return []
  return rows.slice(header + 1).map(row => row.split(/\s+/)[0]).filter(Boolean).map(id => ({ manager, name: id, id }))
}

// zypper prints "| S | Name | Summary | Type |" style tables; separator rows have one cell.
function zypperRows(manager: string, output: string): App[] {
  return output.split(/\r?\n/).flatMap(row => {
    const cells = row.split('|').map(cell => cell.trim())
    return cells.length >= 3 && cells[1] && cells[1] !== 'Name' ? [{ manager, name: cells[1], id: cells[1] }] : []
  })
}

export function parsePackages(manager: string, output: string): App[] {
  if (manager === 'apt') return lines(output).flatMap(line => {
    const [status, id] = line.split('\t')
    return status === 'installed' && id ? [{ manager, name: id, id }] : []
  })
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
  if (manager === 'snap') return snapRows(manager, output)
  if (manager === 'flatpak') return lines(output).filter(line => !/^Application/i.test(line)).map(id => ({ manager, name: id, id }))
  if (manager === 'zypper') return zypperRows(manager, output)
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

export function parseRemoteSearch(manager: string, output: string): App[] {
  if (manager === 'winget') {
    const rows = output.split(/\r?\n/)
    const header = rows.findIndex(row => /\bName\b/i.test(row) && /\bId\b/i.test(row))
    if (header < 0) throw new Error('Could not read winget search columns')
    const matchStart = rows[header].search(/\bMatch\b/i)
    const sourceStart = rows[header].search(/\bSource\b/i)
    const tail = (matchStart < 0 ? rows[header] : rows[header].slice(0, matchStart)).trim().split(/\s+/).length - 1
    return rows.slice(header + 2)
      .map(row => {
        if (matchStart < 0) return row
        // Anchor to Source from the right so wide characters in names do not shift the boundary.
        const source = sourceStart < 0 ? undefined : /\S+\s*$/.exec(row)
        return row.slice(0, source ? source.index - (sourceStart - matchStart) : matchStart)
      })
      .map(row => row.trim().split(/\s+/))
      .filter(tokens => tokens.length > tail)
      .map(tokens => ({ manager, name: tokens.slice(0, -tail).join(' '), id: tokens[tokens.length - tail] }))
  }
  if (manager === 'dnf') return lines(output).filter(id => /^[\w+.-]+$/.test(id)).map(id => ({ manager, name: id, id }))
  if (manager === 'choco') return parsePackages(manager, output)
  if (manager === 'scoop') {
    // Known but unconfigured buckets cannot be installed by package name.
    if (/Results from other known buckets/i.test(output)) return []
    // Colored table after "Results from ..." notes; the first column is the app name.
    const rows = lines(output.replace(new RegExp(`${String.fromCharCode(27)}\\[[\\d;]*m`, 'g'), ''))
    const header = rows.findIndex(row => /^Name\s/i.test(row))
    if (header < 0) return []
    return rows.slice(header + 2).map(row => row.split(/\s+/)[0]).filter(Boolean).map(id => ({ manager, name: id, id }))
  }
  if (manager === 'snap') return snapRows(manager, output)
  if (manager === 'flatpak') return lines(output).flatMap(line => {
    const [id, name] = line.split('\t')
    return /^[\w-]+(\.[\w-]+)+$/.test(id) ? [{ manager, name: name?.trim() || id, id }] : []
  })
  if (manager === 'zypper') return zypperRows(manager, output)
  if (manager === 'pacman') return output.split(/\r?\n/).flatMap(row => {
    // Results start with "repo/name version" at column 0; indented lines are descriptions.
    const match = /^[^\s/]+\/(\S+)\s/.exec(row)
    return match ? [{ manager, name: match[1], id: match[1] }] : []
  })
  if (manager === 'brew' || manager === 'brew-cask') {
    // brew groups results under "==> Formulae" and "==> Casks" headers, several names per line.
    let section = manager
    return lines(output).flatMap(line => {
      if (line.startsWith('==>')) {
        section = /Casks/.test(line) ? 'brew-cask' : 'brew'
        return []
      }
      if (line.startsWith('Error')) return []
      return line.split(/\s+/).filter(token => /^[\w@.+/-]+$/.test(token)).map(id => ({ manager: section, name: id, id }))
    })
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
    { manager: 'apt', command: 'dpkg-query', args: ['-W', `-f=\${db:Status-Status}\t\${binary:Package}\n`] },
    { manager: 'dnf', command: 'rpm', args: ['-qa', '--qf', '%{NAME}\n'] },
    { manager: 'pacman', command: 'pacman', args: ['-Qq'] },
    { manager: 'zypper', command: 'zypper', args: ['search', '--installed-only', '--type', 'package'] },
    { manager: 'snap', command: 'snap', args: ['list'] },
    { manager: 'flatpak', command: 'flatpak', args: ['list', '--app', '--columns=application'] },
    { manager: 'brew', command: 'brew', args: ['list', '--formula', '--versions'] },
  ]
  return []
}

export function remoteSearchQueries(platform: NodeJS.Platform, name: string): Query[] {
  if (platform === 'win32') return [
    { manager: 'winget', command: 'winget', args: ['search', name] },
    { manager: 'choco', command: 'cmd.exe', args: ['/d', '/c', 'choco', 'search', name, '--limit-output'] },
    { manager: 'scoop', command: 'cmd.exe', args: ['/d', '/c', 'scoop', 'search', name] },
  ]
  if (platform === 'darwin') return [
    { manager: 'brew', command: 'brew', args: ['search', '--formula', name] },
    { manager: 'brew-cask', command: 'brew', args: ['search', '--cask', name] },
  ]
  if (platform === 'linux') return [
    { manager: 'apt', command: 'apt-cache', args: ['search', name] },
    { manager: 'dnf', command: 'dnf', args: ['-q', 'repoquery', '--available', '--queryformat', '%{name}', `*${name}*`] },
    { manager: 'pacman', command: 'pacman', args: ['-Ss', name] },
    { manager: 'zypper', command: 'zypper', args: ['search', '--type', 'package', name] },
    { manager: 'snap', command: 'snap', args: ['find', name] },
    { manager: 'flatpak', command: 'flatpak', args: ['search', '--columns=application,name', name] },
    { manager: 'brew', command: 'brew', args: ['search', '--formula', name] },
  ]
  return []
}

export function installedApps(platform: NodeJS.Platform, run: AppRunner = spawnSync): App[] {
  const apps: App[] = []
  let available = 0
  for (const query of packageQueries(platform)) {
    if (platform === 'win32' && (query.manager === 'choco' || query.manager === 'scoop') && run('where.exe', [query.manager], { encoding: 'utf8', stdio: 'ignore' }).status !== 0) continue
    if (query.manager === 'dnf' && run('dnf', ['--version'], { encoding: 'utf8', stdio: 'ignore' }).status !== 0) continue
    const result = run(query.command, query.args, { encoding: 'utf8', windowsHide: true, env: { ...process.env, LC_ALL: 'C' } })
    if ((result.error as NodeJS.ErrnoException | undefined)?.code === 'ENOENT') continue
    available++
    if (!result.error && query.manager === 'zypper' && result.status === 104) continue
    if (result.error || result.status !== 0) throw new Error(`${query.manager} listing failed: ${result.error?.message || result.stderr.trim() || `exit code ${result.status}`}`)
    apps.push(...parsePackages(query.manager, result.stdout))
  }
  if (!available) throw new Error(`No supported package manager found on ${platform}`)
  return apps
}

export function remoteApps(platform: NodeJS.Platform, name: string, run: AppRunner = spawnSync): App[] {
  const apps: App[] = []
  let available = 0
  for (const query of remoteSearchQueries(platform, name)) {
    if (platform === 'win32' && (query.manager === 'choco' || query.manager === 'scoop') && run('where.exe', [query.manager], { encoding: 'utf8', stdio: 'ignore' }).status !== 0) continue
    const result = run(query.command, query.args, { encoding: 'utf8', windowsHide: true, env: { ...process.env, LC_ALL: 'C' } })
    if ((result.error as NodeJS.ErrnoException | undefined)?.code === 'ENOENT') continue
    available++
    // These managers use nonzero statuses for an ordinary empty search.
    if (!result.error && (
      (query.manager === 'zypper' && result.status === 104) ||
      (query.manager === 'pacman' && result.status === 1 && !result.stdout.trim() && !result.stderr.trim()) ||
      (['brew', 'brew-cask'].includes(query.manager) && result.status === 1 && /No formulae or casks found for/.test(result.stderr))
    )) continue
    if (result.error || result.status !== 0) throw new Error(`${query.manager} search failed: ${result.error?.message || result.stderr.trim() || `exit code ${result.status}`}`)
    apps.push(...parseRemoteSearch(query.manager, result.stdout))
  }
  if (!available) throw new Error(`No supported package manager found on ${platform}`)
  return apps
}

// Package managers also match descriptions, so the name is checked again here.
export function matchingApps(apps: App[], name: string): App[] {
  const query = name.toLowerCase()
  return apps.filter(app => app.name.toLowerCase().includes(query))
}

// One menu entry per package and manager, sorted by name.
export function appChoices(apps: App[]): App[] {
  const unique = new Map(apps.map(app => [`${app.manager} ${app.id}`, app]))
  return [...unique.values()].sort((a, b) => a.name.localeCompare(b.name) || a.manager.localeCompare(b.manager))
}

export function appLabel(app: App): string {
  return `${app.name} (${app.id}) [${app.manager}]`
}

export function installCommand(app: App): { command: string; args: string[] } {
  if (!/^[\w@.+/-]+$/.test(app.id) || app.id.startsWith('-')) throw new Error(`Invalid ${app.manager} package ID`)
  if (app.manager === 'winget') return { command: 'winget', args: ['install', '--id', app.id, '--exact'] }
  if (app.manager === 'choco') return { command: 'cmd.exe', args: ['/d', '/c', 'choco', 'install', app.id, '-y'] }
  if (app.manager === 'scoop') return { command: 'cmd.exe', args: ['/d', '/c', 'scoop', 'install', app.id] }
  if (app.manager === 'brew-cask') return { command: 'brew', args: ['install', '--cask', app.id] }
  if (app.manager === 'brew') return { command: 'brew', args: ['install', '--formula', app.id] }
  if (app.manager === 'flatpak') return { command: 'flatpak', args: ['install', app.id] }
  if (app.manager === 'snap') return { command: 'sudo', args: ['snap', 'install', app.id] }
  if (app.manager === 'zypper') return { command: 'sudo', args: ['zypper', 'install', '-y', app.id] }
  if (app.manager === 'dnf') return { command: 'sudo', args: ['dnf', 'install', app.id] }
  if (app.manager === 'pacman') return { command: 'sudo', args: ['pacman', '-S', app.id] }
  return { command: 'sudo', args: ['apt-get', 'install', app.id] }
}

export function uninstallCommand(app: App): { command: string; args: string[] } {
  if (app.manager === 'winget') return { command: 'winget', args: ['uninstall', '--id', app.id, '--exact'] }
  if (app.manager === 'choco' || app.manager === 'scoop') {
    if (!/^[\w.-]+$/.test(app.id)) throw new Error(`Invalid ${app.manager} package ID`)
    return { command: 'cmd.exe', args: ['/d', '/c', app.manager, 'uninstall', app.id] }
  }
  if (app.manager === 'brew-cask') return { command: 'brew', args: ['uninstall', '--cask', app.id] }
  if (app.manager === 'brew') return { command: 'brew', args: ['uninstall', '--formula', app.id] }
  if (app.manager === 'flatpak') return { command: 'flatpak', args: ['uninstall', app.id] }
  if (app.manager === 'snap') return { command: 'sudo', args: ['snap', 'remove', app.id] }
  if (app.manager === 'zypper') return { command: 'sudo', args: ['zypper', 'remove', '-y', app.id] }
  if (app.manager === 'dnf') return { command: 'sudo', args: ['dnf', 'remove', app.id] }
  if (app.manager === 'pacman') return { command: 'sudo', args: ['pacman', '-R', app.id] }
  return { command: 'sudo', args: ['apt-get', 'remove', app.id] }
}
