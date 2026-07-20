import type { PullRequest } from '../types'

type GhIssueSearchItem = {
  id: number
  number: number
  title: string
  html_url: string
  updated_at: string
  created_at: string
  draft?: boolean
  state: string
  pull_request?: { merged_at: string | null }
  labels: { name: string }[]
  repository_url: string
}

type SearchResponse = {
  items: GhIssueSearchItem[]
  message?: string
}

async function searchPRs(
  token: string,
  query: string,
): Promise<GhIssueSearchItem[]> {
  const url = new URL('https://api.github.com/search/issues')
  url.searchParams.set('q', query)
  url.searchParams.set('sort', 'updated')
  url.searchParams.set('order', 'desc')
  url.searchParams.set('per_page', '40')

  const res = await fetch(url, {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
    },
  })

  const data = (await res.json()) as SearchResponse
  if (!res.ok) {
    throw new Error(data.message || `GitHub API error (${res.status})`)
  }
  return data.items ?? []
}

function repoFromUrl(repositoryUrl: string): string {
  // https://api.github.com/repos/owner/repo
  const parts = repositoryUrl.split('/')
  return `${parts.at(-2)}/${parts.at(-1)}`
}

function toPR(item: GhIssueSearchItem, reason: PullRequest['reason']): PullRequest {
  return {
    id: item.id,
    number: item.number,
    title: item.title,
    htmlUrl: item.html_url,
    repoFullName: repoFromUrl(item.repository_url),
    updatedAt: item.updated_at,
    createdAt: item.created_at,
    draft: Boolean(item.draft),
    state: item.state === 'closed' ? 'closed' : 'open',
    merged: Boolean(item.pull_request?.merged_at),
    labels: (item.labels ?? []).map((l) => l.name),
    reason,
  }
}

/** PRs you're review-requested on, mentioned in, or assigned — open + recent activity. */
export async function fetchTaggedPullRequests(
  token: string,
  username: string,
): Promise<PullRequest[]> {
  const user = username.replace(/^@/, '').trim()
  if (!token) throw new Error('Add a GitHub personal access token in Settings.')
  if (!user) throw new Error('Add your GitHub username in Settings.')

  const queries: { q: string; reason: PullRequest['reason'] }[] = [
    {
      q: `is:pr is:open review-requested:${user} archived:false`,
      reason: 'review-requested',
    },
    {
      q: `is:pr is:open mentions:${user} archived:false`,
      reason: 'mentioned',
    },
    {
      q: `is:pr is:open assignee:${user} archived:false`,
      reason: 'assigned',
    },
  ]

  const results = await Promise.all(queries.map((q) => searchPRs(token, q.q)))
  const byId = new Map<number, PullRequest>()

  results.forEach((items, i) => {
    const reason = queries[i].reason
    for (const item of items) {
      if (!item.pull_request) continue
      const existing = byId.get(item.id)
      if (!existing) {
        byId.set(item.id, toPR(item, reason))
      } else if (reason === 'review-requested') {
        // Prefer review-requested as the primary reason
        existing.reason = reason
      }
    }
  })

  return [...byId.values()].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  )
}

export function summarizePRs(prs: PullRequest[]) {
  return {
    open: prs.filter((p) => p.state === 'open' && !p.draft).length,
    drafts: prs.filter((p) => p.draft).length,
    reviewRequested: prs.filter((p) => p.reason === 'review-requested').length,
    mentioned: prs.filter((p) => p.reason === 'mentioned').length,
  }
}
