import { readFile } from 'node:fs/promises'
import path from 'node:path'

export async function commandUsages(filePath: string, command: string): Promise<string[]> {
  const sources = [filePath, path.join(path.dirname(filePath), 'README.md')]
  const usages = new Set<string>()
  for (const source of sources) {
    try {
      const content = await readFile(source, 'utf8')
      const candidates = [
        ...[...content.matchAll(/Usage:\s*(hlpr[^\r\n'"]+)/gi)].map(match => match[1].trim()),
        ...content.split(/\r?\n/).map(line => line.trim()).filter(line => line.startsWith('hlpr ')),
      ]
      for (const usage of candidates) {
        if (usage === command || usage.startsWith(`${command} `)) usages.add(usage)
      }
    } catch {
      // A command may have no README or embedded usage string.
    }
  }
  return usages.size ? [...usages] : [command]
}
