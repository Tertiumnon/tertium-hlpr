import { describe, expect, test } from 'bun:test'
import { updateProfile } from './cli-tool.js'

describe('cli-tool installer', () => {
  test('switches prompt initialization without changing other profile lines', () => {
    const profile = '$env:EDITOR = "code"\nInvoke-Expression (&starship init powershell)\n'
    expect(updateProfile(profile, 'oh-my-posh')).toBe('$env:EDITOR = "code"\noh-my-posh init pwsh | Invoke-Expression\n')
  })
})
