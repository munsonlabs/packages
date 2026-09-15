import { execSync } from 'node:child_process'

export function getVersionFromGit(): string {
  try {
    const branchName = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim()

    if (branchName.startsWith('feature/')) {
      return branchName.replace('feature/', 'feature_')
    }

    const gitDescribeCommand =
      'git describe --tags --dirty --exact 2>/dev/null || echo $(git describe --tags --dirty --abbrev=0 2>/dev/null || echo 0.0.0)-dev'
    return execSync(gitDescribeCommand, { encoding: 'utf-8' }).trim().replace(/^v/, '')
  } catch {
    return '0.0.0'
  }
}

export function getVersion(): string {
  try {
    const isInWorkTree = execSync('git rev-parse --is-inside-work-tree 2>/dev/null', { encoding: 'utf-8' }).trim() === 'true'
    return isInWorkTree ? getVersionFromGit() : '0.0.0'
  } catch {
    return '0.0.0'
  }
}

export function getFormattedVersion(): string {
  return getVersion().replace(/-/g, '_')
}
