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

interface HelpCommand {
  category: string
  name: string
  description?: string
  usages?: string[]
}

export function renderHelp(commands: HelpCommand[], version: string, color = process.stdout.isTTY && !process.env.NO_COLOR && process.env.TERM !== 'dumb'): string {
  const paint = (code: string, value: string) => color ? `\u001b[${code}m${value}\u001b[0m` : value
  const lines = [
    paint('1;36', `hlpr v${version}`),
    `${paint('1', 'Usage')}  hlpr [options] <domain> <command> [params...]`,
    `${paint('1', 'Options')}  -f force  ·  -v, --version  ·  help, -h, --help, /h, /help, /?`,
  ]

  const categories = [...new Set(commands.map(command => command.category))].sort()
  const commandNames = new Set(commands.map(command => command.category === command.name ? `hlpr ${command.name}` : `hlpr ${command.category} ${command.name}`))
  for (const category of categories) {
    lines.push('', paint('1;36', category.toUpperCase()))
    for (const command of commands.filter(item => item.category === category).sort((a, b) => a.name.localeCompare(b.name))) {
      const base = command.category === command.name ? `hlpr ${command.name}` : `hlpr ${category} ${command.name}`
      const usages = (command.usages?.length ? command.usages : [base]).filter(usage => !usage.endsWith(' --help'))
      const syntax = usages.some(usage => usage.includes('<')) ? [usages.find(usage => usage.includes('<')) ?? base] : usages
      const [first, ...alternatives] = syntax.length ? syntax : [base]
      lines.push(`  ${paint('36', first)}${command.description ? paint('2', `  ${command.description}`) : ''}`)
      const variants = alternatives.filter(usage => !commandNames.has(usage)).map(usage => usage.startsWith(`${base} `) ? usage.slice(base.length + 1) : usage)
      if (command.name === 'info' || command.name === 'status') variants.push(`hlpr ${category} ${command.name === 'info' ? 'status' : 'info'}`)
      if (category === 'app' && command.name === 'search') variants.push('hlpr app find -name <name>')
      if (category === 'file' && command.name === 'find') variants.push('hlpr file search -name <name>')
      if (variants.length) lines.push(`    ${paint('2', `also: ${variants.join('  ·  ')}`)}`)
    }
  }
  return lines.join('\n')
}
