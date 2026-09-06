import { describe, it, expect, vi, beforeEach, afterEach } from 'vite-plus/test'
import type { PathLike } from 'node:fs'

vi.mock('node:child_process', () => {
  const spawnSync = vi.fn()
  return { default: { spawnSync }, spawnSync }
})
vi.mock('node:fs', () => {
  const existsSync = vi.fn()
  const writeFileSync = vi.fn()
  return { default: { existsSync, writeFileSync }, existsSync, writeFileSync }
})
vi.mock('node:readline/promises', () => {
  const createInterface = vi.fn(() => ({ question: vi.fn().mockResolvedValue('n'), close: vi.fn() }))
  return { default: { createInterface }, createInterface }
})

import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { runDeploy } from '@/commands/deploy.ts'

const mockSpawn = vi.mocked(spawnSync)
const mockExists = vi.mocked(existsSync)

const ok = (stdout = ''): any => ({ status: 0, stdout, stderr: '' })

function setupWorkspaces(packages = ['@munsonlabs/bridge', '@munsonlabs/shipkit']) {
  mockSpawn.mockImplementation((cmd: string, args: readonly string[] = []) => {
    if (cmd === 'npm' && args[0] === 'query') return ok(JSON.stringify(packages.map((name) => ({ name }))))
    if (cmd === 'npm' && args[0] === 'pkg') return ok('"1.2.0"')
    if (cmd === 'git' && args.includes('--abbrev-ref')) return ok('main')
    if (cmd === 'git' && args.includes('--porcelain')) return ok('')
    return ok()
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  mockExists.mockReturnValue(false)
  delete process.env.GITHUB_ACTIONS
  delete process.env.GITHUB_REF_NAME
  process.env.VERDACCIO_URL = 'http://verdaccio:4873'
})

afterEach(() => {
  delete process.env.VERDACCIO_URL
})

describe('runDeploy', () => {
  it('logs message when no action is specified', async () => {
    const consoleSpy = vi.spyOn(console, 'log')
    await runDeploy({})
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('No action specified'))
  })
})

describe('versionFlow', () => {
  it('exits with code 1 when GITHUB_ACTIONS is not set', async () => {
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('exit')
    }) as any
    await expect(runDeploy({ version: true })).rejects.toThrow('exit')
    expect(exitSpy).toHaveBeenCalledWith(1)
  })

  it('exits prerelease mode if pre.json exists on main', async () => {
    process.env.GITHUB_ACTIONS = '1'
    process.env.GITHUB_REF_NAME = 'main'
    mockExists.mockImplementation((p: PathLike) => String(p).endsWith('pre.json'))
    mockSpawn.mockReturnValue(ok())

    await runDeploy({ version: true })

    const preExit = mockSpawn.mock.calls.find(([cmd, args]) => cmd === 'npx' && (args ?? []).includes('changeset') && (args ?? []).includes('exit'))
    expect(preExit).toBeDefined()
  })

  it('skips pre exit if pre.json does not exist on main', async () => {
    process.env.GITHUB_ACTIONS = '1'
    process.env.GITHUB_REF_NAME = 'main'
    mockExists.mockReturnValue(false)
    mockSpawn.mockReturnValue(ok())

    await runDeploy({ version: true })

    const preExit = mockSpawn.mock.calls.find(([cmd, args]) => cmd === 'npx' && (args ?? []).includes('changeset') && (args ?? []).includes('exit'))
    expect(preExit).toBeUndefined()
  })

  it('commits version bump when git status is dirty', async () => {
    process.env.GITHUB_ACTIONS = '1'
    process.env.GITHUB_REF_NAME = 'main'
    mockSpawn.mockImplementation((cmd: string, args: readonly string[] = []) => {
      if (cmd === 'git' && args.includes('--porcelain')) return ok('M package.json')
      return ok()
    })

    await runDeploy({ version: true })

    const commit = mockSpawn.mock.calls.find(([cmd, args]) => cmd === 'git' && args?.[0] === 'commit')
    expect(commit).toBeDefined()
    expect(commit![1]?.join(' ')).toContain('[skip ci]')
  })

  it('skips version commit when git status is clean', async () => {
    process.env.GITHUB_ACTIONS = '1'
    process.env.GITHUB_REF_NAME = 'main'
    mockSpawn.mockImplementation((cmd: string, args: readonly string[] = []) => {
      if (cmd === 'git' && args.includes('--porcelain')) return ok('')
      return ok()
    })

    await runDeploy({ version: true })

    const commit = mockSpawn.mock.calls.find(([cmd, args]) => cmd === 'git' && args?.[0] === 'commit')
    expect(commit).toBeUndefined()
  })

  it('enters prerelease mode on beta branch if pre.json is absent', async () => {
    process.env.GITHUB_ACTIONS = '1'
    process.env.GITHUB_REF_NAME = 'beta'
    mockExists.mockReturnValue(false)
    mockSpawn.mockReturnValue(ok())

    await runDeploy({ version: true, beta: true })

    const preEnter = mockSpawn.mock.calls.find(([cmd, args]) => cmd === 'npx' && (args ?? []).includes('changeset') && (args ?? []).includes('enter'))
    expect(preEnter).toBeDefined()
  })

  it('skips entering prerelease mode if pre.json already exists on beta', async () => {
    process.env.GITHUB_ACTIONS = '1'
    process.env.GITHUB_REF_NAME = 'beta'
    mockExists.mockImplementation((p: PathLike) => String(p).endsWith('pre.json'))
    mockSpawn.mockReturnValue(ok())

    await runDeploy({ version: true, beta: true })

    const preEnter = mockSpawn.mock.calls.find(([cmd, args]) => cmd === 'npx' && (args ?? []).includes('changeset') && (args ?? []).includes('enter'))
    expect(preEnter).toBeUndefined()
  })

  it('logs skip message when not on main or beta branch', async () => {
    process.env.GITHUB_ACTIONS = '1'
    process.env.GITHUB_REF_NAME = 'feature/my-thing'
    const consoleSpy = vi.spyOn(console, 'log')
    mockSpawn.mockReturnValue(ok())

    await runDeploy({ version: true })

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('skipping version'))
  })
})

describe('publishFlow', () => {
  it('exits with code 1 when GITHUB_ACTIONS is not set', async () => {
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('exit')
    }) as any
    await expect(runDeploy({ publish: true })).rejects.toThrow('exit')
    expect(exitSpy).toHaveBeenCalledWith(1)
  })

  it('runs changeset publish on main branch', async () => {
    process.env.GITHUB_ACTIONS = '1'
    process.env.GITHUB_REF_NAME = 'main'
    mockSpawn.mockReturnValue(ok())

    await runDeploy({ publish: true })

    const publish = mockSpawn.mock.calls.find(
      ([cmd, args]) => cmd === 'npx' && (args ?? []).includes('changeset') && (args ?? []).includes('publish'),
    )
    expect(publish).toBeDefined()
  })

  it('runs changeset publish on beta branch', async () => {
    process.env.GITHUB_ACTIONS = '1'
    process.env.GITHUB_REF_NAME = 'beta'
    mockSpawn.mockReturnValue(ok())

    await runDeploy({ publish: true })

    const publish = mockSpawn.mock.calls.find(
      ([cmd, args]) => cmd === 'npx' && (args ?? []).includes('changeset') && (args ?? []).includes('publish'),
    )
    expect(publish).toBeDefined()
  })

  it('logs skip message when not on main or beta branch', async () => {
    process.env.GITHUB_ACTIONS = '1'
    process.env.GITHUB_REF_NAME = 'feature/my-thing'
    const consoleSpy = vi.spyOn(console, 'log')
    mockSpawn.mockReturnValue(ok())

    await runDeploy({ publish: true })

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('skipping publish'))
  })
})

describe('publishLocalFlow', () => {
  it('publishes only @munsonlabs/* workspaces, ignoring others', async () => {
    setupWorkspaces(['@munsonlabs/bridge', 'some-app'])

    await runDeploy({ local: true, scope: '@munsonlabs/' })

    const publishCalls = mockSpawn.mock.calls.filter(([cmd, args]) => cmd === 'npm' && args?.[0] === 'publish')
    expect(publishCalls).toHaveLength(1)
    expect(publishCalls[0][1]).toContain('--workspace=@munsonlabs/bridge')
  })

  it('publishes with a local timestamp version', async () => {
    setupWorkspaces(['@munsonlabs/bridge'])

    await runDeploy({ local: true })

    const versionCall = mockSpawn.mock.calls.find(([cmd, args]) => cmd === 'npm' && args?.[0] === 'version' && String(args[1]).includes('-local.'))
    expect(versionCall![1]![1]).toMatch(/^1\.2\.0-local\.\d+$/)
  })

  it('all packages in a batch share the same timestamp', async () => {
    setupWorkspaces(['@munsonlabs/bridge', '@munsonlabs/shipkit'])

    await runDeploy({ local: true })

    const timestamps = mockSpawn.mock.calls
      .filter(([cmd, args]) => cmd === 'npm' && args?.[0] === 'version' && String(args[1]).includes('-local.'))
      .map(([, args]) => String(args![1]).split('-local.')[1])

    expect(new Set(timestamps).size).toBe(1)
  })

  it('publishes to the Verdaccio registry', async () => {
    setupWorkspaces(['@munsonlabs/bridge'])

    await runDeploy({ local: true })

    const publishCall = mockSpawn.mock.calls.find(([cmd, args]) => cmd === 'npm' && args?.[0] === 'publish')
    expect(publishCall![1]).toContain('--registry=http://verdaccio:4873')
    expect(publishCall![1]).toContain('--tag=local')
  })

  it('restores the original version after publish', async () => {
    setupWorkspaces(['@munsonlabs/bridge'])

    await runDeploy({ local: true })

    const versionCalls = mockSpawn.mock.calls.filter(([cmd, args]) => cmd === 'npm' && args?.[0] === 'version')
    expect(versionCalls.at(-1)![1]![1]).toBe('1.2.0')
  })

  it('restores the original version even when publish fails', async () => {
    mockSpawn.mockImplementation((cmd: string, args: readonly string[] = []) => {
      if (cmd === 'npm' && args[0] === 'query') return ok(JSON.stringify([{ name: '@munsonlabs/bridge' }]))
      if (cmd === 'npm' && args[0] === 'pkg') return ok('"1.2.0"')
      if (cmd === 'npm' && args[0] === 'publish') return { status: 1, stdout: '', stderr: 'error' } as any
      return ok()
    })

    await runDeploy({ local: true }).catch(() => {})

    const restoreCall = mockSpawn.mock.calls.find(([cmd, args]) => cmd === 'npm' && args?.[0] === 'version' && args[1] === '1.2.0')
    expect(restoreCall).toBeDefined()
  })

  it('only publishes the specified package when --package is given', async () => {
    setupWorkspaces(['@munsonlabs/bridge', '@munsonlabs/shipkit'])

    await runDeploy({ local: true, package: '@munsonlabs/bridge' })

    const publishCalls = mockSpawn.mock.calls.filter(([cmd, args]) => cmd === 'npm' && args?.[0] === 'publish')
    expect(publishCalls).toHaveLength(1)
    expect(publishCalls[0][1]).toContain('--workspace=@munsonlabs/bridge')
  })
})

describe('publishSnapshotFlow', () => {
  it('publishes with a 0.0.0-<tag>-<timestamp> version', async () => {
    setupWorkspaces(['@munsonlabs/bridge'])

    await runDeploy({ snapshot: 'my-feature' })

    const versionCall = mockSpawn.mock.calls.find(
      ([cmd, args]) => cmd === 'npm' && args?.[0] === 'version' && String(args[1]).startsWith('0.0.0-my-feature-'),
    )
    expect(versionCall).toBeDefined()
  })

  it('publishes to the npm registry, bypassing Verdaccio', async () => {
    setupWorkspaces(['@munsonlabs/bridge'])

    await runDeploy({ snapshot: 'my-feature' })

    const publishCall = mockSpawn.mock.calls.find(([cmd, args]) => cmd === 'npm' && args?.[0] === 'publish')
    expect(publishCall![1]).toContain('--registry=https://registry.npmjs.org')
  })

  it('uses the tag as the npm dist-tag', async () => {
    setupWorkspaces(['@munsonlabs/bridge'])

    await runDeploy({ snapshot: 'my-feature' })

    const publishCall = mockSpawn.mock.calls.find(([cmd, args]) => cmd === 'npm' && args?.[0] === 'publish')
    expect(publishCall![1]).toContain('--tag=my-feature')
  })

  it('restores the original version after snapshot publish', async () => {
    setupWorkspaces(['@munsonlabs/bridge'])

    await runDeploy({ snapshot: 'my-feature' })

    const versionCalls = mockSpawn.mock.calls.filter(([cmd, args]) => cmd === 'npm' && args?.[0] === 'version')
    expect(versionCalls.at(-1)![1]![1]).toBe('1.2.0')
  })
})
