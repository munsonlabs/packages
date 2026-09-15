import { spawnSync } from 'node:child_process'
import { createInterface } from 'node:readline/promises'

const CHG_DIR = '.changeset'

export interface DeployOptions {
  commit?: boolean
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

// `.npmrc` sets ignore-scripts, so no lifecycle hook can build on publish.
// Build explicitly, or whatever is sitting in dist/ ships.
function buildWorkspaces(packages: string[]) {
  console.log(`🔨 Building ${packages.join(', ')}`)
  run('vp', ['run', ...packages.flatMap((name) => ['--filter', name]), 'build'])
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

  buildWorkspaces(packages)

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

  buildWorkspaces(snapshotPackages)

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
  const { commit, local, snapshot, package: pkg, scope } = options

  if (!commit && !local && !snapshot) {
    console.log('No action specified. Use --commit, --local, or --snapshot <tag>')
    return
  }

  if (commit) await commitFlow()
  if (local) publishLocalFlow(pkg, scope)
  if (snapshot) publishSnapshotFlow(snapshot, scope)
}
