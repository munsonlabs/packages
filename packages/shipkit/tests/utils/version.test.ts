import { describe, it, expect, vi, beforeEach } from 'vite-plus/test'

vi.mock('node:child_process', () => {
  const execSync = vi.fn()
  return { default: { execSync }, execSync }
})

import { execSync } from 'node:child_process'
import { getVersionFromGit, getVersion, getFormattedVersion } from '@/utils/version.ts'

const mockExec = vi.mocked(execSync)

beforeEach(() => vi.clearAllMocks())

describe('getVersionFromGit', () => {
  it('returns feature_* for feature/ branches', () => {
    mockExec.mockReturnValueOnce('feature/my-feature\n' as any)
    expect(getVersionFromGit()).toBe('feature_my-feature')
  })

  it('strips leading v from tag version', () => {
    mockExec.mockReturnValueOnce('main\n' as any)
    mockExec.mockReturnValueOnce('v1.2.3\n' as any)
    expect(getVersionFromGit()).toBe('1.2.3')
  })

  it('returns tag version without leading v', () => {
    mockExec.mockReturnValueOnce('master\n' as any)
    mockExec.mockReturnValueOnce('2.0.0-dev\n' as any)
    expect(getVersionFromGit()).toBe('2.0.0-dev')
  })

  it('returns 0.0.0 on execSync error', () => {
    mockExec.mockImplementation(() => {
      throw new Error('not a git repo')
    })
    expect(getVersionFromGit()).toBe('0.0.0')
  })
})

describe('getVersion', () => {
  it('returns git version when inside work tree', () => {
    mockExec.mockReturnValueOnce('true\n' as any) // is-inside-work-tree
    mockExec.mockReturnValueOnce('main\n' as any) // branch
    mockExec.mockReturnValueOnce('1.5.0\n' as any) // describe
    expect(getVersion()).toBe('1.5.0')
  })

  it('returns 0.0.0 when not inside a git work tree', () => {
    mockExec.mockReturnValueOnce('false\n' as any)
    expect(getVersion()).toBe('0.0.0')
  })

  it('returns 0.0.0 on error', () => {
    mockExec.mockImplementation(() => {
      throw new Error()
    })
    expect(getVersion()).toBe('0.0.0')
  })
})

describe('getFormattedVersion', () => {
  it('replaces hyphens with underscores', () => {
    mockExec.mockReturnValueOnce('true\n' as any)
    mockExec.mockReturnValueOnce('master\n' as any)
    mockExec.mockReturnValueOnce('1.2.3-dev\n' as any)
    expect(getFormattedVersion()).toBe('1.2.3_dev')
  })

  it('leaves versions without hyphens unchanged', () => {
    mockExec.mockReturnValueOnce('true\n' as any)
    mockExec.mockReturnValueOnce('master\n' as any)
    mockExec.mockReturnValueOnce('1.0.0\n' as any)
    expect(getFormattedVersion()).toBe('1.0.0')
  })
})
