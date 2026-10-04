import { describe, expect, it } from 'vite-plus/test'

/**
 * The picker entries must not pull Mediabunny (about 157 KB gzipped) or the clip pipeline in
 * statically: they load on the first open. The core entry, for its part, must stay framework-free:
 * no Vue, no player. This walks the static imports reachable from each entry, through `.ts` modules
 * and the `<script>` blocks of `.vue` components, and fails if any reaches what it must not.
 */
const sources = {
  ...import.meta.glob<string>('../../../src/**/*.ts', { query: '?raw', import: 'default', eager: true }),
  ...import.meta.glob<string>('../../../src/**/*.vue', { query: '?raw', import: 'default', eager: true }),
}
const files = new Map(Object.entries(sources).map(([path, code]) => [path.replace('../../../src', '').replace(/\.ts$/, ''), code]))
const heavy = [
  /^mediabunny$/,
  /^hls\.js$/,
  /^dashjs$/,
  /^\/clip\/clip$/,
  /^\/clip\/support$/,
  /^\/clip\/storyboard$/,
  /^\/sources\/source$/,
  /^\/index$/,
  /^\/render\/endcard$/,
  /^\/captions\/load$/,
]
/**
 * The only packages the picker entries may reach statically: Vue and the player (the picker's
 * peers) and sigil's Vue component for the close icon.
 */
const pickerPackages = ['vue', '@munsonlabs/video-player', '@munsonlabs/sigil/vue']

/** A `.vue` file's script blocks; a `.ts` file whole. */
function script(code: string): string {
  const blocks = [...code.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map((match) => match[1])
  return blocks.length ? blocks.join('\n') : code
}

function staticImports(code: string): string[] {
  return [...script(code).matchAll(/^(?:import|export)\s+(?!type\b)(?:[^'"]*?from\s+)?['"]([^'"]+)['"]/gm)].map((match) => match[1])
}

/** A relative specifier against the importing module, or an `@/` one (the `src` alias) from the root. */
function resolveFrom(from: string, specifier: string): string {
  const alias = specifier.startsWith('@/')
  const parts = alias ? [''] : from.split('/').slice(0, -1)
  specifier = alias ? specifier.slice(2) : specifier
  for (const part of specifier.split('/')) {
    if (part === '..') {
      parts.pop()
    } else if (part !== '.') {
      parts.push(part)
    }
  }
  const path = parts.join('/')
  return files.has(path) ? path : `${path}/index`
}

function walk(module: string, seen = new Set<string>()): Set<string> {
  for (const specifier of staticImports(files.get(module) ?? '')) {
    if (!/^(\.|@\/)/.test(specifier) || specifier.endsWith('.json')) {
      seen.add(specifier)
      continue
    }
    const target = resolveFrom(module, specifier)
    if (!seen.has(target)) {
      seen.add(target)
      walk(target, seen)
    }
  }
  return seen
}

const packagesOf = (reached: string[]) => reached.filter((name) => !/^[./]/.test(name))

describe('picker entries stay light', () => {
  for (const entry of ['/elements/index', '/vue']) {
    it(`${entry}.ts reaches no heavy module statically`, () => {
      const reached = [...walk(entry)]
      expect(reached.filter((name) => heavy.some((pattern) => pattern.test(name)))).toEqual([])
      expect(reached).toContain('/ui/picker/ReelPicker.vue')
      expect(reached).toContain('/ui/picker/RangeTimeline.vue')
      expect(packagesOf(reached).filter((name) => !pickerPackages.includes(name))).toEqual([])
    })
  }

  it('loads the core through one dynamic import', () => {
    expect(files.get('/ui/picker/features/core')).toMatch(/import\('@\/index'\)/)
    expect([...walk('/elements/index')]).toContain('/ui/picker/features/core')
  })

  it('would notice the core being imported statically, from a component too', () => {
    files.set('/probe', "import { createClip } from '@/clip/clip'\n")
    expect([...walk('/probe')]).toContain('mediabunny')
    files.set('/probe.vue', '<script setup lang="ts">\nimport { canClip } from \'./clip/support\'\n</script>\n<template><p /></template>\n')
    files.set('/probe2', "import Probe from './probe.vue'\n")
    expect([...walk('/probe2')]).toContain('mediabunny')
    files.delete('/probe')
    files.delete('/probe.vue')
    files.delete('/probe2')
  })
})

describe('the core entry stays framework-free', () => {
  it('index.ts reaches neither Vue nor the player nor the picker', () => {
    const reached = [...walk('/index')]
    expect(reached).toContain('mediabunny')
    expect(packagesOf(reached).filter((name) => /^vue$|^@munsonlabs\/(video-player|sigil)/.test(name))).toEqual([])
    expect(reached.filter((name) => /^\/(ui|registries)\//.test(name) || name.endsWith('.vue'))).toEqual([])
  })
})
