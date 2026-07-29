import type { GitHubNotification, GitHubNotificationReason } from '../types'

const ACTIONABLE_REASONS = new Set<GitHubNotificationReason>([
  'review_requested',
  'mention',
  'assign',
  'team_mention',
  'approval_requested',
])

/** How far back to keep recently-read notification activity. */
const NOTIFICATION_SINCE_DAYS = 14

type GhNotificationSubject = {
  title: string
  url: string | null
  latest_comment_url: string | null
  type: string
}

type GhNotification = {
  id: string
  unread: boolean
  reason: string
  updated_at: string
  subject: GhNotificationSubject
  repository: {
    full_name: string
    html_url: string
  }
}

type GhIssueSearchItem = {
  id: number
  number: number
  title: string
  html_url: string
  updated_at: string
  pull_request?: { url: string }
  repository_url: string
}

type SearchResponse = {
  items?: GhIssueSearchItem[]
  message?: string
}

function isActionableReason(reason: string): reason is GitHubNotificationReason {
  return ACTIONABLE_REASONS.has(reason as GitHubNotificationReason)
}

function authHeaders(token: string): HeadersInit {
  return {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${token.trim()}`,
    'X-GitHub-Api-Version': '2022-11-28',
  }
}

/** Convert an API subject URL to a browsable github.com URL + optional number. */
function subjectLink(
  apiUrl: string | null | undefined,
  repoHtmlUrl: string,
): { htmlUrl: string; number?: number } {
  if (!apiUrl) {
    return { htmlUrl: repoHtmlUrl }
  }

  try {
    const url = new URL(apiUrl)
    // https://api.github.com/repos/owner/repo/pulls/123
    // https://api.github.com/repos/owner/repo/issues/123
    const match = url.pathname.match(
      /^\/repos\/([^/]+\/[^/]+)\/(pulls|issues|commits|releases)\/([^/]+)/,
    )
    if (!match) {
      return { htmlUrl: repoHtmlUrl }
    }

    const [, repo, kind, id] = match
    if (kind === 'pulls') {
      const number = Number(id)
      return {
        htmlUrl: `https://github.com/${repo}/pull/${id}`,
        number: Number.isFinite(number) ? number : undefined,
      }
    }
    if (kind === 'issues') {
      const number = Number(id)
      return {
        htmlUrl: `https://github.com/${repo}/issues/${id}`,
        number: Number.isFinite(number) ? number : undefined,
      }
    }
    if (kind === 'commits') {
      return { htmlUrl: `https://github.com/${repo}/commit/${id}` }
    }
    if (kind === 'releases') {
      return { htmlUrl: `https://github.com/${repo}/releases/tag/${id}` }
    }
  } catch {
    // fall through
  }

  return { htmlUrl: repoHtmlUrl }
}

function repoFromApiUrl(repositoryUrl: string): string {
  const parts = repositoryUrl.split('/')
  return `${parts.at(-2)}/${parts.at(-1)}`
}

function dedupeKey(repoFullName: string, number?: number, fallbackId?: string): string {
  if (number != null) return `${repoFullName}#${number}`
  return fallbackId ?? repoFullName
}

function toNotification(item: GhNotification): GitHubNotification | null {
  if (!isActionableReason(item.reason)) return null

  const apiUrl = item.subject.url || item.subject.latest_comment_url
  const { htmlUrl, number } = subjectLink(apiUrl, item.repository.html_url)

  return {
    id: item.id,
    title: item.subject.title || '(No title)',
    htmlUrl,
    repoFullName: item.repository.full_name,
    updatedAt: item.updated_at,
    unread: item.unread,
    reason: item.reason,
    subjectType: item.subject.type || 'Unknown',
    number,
  }
}

function searchItemToNotification(
  item: GhIssueSearchItem,
  reason: GitHubNotificationReason,
): GitHubNotification {
  const repoFullName = repoFromApiUrl(item.repository_url)
  return {
    id: `search-${item.id}`,
    title: item.title || '(No title)',
    htmlUrl: item.html_url,
    repoFullName,
    updatedAt: item.updated_at,
    unread: true,
    reason,
    subjectType: item.pull_request ? 'PullRequest' : 'Issue',
    number: item.number,
  }
}

async function githubFetch(url: string, token: string): Promise<Response> {
  return fetch(url, {
    headers: authHeaders(token),
    // Avoid browser HTTP cache + automatic If-Modified-Since/ETag revalidation,
    // which can surface a 304 (empty body) or a stale 200 for this endpoint.
    cache: 'no-store',
  })
}

async function throwGitHubError(res: Response): Promise<never> {
  const data = (await res.json().catch(() => ({}))) as { message?: string }
  if (res.status === 401 || res.status === 403) {
    throw new Error(
      data.message ||
        'GitHub rejected the token. Use a classic PAT with the notifications and repo scopes.',
    )
  }
  throw new Error(data.message || `GitHub API error (${res.status})`)
}

/**
 * Open PRs where you're still personally review-requested / mentioned / assigned.
 * These stay until the request is cleared — unlike unread notifications, which
 * disappear as soon as you open the thread on github.com.
 */
async function fetchOpenActionablePrs(token: string): Promise<GitHubNotification[]> {
  const queries: { q: string; reason: GitHubNotificationReason }[] = [
    {
      q: 'is:pr is:open review-requested:@me archived:false',
      reason: 'review_requested',
    },
    {
      q: 'is:pr is:open mentions:@me archived:false',
      reason: 'mention',
    },
    {
      q: 'is:pr is:open assignee:@me archived:false',
      reason: 'assign',
    },
  ]

  const results = await Promise.all(
    queries.map(async ({ q, reason }) => {
      const url = new URL('https://api.github.com/search/issues')
      url.searchParams.set('q', q)
      url.searchParams.set('sort', 'updated')
      url.searchParams.set('order', 'desc')
      url.searchParams.set('per_page', '40')

      const res = await githubFetch(url.toString(), token)
      if (!res.ok) await throwGitHubError(res)
      const data = (await res.json()) as SearchResponse
      return (data.items ?? []).map((item) => searchItemToNotification(item, reason))
    }),
  )

  return results.flat()
}

/**
 * Recent actionable notifications (including read). Covers team review requests
 * and inbox activity that issue search often misses.
 */
async function fetchRecentActionableNotifications(
  token: string,
): Promise<GitHubNotification[]> {
  const since = new Date()
  since.setDate(since.getDate() - NOTIFICATION_SINCE_DAYS)

  const url = new URL('https://api.github.com/notifications')
  url.searchParams.set('all', 'true')
  url.searchParams.set('participating', 'true')
  url.searchParams.set('per_page', '50')
  url.searchParams.set('since', since.toISOString())

  const res = await githubFetch(url.toString(), token)
  // 304 can still appear if something upstream forces conditional requests.
  if (res.status === 304) return []
  if (!res.ok) await throwGitHubError(res)

  const items = (await res.json()) as GhNotification[]
  return items.map(toNotification).filter((n): n is GitHubNotification => Boolean(n))
}

function mergeActivity(items: GitHubNotification[]): GitHubNotification[] {
  const byKey = new Map<string, GitHubNotification>()

  for (const item of items) {
    const key = dedupeKey(item.repoFullName, item.number, item.id)
    const existing = byKey.get(key)
    if (!existing) {
      byKey.set(key, item)
      continue
    }

    // Prefer the more recently updated row; keep unread if either is unread.
    const newer =
      new Date(item.updatedAt).getTime() >= new Date(existing.updatedAt).getTime()
        ? item
        : existing
    const older = newer === item ? existing : item
    byKey.set(key, {
      ...newer,
      unread: newer.unread || older.unread,
      // Prefer explicit review_requested over softer reasons when merging.
      reason:
        newer.reason === 'review_requested' || older.reason === 'review_requested'
          ? 'review_requested'
          : newer.reason,
    })
  }

  return [...byKey.values()].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  )
}

/**
 * Review queue + recent actionable inbox activity.
 * Combines open review-requested/mentioned/assigned PRs with recent notifications
 * (including team review requests) so the feed doesn't go stale just because you
 * opened threads on github.com.
 */
export async function fetchGithubNotifications(token: string): Promise<GitHubNotification[]> {
  if (!token.trim()) {
    throw new Error('Add a GitHub personal access token in Settings.')
  }

  const settled = await Promise.allSettled([
    fetchOpenActionablePrs(token),
    fetchRecentActionableNotifications(token),
  ])

  const prs = settled[0].status === 'fulfilled' ? settled[0].value : []
  const notifications = settled[1].status === 'fulfilled' ? settled[1].value : []

  if (settled.every((r) => r.status === 'rejected')) {
    const first = settled.find((r): r is PromiseRejectedResult => r.status === 'rejected')
    const err = first?.reason
    throw err instanceof Error ? err : new Error('Failed to load GitHub activity')
  }

  return mergeActivity([...prs, ...notifications])
}
