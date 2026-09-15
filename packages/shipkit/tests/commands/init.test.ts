import { describe, it, expect, vi, beforeEach } from 'vite-plus/test'

vi.mock('node:fs', () => {
  const existsSync = vi.fn()
  const writeFileSync = vi.fn()
  return { default: { existsSync, writeFileSync }, existsSync, writeFileSync }
})

import { existsSync, writeFileSync } from 'node:fs'
import { runInit } from '@/commands/init.ts'

const mockExists = vi.mocked(existsSync)

beforeEach(() => vi.clearAllMocks())
const mockWrite = vi.mocked(writeFileSync)

describe('runInit', () => {
  it('writes a library vite config referencing vue.config', () => {
    mockExists.mockReturnValue(false)
    runInit('library')
    expect(mockWrite).toHaveBeenCalledOnce()
    expect(mockWrite.mock.calls[0][1]).toContain('vue.config')
  })

  it('writes an app vite config referencing vue.config', () => {
    mockExists.mockReturnValue(false)
    runInit('app')
    expect(mockWrite).toHaveBeenCalledOnce()
    expect(mockWrite.mock.calls[0][1]).toContain('vue.config')
  })

  it('writes to vite.config.ts in cwd', () => {
    mockExists.mockReturnValue(false)
    runInit('app')
    expect(String(mockWrite.mock.calls[0][0])).toMatch(/vite\.config\.ts$/)
  })

  it('exits with code 1 if vite.config.ts already exists', () => {
    mockExists.mockReturnValue(true)
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('process.exit')
    }) as any)
    expect(() => runInit('app')).toThrow('process.exit')
    expect(exitSpy).toHaveBeenCalledWith(1)
    expect(mockWrite).not.toHaveBeenCalled()
  })
})
