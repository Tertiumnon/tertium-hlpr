import { expect, test } from 'bun:test'
import { matchingAppNames } from './search.js'

test('searches installed app names by case-insensitive substring and removes duplicates', () => {
  const apps = [
    { manager: 'winget', name: 'Visual Studio Code', id: 'Microsoft.VSCode' },
    { manager: 'choco', name: 'Visual Studio Code', id: 'vscode' },
    { manager: 'winget', name: 'Android Studio', id: 'Google.AndroidStudio' },
  ]
  expect(matchingAppNames(apps, 'STUDIO')).toEqual(['Android Studio', 'Visual Studio Code'])
  expect(matchingAppNames(apps, 'missing')).toEqual([])
})
