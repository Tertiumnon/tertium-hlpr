// Editors that -editor accepts. `code --wait` keeps the command running until the tab is closed.
const EDITOR_COMMANDS = new Map([
  ['code', 'code --wait'],
  ['edit', 'edit'],
  ['nano', 'nano'],
  ['vi', 'vi'],
])

// Command for the -editor value. Throws for anything else.
export function editorFlagCommand(choice: string): string {
  const command = EDITOR_COMMANDS.get(choice)
  if (command === undefined) throw new Error('Invalid -editor: use code, edit, nano or vi')
  return command
}

// -editor wins; otherwise $VISUAL, $EDITOR, then edit (MS-DOS Editor) on Windows or vi elsewhere.
export function editorCommand(choice?: string): string {
  if (choice !== undefined) return editorFlagCommand(choice)
  return process.env.VISUAL || process.env.EDITOR || (process.platform === 'win32' ? 'edit' : 'vi')
}
