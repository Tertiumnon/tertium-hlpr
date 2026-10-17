// Parses `-flag value` pairs and bare switches for every command. Rejects unknown flags, repeats and missing values.
export function parseFlags(args: string[], valued: string[], switches: string[] = []): Record<string, string | true> {
  const values: Record<string, string | true> = {}
  for (let index = 0; index < args.length; index++) {
    const arg = args[index]
    if (switches.includes(arg)) {
      if (values[arg]) throw new Error(`Repeated flag ${arg}`)
      values[arg] = true
      continue
    }
    if (!valued.includes(arg)) throw new Error(`Unknown or misplaced argument: ${arg}`)
    if (values[arg]) throw new Error(`Repeated flag ${arg}`)
    const value = args[index + 1]
    if (value === undefined || value.startsWith('-')) throw new Error(`${arg} needs a value`)
    values[arg] = value
    index++
  }
  return values
}
