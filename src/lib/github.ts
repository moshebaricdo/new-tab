import type { GitHubNotification, GitHubNotificationReason } from '../types'

const ACTIONABLE_REASONS = new Set<GitHubNotificationReason>([
  'review_requested',
  'mention',
  'assign',
  'team_mention',
  'approval_requested',
])

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

function isActionableReason(reason: string): reason is GitHubNotificationReason {
  return ACTIONABLE_REASONS.has(reason as GitHubNotificationReason)
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

/** Unread, actionable GitHub notifications (reviews, mentions, assignments). */
export async function fetchGithubNotifications(token: string): Promise<GitHubNotification[]> {
  if (!token.trim()) {
    throw new Error('Add a GitHub personal access token in Settings.')
  }

  const url = new URL('https://api.github.com/notifications')
  url.searchParams.set('all', 'false')
  url.searchParams.set('participating', 'false')
  url.searchParams.set('per_page', '50')

  const res = await fetch(url, {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token.trim()}`,
      'X-GitHub-Api-Version': '2022-11-28',
    },
  })

  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { message?: string }
    if (res.status === 401 || res.status === 403) {
      throw new Error(
        data.message ||
          'GitHub rejected the token. Use a classic PAT with the notifications (or repo) scope.',
      )
    }
    throw new Error(data.message || `GitHub API error (${res.status})`)
  }

  const items = (await res.json()) as GhNotification[]

  return items
    .map(toNotification)
    .filter((n): n is GitHubNotification => Boolean(n))
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
}
