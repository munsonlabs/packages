const { CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID, PROJECT, BRANCH } = process.env

const api = `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/pages/projects/${PROJECT}/deployments`

/**
 * Calls the Cloudflare API and returns the parsed body, throwing with Cloudflare's own error
 * messages when the request is rejected, so a bad token or project name fails the job loudly
 * instead of looking like a branch with nothing to prune.
 */
async function request(url, method = 'GET') {
  const response = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}` },
  })
  const body = await response.json()

  if (!body.success) {
    const messages = body.errors.map((error) => error.message).join('; ')
    throw new Error(`${method} ${url} failed: ${messages}`)
  }

  return body
}

/**
 * Collects every preview deployment made from the given branch, page by page, before anything
 * is deleted: deleting while paging would shift later pages and skip deployments. Production
 * deployments are never listed, so the live site cannot be touched.
 */
async function previewsFor(branch) {
  const matches = []

  for (let page = 1; ; page++) {
    const { result, result_info } = await request(`${api}?env=preview&page=${page}&per_page=25`)

    for (const deployment of result) {
      if (deployment.deployment_trigger?.metadata?.branch === branch) {
        matches.push(deployment)
      }
    }

    if (result.length === 0 || page >= result_info.total_pages) {
      return matches
    }
  }
}

const deployments = await previewsFor(BRANCH)
console.log(`Found ${deployments.length} preview deployment(s) for ${BRANCH}.`)

for (const deployment of deployments) {
  // force: the branch's latest deployment holds its alias, which Cloudflare otherwise refuses to delete.
  await request(`${api}/${deployment.id}?force=true`, 'DELETE')
  console.log(`Deleted ${deployment.id} (${deployment.url})`)
}
