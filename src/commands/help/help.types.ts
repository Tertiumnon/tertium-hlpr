export interface CommandInfo {
  category: string
  name: string
  type: 'typescript' | 'shell'
  path: string
  description?: string
}
