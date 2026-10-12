export function resolveSubcommandAlias(category: string, command: string): string {
  if (category === 'app' && (command === 'delete' || command === 'uninstall')) return 'remove'
  if (category === 'app' && command === 'find') return 'search'
  if (category === 'file' && command === 'mv') return 'move'
  if (category === 'file' && command === 'search') return 'find'
  if (command === 'info' && (category === 'battery' || category === 'net')) return 'status'
  if (command === 'status' && (category === 'disk' || category === 'memory' || category === 'system')) return 'info'
  return category === 'git' && command === 'rm' ? 'remove' : command
}
