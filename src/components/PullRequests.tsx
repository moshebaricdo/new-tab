import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchGithubNotifications } from '../lib/github'
import { useAutoRefresh } from '../lib/useAutoRefresh'
import { formatRelative } from '../lib/time'
import type { GitHubNotification, GitHubNotificationReason, Settings } from '../types'
import { ExternalLinkIcon, GitIssueIcon, GitPRIcon, RefreshIcon } from './Icons'

type Props = {
  settings: Settings
  onOpenSettings: () => void
}

const reasonLabel: Record<GitHubNotificationReason, string> = {
  review_requested: 'Review requested',
  mention: 'Mentioned',
  assign: 'Assigned',
  team_mention: 'Team mentioned',
  approval_requested: 'Approval requested',
}

export function PullRequests({ settings, onOpenSettings }: Props) {
  const [items, setItems] = useState<GitHubNotification[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fadeTop, setFadeTop] = useState(false)
  const [fadeBottom, setFadeBottom] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const updateFades = useCallback(() => {
    const el = scrollRef.current
    if (!el) {
      setFadeTop(false)
      setFadeBottom(false)
      return
    }
    const { scrollTop, scrollHeight, clientHeight } = el
    const canScroll = scrollHeight > clientHeight + 1
    setFadeTop(canScroll && scrollTop > 2)
    setFadeBottom(canScroll && scrollTop + clientHeight < scrollHeight - 2)
  }, [])

  const load = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!settings.githubToken) {
        setItems([])
        setError(null)
        return
      }

      if (!opts?.silent) setLoading(true)
      setError(null)
      try {
        const data = await fetchGithubNotifications(settings.githubToken)
        setItems(data)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load notifications')
        if (!opts?.silent) setItems([])
      } finally {
        if (!opts?.silent) setLoading(false)
      }
    },
    [settings.githubToken],
  )

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    updateFades()
    const el = scrollRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => updateFades())
    ro.observe(el)
    return () => ro.disconnect()
  }, [items, loading, error, updateFades])

  const configured = Boolean(settings.githubToken.trim())
  useAutoRefresh(() => load({ silent: true }), configured)

  const listContent = !configured ? (
    <div className="empty-state">
      <p>Add a GitHub token in Settings to see your review queue.</p>
      <button type="button" className="ghost-btn" onClick={onOpenSettings}>
        Open settings
      </button>
    </div>
  ) : error ? (
    <div className="error-state">
      <p>{error}</p>
      <button type="button" className="ghost-btn" onClick={() => void load()}>
        Try again
      </button>
    </div>
  ) : loading && items.length === 0 ? (
    <div className="empty-state">
      <p>Loading notifications…</p>
    </div>
  ) : items.length === 0 ? (
    <div className="empty-state">
      <p>No open review requests, mentions, or assignments. Nice queue.</p>
    </div>
  ) : (
    items.map((item) => {
      const isPR = item.subjectType === 'PullRequest'
      return (
        <a key={item.id} className="list-row" href={item.htmlUrl}>
          <span className="list-row-icon">
            {isPR ? <GitPRIcon /> : <GitIssueIcon />}
          </span>
          <div className="list-row-body">
            <p className="list-row-title">{item.title}</p>
            <p className="list-row-meta">
              {item.repoFullName}
              {item.number != null ? ` #${item.number}` : ''}
              {' · '}
              Updated {formatRelative(item.updatedAt)}
            </p>
            <div className="list-row-tags">
              <span className="tag reason">{reasonLabel[item.reason]}</span>
              {!isPR && item.subjectType !== 'Issue' ? (
                <span className="tag">{item.subjectType}</span>
              ) : null}
            </div>
          </div>
          <span className="list-row-action">
            <ExternalLinkIcon />
          </span>
        </a>
      )
    })
  )

  return (
    <section className="pr-section">
      <div className="section-head">
        <h2 className="section-title">Github Activity</h2>
        <button
          type="button"
          className="ghost-btn"
          onClick={() => void load()}
          disabled={loading || !configured}
        >
          <RefreshIcon className={loading ? 'spin' : undefined} />
          Refresh
        </button>
      </div>

      <div className="pr-panel-shell">
        <div className={`pr-fade pr-fade-top${fadeTop ? ' is-visible' : ''}`} aria-hidden />
        <div className="panel pr-panel" ref={scrollRef} onScroll={updateFades}>
          {listContent}
        </div>
        <div className={`pr-fade pr-fade-bottom${fadeBottom ? ' is-visible' : ''}`} aria-hidden />
      </div>
    </section>
  )
}
