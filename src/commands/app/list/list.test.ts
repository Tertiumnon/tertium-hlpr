import { describe, expect, test } from 'bun:test'
import { pageNames } from './list.js'
import { packageQueries } from '../../../core/command/apps.js'

describe('app list', () => {
  test('checks typical package managers on each platform', () => {
    expect(packageQueries('win32').map(query => query.manager)).toEqual(['winget', 'choco', 'scoop'])
    expect(packageQueries('darwin').map(query => query.manager)).toEqual(['brew', 'brew-cask'])
    expect(packageQueries('linux').map(query => query.manager)).toEqual(['apt', 'dnf', 'pacman', 'brew'])
  })

  test('shows at most ten names per page', () => {
    const names = Array.from({ length: 21 }, (_, index) => `app-${index}`)
    expect(pageNames(names, 0)).toEqual(names.slice(0, 10))
    expect(pageNames(names, 1)).toEqual(names.slice(10, 20))
    expect(pageNames(names, 2)).toEqual(['app-20'])
  })
})
