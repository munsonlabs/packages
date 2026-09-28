import { execFileSync, spawnSync } from 'node:child_process'
import { readdirSync } from 'node:fs'

const EXAMPLES_DIR = 'apps/examples'

/**
 * The packages this branch changed since it left main, named by their directory under packages/.
 * Diffing against the merge base rather than main itself keeps whatever landed on main since the
 * branch was cut from counting as this branch's change.
 */
function changedPackages() {
  const base = execFileSync('git', ['merge-base', 'origin/main', 'HEAD'], { encoding: 'utf8' }).trim()
  const files = execFileSync('git', ['diff', '--name-only', base, 'HEAD', '--', 'packages'], { encoding: 'utf8' })
  const names = files
    .split('\n')
    .filter(Boolean)
    .map((file) => file.split('/')[1])
  return [...new Set(names)]
}

/**
 * The examples that belong to the given packages. An example belongs to a package by name:
 * apps/examples/video-player-vue and apps/examples/video-player-element go with packages/video-player.
 */
function examplesFor(packages) {
  const examples = readdirSync(EXAMPLES_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
  return examples.filter((name) => packages.some((pkg) => name.startsWith(`${pkg}-`)))
}

/**
 * pkg.pr.new's flags for the examples to attach. `--template` takes a single glob, so several
 * examples are joined into one brace pattern. With none, `--no-template` also drops pkg.pr.new's
 * generated default, leaving the comment with just the install commands.
 */
function templateArgs(examples) {
  if (!examples.length) return ['--no-template']
  const glob = examples.length === 1 ? examples[0] : `{${examples.join(',')}}`
  return ['--template', `./${EXAMPLES_DIR}/${glob}`, '--only-templates']
}

const examples = examplesFor(changedPackages())
console.log(examples.length ? `Attaching examples: ${examples.join(', ')}` : 'No examples for the changed packages.')

const { status } = spawnSync('vp', ['dlx', 'pkg-pr-new', 'publish', './packages/*', ...templateArgs(examples)], { stdio: 'inherit' })
process.exit(status ?? 1)
