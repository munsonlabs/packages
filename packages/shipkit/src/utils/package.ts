import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

export function readPackageJson(): any {
  const pkgPath = resolve(process.cwd(), 'package.json')
  if (!existsSync(pkgPath)) return {}
  return JSON.parse(readFileSync(pkgPath, 'utf-8'))
}

export function getPackageBase(): string {
  const name: string = readPackageJson().name ?? ''
  const key = name
    .replace(/^@/, '')
    .replace(/[/\-.]/g, '_')
    .toUpperCase()
  return process.env[`VITE_BASE_${key}`] ?? '/'
}
