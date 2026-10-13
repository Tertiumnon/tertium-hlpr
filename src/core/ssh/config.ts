// A Host line can name several aliases: "Host web api". Matching is case-insensitive, like ssh.
function isHostLineFor(line: string, alias: string): boolean {
  const match = line.match(/^\s*Host\s+(.+?)(?:\s+#.*)?$/i)
  return match?.[1].split(/\s+/).some(name => name.toLowerCase() === alias.toLowerCase()) ?? false
}

export function hasHostAlias(config: string, alias: string): boolean {
  return config.split(/\r?\n/).some(line => isHostLineFor(line, alias))
}

// Returns the Host block for alias, from its Host line up to the next Host or Match line.
export function readHostBlock(config: string, alias: string): string | undefined {
  const lines = config.split(/\r?\n/)
  const start = lines.findIndex(line => isHostLineFor(line, alias))
  if (start === -1) return undefined
  const next = lines.findIndex((line, index) => index > start && /^\s*(Host|Match)\s/i.test(line))
  const block = lines.slice(start, next === -1 ? lines.length : next)
  return `${block.join('\n').trimEnd()}\n`
}
