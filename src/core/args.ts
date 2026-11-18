// Parses valued options and switches. Rejects unknown flags, repeats and missing values.
export function parseFlags(args: string[], valued: string[], switches: string[] = []): Record<string, string | true> {
  const values: Record<string, string | true> = {}
  for (const arg of args) {
    if (switches.includes(arg)) {
      if (values[arg]) throw new Error(`Repeated flag ${arg}`)
      values[arg] = true
      continue
    }
    const match = arg.match(/^--([a-z][a-z-]*)=(.+)$/s)
    if (!match || !valued.includes(`-${match[1]}`)) throw new Error(`Unknown or misplaced argument: ${arg.split('=')[0]}`)
    const key = `-${match[1]}`
    if (values[key] !== undefined) throw new Error(`Repeated flag --${match[1]}`)
    values[key] = match[2]
  }
  return values
}
