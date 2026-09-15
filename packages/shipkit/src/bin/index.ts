#!/usr/bin/env node
import { cac } from 'cac'

import { runDeploy, type DeployOptions } from '@/commands/deploy'
import { runInit } from '@/commands/init'
import type { Target } from '@/commands/init'
import { getFormattedVersion } from '@/utils/version'

const cli = cac('shipkit')

cli
  .command('deploy', 'Author changesets and publish local or snapshot builds')
  .option('--commit', 'Commit new changesets')
  .option('--local', 'Publish workspace packages to local Verdaccio registry')
  .option('--package <name>', 'Target a specific package (used with --local)')
  .option('--scope <scope>', 'Filter packages by name prefix, e.g. @munsonlabs/ (used with --local and --snapshot)')
  .option('--snapshot <tag>', 'Publish a snapshot release with the given tag (no changeset consumed)')
  .action((options: DeployOptions) => runDeploy(options))

cli.command('version', 'Print the formatted version derived from git').action(() => {
  console.log(getFormattedVersion())
})

cli.command('init <target>', 'Create vite.config.ts from shipkit template (app | library)').action((target: string) => runInit(target as Target))

cli.help()
cli.parse()
