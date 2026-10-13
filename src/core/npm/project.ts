import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

export type PackageManager = 'bun' | 'pnpm' | 'yarn' | 'npm'

export interface PackageJson {
  name?: string
  private?: boolean
  scripts?: Record<string, string>
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
}

const LOCKFILES: Array<[string, PackageManager]> = [
  ['bun.lock', 'bun'],
  ['bun.lockb', 'bun'],
  ['pnpm-lock.yaml', 'pnpm'],
  ['yarn.lock', 'yarn'],
  ['package-lock.json', 'npm'],
]

export const RUN_PREFIX: Record<PackageManager, string> = {
  bun: 'bun run',
  pnpm: 'pnpm run',
  yarn: 'yarn',
  npm: 'npm run',
}

export function readPackageJson(projectPath: string): PackageJson {
  return JSON.parse(readFileSync(path.join(projectPath, 'package.json'), 'utf8'))
}

export function detectPackageManager(projectPath: string): PackageManager {
  const lockfile = LOCKFILES.find(([file]) => existsSync(path.join(projectPath, file)))
  return lockfile?.[1] ?? 'npm'
}

export function isTypeScriptProject(projectPath: string, pkg: PackageJson): boolean {
  if (existsSync(path.join(projectPath, 'tsconfig.json'))) return true
  return Boolean(pkg.dependencies?.typescript || pkg.devDependencies?.typescript)
}
