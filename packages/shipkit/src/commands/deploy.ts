import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { createInterface } from 'node:readline/promises'

const CHG_DIR = '.changeset'

export interface DeployOptions {
  commit?: boolean
  version?: boolean
  publish?: boolean
  beta?: boolean
  local?: boolean
  snapshot?: string
  package?: string
  scope?: string
}

function run(cmd: string, args: string[], cwd?: string) {
  const res = spawnSync(cmd, args, { stdio: 'inherit', cwd })
  if (res.error) throw res.error
  if (res.status !== 0) process.exit(res.status ?? 1)
}

async function askYesNo(question: string): Promise<boolean> {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  const answer = await rl.question(question)
  rl.close()
  return /^[Yy]$/.test(answer)
}

async function commitFlow() {
  run('npx', ['changeset'])

  const newChanges = spawnSync('git', ['ls-files', '--others', '--exclude-standard', CHG_DIR], { encoding: 'utf-8' }).stdout
  const stagedChanges = spawnSync('git', ['diff', '--cached', '--name-only', CHG_DIR], { encoding: 'utf-8' }).stdout

  if ((newChanges + stagedChanges).split('\n').some((f) => f.endsWith('.md'))) {
    console.log('📝 Detected new changeset files:')
    console.log(newChanges + stagedChanges)

    if (await askYesNo('👉 Commit these changesets? [y/N] ')) {
      run('git', ['add', CHG_DIR])
      run('git', ['commit', '-m', 'chore(release): add changeset(s)'])
      console.log('✅ Changesets committed.')
    } else {
      console.log('❌ Commit aborted.')
    }
  } else {
    console.log('✅ No new changeset files to commit.')
  }
}

function requireCI() {
  if (!process.env.GITHUB_ACTIONS) {
    console.error('❌ This command must run in CI (GITHUB_ACTIONS not set).')
    process.exit(1)
  }
}

function getBranch() {
  return process.env.GITHUB_REF_NAME || spawnSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { encoding: 'utf-8' }).stdout?.trim() || ''
}

function versionFlow(beta = false) {
  requireCI()
  const branch = getBranch()

  if ((branch === 'main' || branch === 'master') && !beta) {
    console.log('🚀 Versioning for stable release...')

    if (existsSync(resolve(CHG_DIR, 'pre.json'))) {
      console.log('🔄 Exiting prerelease mode...')
      run('npx', ['changeset', 'pre', 'exit'])
    }

    run('npx', ['changeset', 'version'])

    if (spawnSync('git', ['status', '--porcelain'], { encoding: 'utf-8' }).stdout.trim()) {
      run('npm', ['install', '--package-lock-only'])
      run('git', ['add', '.'])
      run('git', ['commit', '-m', 'chore(release): version bump and changelog [skip ci]'])
      run('git', ['push'])
    } else {
      console.log('✅ No version changes to commit.')
    }
  } else if (branch === 'beta' || beta === true) {
    console.log('🌟 Versioning for beta prerelease...')

    if (!existsSync(resolve(CHG_DIR, 'pre.json'))) {
      console.log('🔄 Entering prerelease mode for beta...')
      run('npx', ['changeset', 'pre', 'enter', 'beta'])
    }

    run('npx', ['changeset', 'version'])
    run('npm', ['install', '--package-lock-only'])
    run('git', ['add', '.'])
    run('git', ['commit', '-m', 'chore(release): beta version bump [skip ci]'])
    run('git', ['push'])
  } else {
    console.log('✅ Not on main or beta — skipping version.')
  }
}

function publishFlow() {
  requireCI()
  const branch = getBranch()

  if (branch === 'main' || branch === 'master') {
    console.log('📦 Publishing stable release...')
    run('npx', ['changeset', 'publish', '--no-git-tag'])
  } else if (branch === 'beta') {
    console.log('📦 Publishing beta release...')
    run('npx', ['changeset', 'publish', '--no-git-tag'])
  } else {
    console.log('✅ Not on main or beta — skipping publish.')
  }
}

function getWorkspaceVersion(name: string): string {
  const result = spawnSync('npm', ['pkg', 'get', 'version', `--workspace=${name}`], { encoding: 'utf-8' })
  const parsed = JSON.parse(result.stdout)
  return typeof parsed === 'string' ? parsed : (Object.values(parsed)[0] as string)
}

function queryWorkspaces(scope?: string): string[] {
  const all = JSON.parse(spawnSync('npm', ['query', '.workspace'], { encoding: 'utf-8' }).stdout) as { name: string; private?: boolean }[]
  return all
    .filter((w) => !w.private)
    .filter((w) => !scope || w.name.startsWith(scope))
    .map((w) => w.name)
}

function publishLocalFlow(pkg?: string, scope?: string) {
  const registry = process.env.VERDACCIO_URL
  if (!registry) {
    console.error('❌ VERDACCIO_URL is not set. Set it to your local Verdaccio registry URL before running --local.')
    process.exit(1)
  }
  const timestamp = Math.floor(Date.now() / 1000)

  const packages = pkg ? [pkg] : queryWorkspaces(scope)

  if (packages.length === 0) {
    console.log('No publishable workspaces found.')
    return
  }

  console.log(`📦 Publishing to ${registry}: ${packages.join(', ')}`)
  for (const name of packages) {
    const original = getWorkspaceVersion(name)
    const localVersion = `${original.split('-')[0]}-local.${timestamp}`
    console.log(`  ${name}: ${original} → ${localVersion}`)
    run('npm', ['version', localVersion, '--no-git-tag-version', `--workspace=${name}`])
    try {
      const res = spawnSync('npm', ['publish', `--workspace=${name}`, '--tag=local', `--registry=${registry}`], { stdio: 'inherit' })
      if (res.error) throw res.error
      if (res.status !== 0) throw new Error(`npm publish failed with status ${res.status}`)
    } finally {
      run('npm', ['version', original, '--no-git-tag-version', `--workspace=${name}`])
    }
  }
}

function publishSnapshotFlow(tag: string, scope?: string) {
  const timestamp = Math.floor(Date.now() / 1000)
  const snapshotPackages = queryWorkspaces(scope)

  if (snapshotPackages.length === 0) {
    console.log('No publishable workspaces found.')
    return
  }

  console.log(`📦 Publishing snapshot tag "${tag}" to npm: ${snapshotPackages.join(', ')}`)
  for (const name of snapshotPackages) {
    const original = getWorkspaceVersion(name)
    const snapshotVersion = `0.0.0-${tag}-${timestamp}`
    console.log(`  ${name}: ${original} → ${snapshotVersion}`)
    run('npm', ['version', snapshotVersion, '--no-git-tag-version', `--workspace=${name}`])
    try {
      const res = spawnSync('npm', ['publish', `--workspace=${name}`, `--tag=${tag}`, '--registry=https://registry.npmjs.org'], { stdio: 'inherit' })
      if (res.error) throw res.error
      if (res.status !== 0) throw new Error(`npm publish failed with status ${res.status}`)
    } finally {
      run('npm', ['version', original, '--no-git-tag-version', `--workspace=${name}`])
    }
  }
}

export async function runDeploy(options: DeployOptions) {
  const { commit, version, publish, beta, local, snapshot, package: pkg, scope } = options

  if (!commit && !version && !publish && !beta && !local && !snapshot) {
    console.log('No action specified. Use --commit, --version, --publish, --beta, --local, or --snapshot <tag>')
    return
  }

  if (commit) await commitFlow()
  if (version) versionFlow(beta)
  if (publish) publishFlow()
  if (local) publishLocalFlow(pkg, scope)
  if (snapshot) publishSnapshotFlow(snapshot, scope)
}
