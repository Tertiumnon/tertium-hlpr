import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'

export interface PackageJson {
  scripts?: Record<string, string>
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
}

interface AngularJson {
  projects?: Record<string, { architect?: { build?: { options?: { outputPath?: string | { base?: string } } } } }>
}

export interface SuggestedScripts {
  dev: string
  start: string
  description: string
}

// Angular 17+ writes the Node server of an SSR build to <outputPath>/server/server.mjs.
export function ssrServerEntry(projectPath: string): string {
  const angular: AngularJson = JSON.parse(readFileSync(path.join(projectPath, 'angular.json'), 'utf8'))
  const [project] = Object.values(angular.projects ?? {})
  const outputPath = project?.architect?.build?.options?.outputPath
  const base = typeof outputPath === 'string' ? outputPath : outputPath?.base
  if (!base) throw new Error('angular.json has no build outputPath, so the SSR server entry cannot be found')
  return `${base}/server/server.mjs`
}

// serverEntry is only called when a universal project needs a production start script.
export function suggestedScripts(pkg: PackageJson, serverEntry: () => string): SuggestedScripts {
  const deps = { ...pkg.dependencies, ...pkg.devDependencies }
  const has = (name: string) => name in deps
  if (has('@angular/ssr')) return { dev: 'ng serve', start: `node ${serverEntry()}`, description: 'Angular universal (SSR)' }
  if (has('@angular/core')) return { dev: 'ng serve', start: 'ng serve', description: 'Angular' }
  if (has('react-scripts')) return { dev: 'react-scripts start', start: 'react-scripts start', description: 'Create React App' }
  if (has('vite')) return { dev: 'vite', start: 'vite preview', description: 'Vite' }
  return { dev: 'node .', start: 'node .', description: 'Unknown framework (fallback)' }
}

// Returns true when package.json was rewritten. Existing scripts are kept unless `force` is set.
export function ensureScripts(projectPath: string, options: { force?: boolean } = {}): boolean {
  const packageJsonPath = path.join(projectPath, 'package.json')
  const pkg: PackageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'))
  const suggested = suggestedScripts(pkg, () => ssrServerEntry(projectPath))
  const current = pkg.scripts ?? {}
  const next = { ...current }
  if (options.force || !current.start) next.start = suggested.start
  if (options.force || !current.dev) next.dev = suggested.dev

  console.log(`🔍 Framework: ${suggested.description}`)
  if (next.start === current.start && next.dev === current.dev) {
    console.log('✅ Scripts already configured')
    return false
  }

  pkg.scripts = next
  writeFileSync(packageJsonPath, `${JSON.stringify(pkg, null, 2)}\n`)
  console.log(`✏️  "start" → "${next.start}", "dev" → "${next.dev}"`)
  console.log('✅ package.json updated')
  return true
}
