export interface WorkflowArgs<T extends string> {
  workflow: T
  projectPath: string
  force: boolean
}

// Parses `-workflow <name> [projectPath] [-force]`. `usage` is returned in errors, so keep it a literal:
// `hlpr help` scrapes "Usage:" lines from the command source.
export function parseWorkflowArgs<T extends string>(args: string[], workflows: readonly T[], usage: string): WorkflowArgs<T> {
  const workflowIndex = args.indexOf('-workflow')
  const workflow = workflowIndex === -1 ? undefined : args[workflowIndex + 1]
  const known = workflows.find(name => name === workflow)
  if (known === undefined) throw new Error(usage)

  const unknownFlag = args.find(arg => arg.startsWith('-') && arg !== '-workflow' && arg !== '-force')
  if (unknownFlag) throw new Error(`Unknown option ${unknownFlag}. ${usage}`)

  const positional = args.filter((arg, index) => !arg.startsWith('-') && index !== workflowIndex + 1)
  if (positional.length > 1) throw new Error(usage)
  return { workflow: known, projectPath: positional[0] ?? process.cwd(), force: args.includes('-force') }
}
