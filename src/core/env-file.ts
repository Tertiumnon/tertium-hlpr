// Reads and replaces one KEY=value line in a .env file kept as text. A key that appears more than once
// is refused, so a change never touches a line the user did not name.

const SAFE_VALUE = /^[A-Za-z0-9_./+=@%:,-]+$/

export function validateEnvKey(key: string, flag = '-key'): string {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) throw new Error(`Invalid ${flag}: use a variable name such as DB_PASSWORD`)
  return key
}

// Matches the start of a line that assigns key, with an optional indent and `export `.
function assignmentPattern(key: string): RegExp {
  return new RegExp(`^\\s*(?:export\\s+)?${key}\\s*=`)
}

function assignmentLines(lines: string[], key: string): number[] {
  const pattern = assignmentPattern(key)
  return lines.flatMap((line, index) => (pattern.test(line) ? [index] : []))
}

function onlyAssignment(lines: string[], key: string): number {
  const found = assignmentLines(lines, key)
  if (found.length === 0) throw new Error(`No ${key} line in the value`)
  if (found.length > 1) throw new Error(`${key} is set ${found.length} times; remove the extra lines first`)
  return found[0]
}

// The value of key, without quotes or a trailing comment.
export function readEnvKey(text: string, key: string): string {
  const lines = text.split('\n')
  const raw = lines[onlyAssignment(lines, key)].replace(/\r$/, '').replace(assignmentPattern(key), '')
  const quoted = raw.match(/^(['"])(.*)\1\s*$/)
  if (quoted) return quoted[2]
  return raw.replace(/\s+#.*$/, '').trim()
}

// A value that needs no quotes is written as it is. Anything else goes in single quotes, which .env
// parsers read literally. A single quote or a line break cannot be written safely, so it is refused.
export function quoteEnvValue(value: string): string {
  if (value === '') throw new Error('The value is empty; a variable cannot be set to nothing here')
  if (SAFE_VALUE.test(value)) return value
  if (/['\r\n]/.test(value)) throw new Error('The value contains a single quote or a line break, which cannot be written safely')
  return `'${value}'`
}

// Returns the text with only the key line replaced. Indent, `export `, and CRLF line endings are kept.
export function setEnvKey(text: string, key: string, value: string): string {
  const lines = text.split('\n')
  const index = onlyAssignment(lines, key)
  const line = lines[index]
  const indent = line.match(/^\s*(?:export\s+)?/)?.[0] ?? ''
  const lineEnd = line.endsWith('\r') ? '\r' : ''
  lines[index] = `${indent}${key}=${quoteEnvValue(value)}${lineEnd}`
  return lines.join('\n')
}

// Like readEnvKey, but undefined when the key is not set at all. A repeated key is still refused.
export function readOptionalEnvKey(text: string, key: string): string | undefined {
  if (assignmentLines(text.split('\n'), key).length === 0) return undefined
  return readEnvKey(text, key)
}
