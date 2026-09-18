import { describe, it, expect, vi, beforeEach, afterEach } from 'vite-plus/test'
import { resolve } from 'node:path'

vi.mock('node:fs', () => {
  const existsSync = vi.fn()
  const readFileSync = vi.fn()
  return { default: { existsSync, readFileSync }, existsSync, readFileSync }
})
vi.mock('@/utils/package.ts', () => ({ readPackageJson: vi.fn() }))

import { existsSync } from 'node:fs'
import { readPackageJson } from '@/utils/package.ts'
import { getLibEntries } from '@/utils/entries.ts'

const mockExists = vi.mocked(existsSync)
const mockPkg = vi.mocked(readPackageJson)
const src = resolve(process.cwd(), 'src')

beforeEach(() => {
  vi.clearAllMocks()
  process.env.AUTO_ENTRIES = '1'
})

afterEach(() => {
  delete process.env.AUTO_ENTRIES
})

describe('getLibEntries', () => {
  it('falls back to src/index.ts when no exports field', () => {
    mockPkg.mockReturnValue({})
    mockExists.mockReturnValue(true)
    expect(getLibEntries()).toEqual({ index: resolve(src, 'index.ts') })
  })

  it('derives index entry from "." export', () => {
    mockPkg.mockReturnValue({ exports: { '.': { import: './dist/index.mjs' } } })
    mockExists.mockReturnValue(true)
    expect(getLibEntries()).toEqual({ index: resolve(src, 'index.ts') })
  })

  it('derives named entry from subpath export', () => {
    mockPkg.mockReturnValue({
      exports: {
        '.': { import: './dist/index.mjs' },
        './vue': { import: './dist/vue.mjs' },
      },
    })
    mockExists.mockReturnValue(true)
    expect(getLibEntries()).toEqual({
      index: resolve(src, 'index.ts'),
      vue: resolve(src, 'vue', 'index.ts'),
    })
  })

  it('skips entries whose src file does not exist', () => {
    mockPkg.mockReturnValue({
      exports: {
        '.': { import: './dist/index.mjs' },
        './missing': { import: './dist/missing.mjs' },
      },
    })
    mockExists.mockReturnValueOnce(true).mockReturnValueOnce(false)
    const entries = getLibEntries()
    expect(entries).toHaveProperty('index')
    expect(entries).not.toHaveProperty('missing')
  })

  it('returns empty object when all entries are missing', () => {
    mockPkg.mockReturnValue({ exports: { '.': { import: './dist/index.mjs' } } })
    mockExists.mockReturnValue(false)
    expect(getLibEntries()).toEqual({})
  })
})
