const aliases: Record<string, string> = { i: 'install', rn: 'rename' }

export function resolveCommandAlias(command: string): string {
  return aliases[command] || command
}

export function resolveSubcommandAlias(category: string, command: string): string {
  return category === 'git' && command === 'rm' ? 'remove' : command
}
