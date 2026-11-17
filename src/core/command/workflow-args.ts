export interface WorkflowArgs<T extends string> {
  workflow: T
  projectPath: string
  force: boolean
}

// Parses `--workflow=<name> [--path=<projectPath>] [-force]`. `usage` is returned in errors, so keep it a literal:
// `hlpr help` scrapes "Usage:" lines from the command source.
export function parseWorkflowArgs<T extends string>(args: string[], workflows: readonly T[], usage: string): WorkflowArgs<T> {
  let values: Record<string, string | true>
  try { values = parseFlags(args, ['-workflow', '-path'], ['-force']) }
  catch (error) { throw new Error(`${error instanceof Error ? error.message : error}\n${usage}`) }
  const workflow = values['-workflow']
  const known = workflows.find(name => name === workflow)
  if (known === undefined) throw new Error(usage)

  return { workflow: known, projectPath: typeof values['-path'] === 'string' ? values['-path'] : process.cwd(), force: values['-force'] === true }
}
import { parseFlags } from '../args.js'

