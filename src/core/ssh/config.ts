import { constants } from 'node:fs'
import { appendFile, chmod, copyFile, readFile, writeFile } from 'node:fs/promises'

// A Host line can name several aliases: "Host web api". Matching is case-insensitive, like ssh.
function isHostLineFor(line: string, alias: string): boolean {
  const match = line.match(/^\s*Host\s+(.+?)(?:\s+#.*)?$/i)
  return match?.[1].split(/\s+/).some(name => name.toLowerCase() === alias.toLowerCase()) ?? false
}

export function hasHostAlias(config: string, alias: string): boolean {
  return config.split(/\r?\n/).some(line => isHostLineFor(line, alias))
}

// Returns the Host aliases of every block whose HostName is host. Wildcard patterns are skipped.
export function hostAliasesFor(config: string, host: string): string[] {
  const aliases: string[] = []
  let current: string[] = []
  let hostName: string | undefined
  const finishBlock = () => {
    if (hostName?.toLowerCase() === host.toLowerCase()) aliases.push(...current)
  }
  for (const line of config.split(/\r?\n/)) {
    if (/^\s*(Host|Match)\s/i.test(line)) {
      finishBlock()
      const names = line.match(/^\s*Host\s+(.+?)(?:\s+#.*)?$/i)?.[1].split(/\s+/) ?? []
      current = names.filter(name => !/[*?!]/.test(name))
      hostName = undefined
      continue
    }
    hostName ??= line.match(/^\s*HostName\s+(\S+)/i)?.[1]
  }
  finishBlock()
  return aliases
}

// Backs up the config, then appends a Host entry. Returns the backup path.
export async function saveConnection(configPath: string, alias: string, user: string, host: string, keyPath: string): Promise<string> {
  let existing = ''
  let configExists = false
  try { existing = await readFile(configPath, 'utf8'); configExists = true }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error }
  if (hasHostAlias(existing, alias)) throw new Error(`SSH host "${alias}" already exists in ${configPath}`)

  const newline = existing.includes('\r\n') ? '\r\n' : '\n'
  const separator = !existing || existing.endsWith(`${newline}${newline}`) ? '' : existing.endsWith(newline) ? newline : `${newline}${newline}`
  const entry = `Host ${alias}${newline}    HostName ${host}${newline}    User ${user}${newline}    IdentityFile "${keyPath.replace(/\\/g, '/')}"${newline}    IdentitiesOnly yes${newline}`
  const backup = `${configPath}.bak-${new Date().toISOString().replace(/[:.]/g, '-')}-${process.pid}`
  if (configExists) await copyFile(configPath, backup, constants.COPYFILE_EXCL)
  else await writeFile(backup, '', { flag: 'wx', mode: 0o600 })
  await appendFile(configPath, separator + entry, { mode: 0o600 })
  if (process.platform !== 'win32') await chmod(configPath, 0o600)
  return backup
}
