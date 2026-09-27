# Changesets

Every change that affects a published package needs a changeset: a small file in this folder naming
the packages it touches, the bump level, and the line that will appear in their changelogs. Releases
are driven by [Changesets](https://github.com/changesets/changesets) through
[`changesets/action`](https://github.com/changesets/action).

## Writing one

```bash
npm run publish   # shipkit deploy --commit — creates & commits a changeset
```

Commit it alongside the code, so a reviewer sees the bump level and the changelog entry in the same
diff as the change itself.

One changeset per package wherever the change is separable. A single file may name several packages,
but its summary is copied verbatim into every changelog it touches, so a shared entry leaves each
package's consumers reading about packages they do not use. These packages are independent and
release on their own cadence, so they usually want their own entries.

Not everything needs one. Changes to the docs site, the demos, tests or build config ship with
whatever release comes next, because nothing published has changed.

## Releasing

1. Merge your branch, changeset included, into `main`.
2. [`release.yml`](../.github/workflows/release.yml) runs on the merge. It builds, checks and tests,
   then opens or refreshes a **Version Packages** PR holding the version bumps, changelog entries and
   lockfile update for every pending changeset. Keep merging features; that PR is regenerated each
   time and always shows exactly what the next release contains.
3. Merge the Version Packages PR when you want to release. The workflow runs again, finds no pending
   changesets, publishes every bumped package to npm and tags each one
   (`@munsonlabs/video-player@1.3.0`), then deploys the docs site to production on Cloudflare Pages,
   whose published-package demo loads the workspace version from a CDN.

## Previews

[`branch.yml`](../.github/workflows/branch.yml) runs on every branch push other than `main`. It runs
CI and deploys a preview of the docs to
`https://<branch>.<project>.pages.dev`. Cloudflare lowercases the branch name, turns anything other
than letters and digits into hyphens and cuts it at 28 characters, so `feat/dark-mode` becomes
`feat-dark-mode`.

| Branch    | Docs                           | Packages                                      |
| --------- | ------------------------------ | --------------------------------------------- |
| `main`    | Production, after a release    | npm `latest`, through the Version Packages PR |
| `beta`    | `beta.<project>.pages.dev`     | npm `beta`, from pending changesets           |
| any other | `<branch>.<project>.pages.dev` | [pkg.pr.new](https://pkg.pr.new), per commit  |

### pkg.pr.new

Each push builds every package in `packages/` and publishes that commit's build of each to
pkg.pr.new, without touching npm, so a new package is picked up without editing the workflow. Every
package is published on every push, changed or not, so one ref always gives a matching set. Each URL
installs one package:

```bash
npm i https://pkg.pr.new/munsonlabs/packages/@munsonlabs/sigil@<ref>
```

`<ref>` is the short commit SHA, which never moves, or the latest build on a PR number or branch. A
branch is written exactly as it is named, slash included (`@feat/dark-mode`), not in the hyphenated
form Cloudflare uses for docs previews. The job log prints the install lines, and
[pkg.pr.new/~/munsonlabs/packages](https://pkg.pr.new/~/munsonlabs/packages) lists every build.
Builds cannot be deleted, so nothing secret should ever end up in a package's `dist`.

The URL is saved in the consuming project's `package.json` as the version. Switch it back to a
released version (`npm i @munsonlabs/sigil@latest`, or `@beta`) before that project merges into its
own `main`. A CI step there stops it slipping through:

```bash
! grep -q 'pkg.pr.new' package.json
```

To try a build in the browser without installing it, [esm.sh](https://esm.sh) serves pkg.pr.new
builds as ES modules under `/pr/`, subpath exports included. It only resolves commit SHAs, not
branch names:

```js
import 'https://esm.sh/pr/munsonlabs/packages/@munsonlabs/video-player@<sha>/element'
```

### beta

Merge features into `beta` to ship them together ahead of a release. Each push there runs
`changeset version --snapshot beta` and publishes the bumped packages under the `beta` dist-tag,
e.g. `@munsonlabs/sigil@0.0.4-beta-20260927143012`, installable as `npm i @munsonlabs/sigil@beta`
(`npm view <package>@<version> gitHead` gives the commit it was built from). Only packages with a pending changeset are published, and the bump is
never committed, so the changesets stay on `beta` and become the real release when `beta` merges into
`main`. After a hotfix on `main`, merge `main` back into `beta` so released changesets are not
published again.

To publish any branch under a one-off dist-tag instead, `shipkit deploy --snapshot <tag>` publishes
every package as `0.0.0-<tag>-<timestamp>` and leaves changesets and git untouched.

## What the workflow needs

- `NPM_TOKEN` — an npm automation token with publish access to the `@munsonlabs` scope, stored as a
  repository secret.
- Permission to open the Version Packages PR. Either enable _Settings → Actions → General → Allow
  GitHub Actions to create and approve pull requests_, or store a personal access token (repo scope)
  as the `CHANGESETS_TOKEN` secret. Prefer the token: PRs opened with the default `GITHUB_TOKEN` do
  not trigger CI on themselves.
- For the docs: a Cloudflare Pages project (`vp dlx wrangler pages project create <project>
--production-branch=main`), plus these under _Settings → Secrets and variables → Actions_:
  - **Secrets** tab: `CLOUDFLARE_API_TOKEN`, an account token with only _Cloudflare Pages: Edit_ on
    the entire account, and `CLOUDFLARE_ACCOUNT_ID`.
  - **Variables** tab, as repository variables: `CLOUDFLARE_PROJECT_NAME` and `DOCS_URL`, the
    production URL as `vp dlx wrangler pages project list` shows it. The workflows read these through
    `vars`, so the deploy fails with "Missing Pages project name" if they are added as secrets.
- For branch packages: the [pkg.pr.new](https://github.com/apps/pkg-pr-new) GitHub app, installed on
  the munsonlabs organisation for this repository.
- Optionally the [changeset-bot](https://github.com/apps/changeset-bot) GitHub app, so PRs without a
  changeset get a reminder comment.
