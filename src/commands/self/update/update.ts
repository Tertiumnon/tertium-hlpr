// @description Update hlpr to the latest version from npm
import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { installedCommandsWork, repairInstallation, selfUpdateInstallCommand } from '../../../core/command/self-update.js'

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
  console.log('Update hlpr through Volta or npm.')
  console.log('Checks the installed version and commands, repairing them if needed. Alias: hlpr self upgrade')
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

  const updateAvailable = isNewer(latestVersion, currentVersion)
  if (updateAvailable) {
    console.log(`Updating hlpr v${currentVersion} -> v${latestVersion}`)
    execSync(selfUpdateInstallCommand(packagePath), { stdio: 'inherit' })
  } else {
    console.log(`hlpr is up to date (v${currentVersion}, npm latest v${latestVersion})`)
  }
  const expectedVersion = updateAvailable ? latestVersion : currentVersion
  if (!installedCommandsWork(expectedVersion)) {
    console.log('Installed commands did not pass verification. Repairing hlpr...')
    repairInstallation(packagePath)
    if (!installedCommandsWork(expectedVersion)) throw new Error('hlpr commands still fail after repair')
    console.log('hlpr commands verified after repair.')
  }
  if (updateAvailable) console.log(`✓ hlpr updated to v${latestVersion}`)
} catch (error) {
  console.error(`Update failed: ${error instanceof Error ? error.message : error}`)
  process.exit(1)
}
