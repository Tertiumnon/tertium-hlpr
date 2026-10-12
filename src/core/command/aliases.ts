const aliases: Record<string, Record<string, string>> = {
  app: { delete: 'remove', uninstall: 'remove', find: 'search' },
  battery: { info: 'status' },
  disk: { status: 'info' },
  file: { mv: 'move', search: 'find' },
  git: { rm: 'remove' },
  memory: { status: 'info' },
  net: { info: 'status' },
  system: { status: 'info' },
}

export function resolveSubcommandAlias(category: string, command: string): string {
  return aliases[category]?.[command] ?? command
}

export function subcommandAliases(category: string, command: string): string[] {
  return Object.entries(aliases[category] ?? {}).filter(([, target]) => target === command).map(([alias]) => alias)
}
