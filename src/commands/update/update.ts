// @description Update hlpr to the latest version from npm
import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const PACKAGE_NAME = '@tertium/hlpr'

// ponytail: compares x.y.z only, pre-release tags are not handled
function isNewer(latest: string, current: string): boolean {
  const a = latest.split('.').map(Number)
  const b = current.split('.').map(Number)
  for (let i = 0; i < 3; i++) {
    if (a[i] !== b[i]) return a[i] > b[i]
  }
  return false
}

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const packagePath = path.join(__dirname, '..', '..', '..', 'package.json')
const currentVersion: string = JSON.parse(readFileSync(packagePath, 'utf-8')).version

const latestVersion = execSync(`npm view ${PACKAGE_NAME} version`, { encoding: 'utf-8' }).trim()

if (isNewer(latestVersion, currentVersion)) {
  console.log(`Updating hlpr v${currentVersion} -> v${latestVersion}`)
  execSync(`npm install -g ${PACKAGE_NAME}@latest`, { stdio: 'inherit' })
  console.log(`✓ hlpr updated to v${latestVersion}`)
} else {
  console.log(`hlpr is up to date (v${currentVersion}, npm latest v${latestVersion})`)
}
