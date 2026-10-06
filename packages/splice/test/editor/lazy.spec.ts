import { describe, expect, it } from 'vite-plus/test'

/**
 * The editor entries mustn't pull Mediabunny (about 157 KB gzipped) or the clip pipeline in statically:
 * they load on the first open. The core entry, for its part, must stay framework-free: no Vue, no
 * player. This walks the static imports reachable from each entry, through `.ts` modules and the
 * `<script>` blocks of `.vue` components, and fails if any reaches what it mustn't.
 */
const sources = {
  ...import.meta.glob<string>('../../src/**/*.ts', { query: '?raw', import: 'default', eager: true }),
  ...import.meta.glob<string>('../../src/**/*.vue', { query: '?raw', import: 'default', eager: true }),
}
const files = new Map(Object.entries(sources).map(([path, code]) => [path.replace('../../src', '').replace(/\.ts$/, ''), code]))
const heavy = [/^mediabunny$/, /^hls\.js$/, /^\/splice\/splice$/, /^\/splice\/source$/, /^\/splice\/thumbnails$/, /^\/splice\/check$/, /^\/index$/]
/** The only packages the editor entry may reach statically: Vue, the player, and sigil for the icons. */
const editorPackages = ['vue', '@munsonlabs/video-player', '@munsonlabs/sigil', '@munsonlabs/sigil/vue']

/** A `.vue` file's script blocks; a `.ts` file whole. */
function readScript(code: string): string {
  const blocks = [...code.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map((match) => match[1])
  return blocks.length ? blocks.join('\n') : code
}

function readStaticImports(code: string): string[] {
  return [...readScript(code).matchAll(/^(?:import|export)\s+(?!type\b)(?:[^'"]*?from\s+)?['"]([^'"]+)['"]/gm)].map((match) => match[1])
}

/** A relative specifier against the importing module, or an `@/` one (the `src` alias) from the root. */
function resolveFrom(from: string, specifier: string): string {
  const isAlias = specifier.startsWith('@/')
  const parts = isAlias ? [''] : from.split('/').slice(0, -1)
  for (const part of (isAlias ? specifier.slice(2) : specifier).split('/')) {
    if (part === '..') parts.pop()
    else if (part !== '.') parts.push(part)
  }
  const path = parts.join('/')
  return files.has(path) ? path : `${path}/index`
}

function walk(module: string, seen = new Set<string>()): Set<string> {
  for (const specifier of readStaticImports(files.get(module) ?? '')) {
    if (!/^(\.|@\/)/.test(specifier)) {
      seen.add(specifier)
      continue
    }
    const target = resolveFrom(module, specifier)
    if (seen.has(target)) continue
    seen.add(target)
    walk(target, seen)
  }
  return seen
}

const getPackages = (reached: string[]) => reached.filter((name) => !/^[./]/.test(name))

describe('the editor entries stay light', () => {
  for (const entry of ['/vue', '/elements/index']) {
    it(`${entry}.ts reaches no heavy module statically`, () => {
      const reached = [...walk(entry)]
      expect(reached.filter((name) => heavy.some((pattern) => pattern.test(name)))).toEqual([])
      expect(reached).toContain('/editor/SpliceEditor.vue')
      expect(reached).toContain('/editor/RangeTimeline.vue')
      expect(getPackages(reached).filter((name) => !editorPackages.includes(name) && !name.endsWith('.css'))).toEqual([])
    })
  }

  it('loads the core through one dynamic import', () => {
    expect(files.get('/editor/features/loadCore')).toMatch(/import\('@\/index'\)/)
    expect([...walk('/vue')]).toContain('/editor/features/loadCore')
  })

  it('would notice the core being imported statically, from a component too', () => {
    files.set('/probe.vue', '<script setup lang="ts">\nimport { createSplice } from \'@/splice/splice\'\n</script>\n<template><p /></template>\n')
    files.set('/probe2', "import Probe from './probe.vue'\n")
    expect([...walk('/probe2')]).toContain('mediabunny')
    files.delete('/probe.vue')
    files.delete('/probe2')
  })
})

describe('the core entry stays framework-free', () => {
  it('index.ts reaches neither Vue nor the player nor the editor', () => {
    const reached = [...walk('/index')]
    expect(reached).toContain('mediabunny')
    expect(getPackages(reached).filter((name) => /^vue$|^@munsonlabs\/(video-player|sigil)/.test(name))).toEqual([])
    expect(reached.filter((name) => name.startsWith('/editor/') || name.endsWith('.vue'))).toEqual([])
  })
})
