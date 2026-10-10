const aliases: Record<string, string> = { i: 'install', rn: 'rename' }

export function resolveCommandAlias(command: string): string {
  return aliases[command] || command
}
