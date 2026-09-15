import { readFileSync, readdirSync, realpathSync } from 'node:fs'
import { resolve, extname, join, basename, sep } from 'node:path'

const EXT_LANG: Record<string, string> = {
  '.ts': 'ts',
  '.tsx': 'tsx',
  '.js': 'js',
  '.vue': 'vue',
  '.svelte': 'svelte',
  '.json': 'json',
  '.md': 'md',
  '.css': 'css',
  '.html': 'html',
  '.sh': 'sh',
}

/** Matches `<<< path/to/file` lines (but not `<<<tree`). */
const INCLUDE_RE = /^<<<(?!tree\b)\s+(.+)$/gm

/** Matches `<<<tree path/to/dir [default-file]` lines. */
const TREE_RE = /^<<<tree\s+(\S+)(?:\s+(\S+))?$/gm

/**
 * Matches JSDoc section comments of the form:
 *   /**
 *    * @section Title
 *    * Optional description.
 *    *\/
 */
const SECTION_RE = /\/\*\*\s*\n\s*\*\s*@section\s+(.+?)\n([\s\S]*?)\*\//g

function parseDescription(raw: string): string {
  return raw
    .split('\n')
    .map((l) => l.replace(/^\s*\*\s?/, '').trimEnd())
    .join('\n')
    .trim()
}

function fileToMarkdown(content: string, lang: string): string {
  const sections = [...content.matchAll(SECTION_RE)]

  if (sections.length === 0) {
    return `\`\`\`${lang}\n${content.trimEnd()}\n\`\`\``
  }

  let out = ''

  const preamble = content.slice(0, sections[0]!.index!).trim()
  if (preamble) out += `\`\`\`${lang}\n${preamble}\n\`\`\`\n\n`

  for (let i = 0; i < sections.length; i++) {
    const m = sections[i]!
    const title = m[1]!.trim()
    const description = parseDescription(m[2]!)
    const codeStart = m.index! + m[0]!.length
    const next = sections[i + 1]
    const codeEnd = next ? next.index! : content.length
    const code = content.slice(codeStart, codeEnd).trim()

    out += `## ${title}\n\n`
    if (description) out += `${description}\n\n`
    if (code) out += `\`\`\`${lang}\n${code}\n\`\`\`\n\n`
  }

  return out.trimEnd()
}

const SKIP = new Set(['node_modules', 'dist'])

function walkDir(dir: string, base = dir): string[] {
  const entries = readdirSync(dir, { withFileTypes: true })
  const files: string[] = []
  for (const entry of entries) {
    if (SKIP.has(entry.name)) continue
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...walkDir(full, base))
    } else {
      files.push(full.slice(base.length + 1))
    }
  }
  return files
}

function sortFiles(files: string[]): string[] {
  return [...files].sort((a, b) => {
    const aDepth = a.split('/').length
    const bDepth = b.split('/').length
    if (aDepth !== bDepth) return aDepth - bDepth
    // Within same depth: index files first, then alphabetical
    const aIsIndex = basename(a).startsWith('index')
    const bIsIndex = basename(b).startsWith('index')
    if (aIsIndex && !bIsIndex) return -1
    if (!aIsIndex && bIsIndex) return 1
    return a.localeCompare(b)
  })
}

/**
 * Resolves an include path relative to the repo root and insists it exists with exactly the
 * casing written in the markdown. macOS resolves `components/shorts` to `components/Shorts`
 * and the page looks fine locally; the Linux CI runner does not, and the page shipped with a
 * "Directory not found" comment where the code should be.
 *
 * Nuxt Content catches a throwing hook and drops the page with a warning, which would let the
 * build succeed with the page missing - so the exit code is set as well, to fail the generate.
 */
function fail(message: string): never {
  console.error(`[fileInclude] ${message}`)
  process.exitCode = 1
  throw new Error(message)
}

function resolveInclude(relPath: string): string {
  const rel = relPath.trim()
  const abs = resolve(process.cwd(), '..', rel)
  let real: string
  try {
    real = realpathSync.native(abs)
  } catch {
    return fail(`path not found: ${rel}`)
  }
  if (!real.endsWith(rel.replace(/\//g, sep))) {
    return fail(`path case mismatch: ${rel} is on disk as ${real}`)
  }
  return abs
}

function dirToCodeTree(absDir: string, defaultFile?: string): string {
  const files = sortFiles(walkDir(absDir))

  const resolvedDefault = defaultFile ?? files.find((f) => /^src[/\\]index/.test(f)) ?? files[0] ?? ''

  let out = `::code-tree{default-value="${resolvedDefault}"}\n\n`
  for (const file of files) {
    const lang = EXT_LANG[extname(file)] ?? ''
    try {
      const content = readFileSync(join(absDir, file), 'utf-8').trimEnd()
      out += `\`\`\`${lang} [${file}]\n${content}\n\`\`\`\n\n`
    } catch {
      out += `\`\`\`${lang} [${file}]\n// File not found\n\`\`\`\n\n`
    }
  }
  out += '::'
  return out
}

export function fileIncludeHook(ctx: { file?: { body?: string; id?: string } }) {
  const file = ctx.file
  if (!file) return
  if (!file.body || !file.id?.endsWith('.md')) return

  // Process <<<tree directives first (they produce multi-file code-tree blocks)
  file.body = file.body.replace(TREE_RE, (_, dirPath: string, defaultFile?: string) => dirToCodeTree(resolveInclude(dirPath), defaultFile))

  // Process single-file <<< includes
  file.body = file.body.replace(INCLUDE_RE, (_, filePath: string) => {
    const abs = resolveInclude(filePath)
    return fileToMarkdown(readFileSync(abs, 'utf-8'), EXT_LANG[extname(abs)] ?? '')
  })
}
