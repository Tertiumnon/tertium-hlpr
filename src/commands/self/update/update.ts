// @description Update hlpr to the latest version from npm
import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const PACKAGE_NAME = '@tertium/hlpr'

// shortcut: compares stable x.y.z versions only, use semver when prerelease updates are supported.
function isNewer(latest: string, current: string): boolean {
  const a = latest.split('.').map(Number)
  const b = current.split('.').map(Number)
  for (let i = 0; i < 3; i++) {
    if (a[i] !== b[i]) return a[i] > b[i]
  }
  return false
}

const args = process.argv.slice(2)
if (args.includes('--help') || args.includes('-h')) {
  console.log('Usage: hlpr self update')
  console.log('Update hlpr through npm: npm install -g @tertium/hlpr@latest')
  console.log('Installs only when npm has a newer version. Alias: hlpr self upgrade')
  process.exit(0)
}
if (args.length > 0) {
  console.error('Usage: hlpr self update')
  process.exit(1)
}

try {
  const __dirname = path.dirname(fileURLToPath(import.meta.url))
  const packagePath = path.join(__dirname, '..', '..', '..', '..', 'package.json')
  const currentVersion: string = JSON.parse(readFileSync(packagePath, 'utf-8')).version
  const latestVersion = execSync(`npm view ${PACKAGE_NAME} version`, { encoding: 'utf-8' }).trim()

  if (isNewer(latestVersion, currentVersion)) {
    console.log(`Updating hlpr v${currentVersion} -> v${latestVersion}`)
    execSync(`npm install -g ${PACKAGE_NAME}@latest`, { stdio: 'inherit' })
    console.log(`✓ hlpr updated to v${latestVersion}`)
  } else {
    console.log(`hlpr is up to date (v${currentVersion}, npm latest v${latestVersion})`)
  }
} catch (error) {
  console.error(`Update failed: ${error instanceof Error ? error.message : error}`)
  process.exit(1)
}
