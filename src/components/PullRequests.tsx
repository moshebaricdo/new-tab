import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchTaggedPullRequests } from '../lib/github'
import { useAutoRefresh } from '../lib/useAutoRefresh'
import { formatRelative } from '../lib/time'
import type { PullRequest, Settings } from '../types'
import { ExternalLinkIcon, GitPRIcon, RefreshIcon } from './Icons'

type Props = {
  settings: Settings
  onOpenSettings: () => void
}

const reasonLabel: Record<PullRequest['reason'], string> = {
  'review-requested': 'Review requested',
  mentioned: 'Mentioned',
  assigned: 'Assigned',
}

export function PullRequests({ settings, onOpenSettings }: Props) {
  const [prs, setPrs] = useState<PullRequest[]>([])
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

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    if (!settings.githubToken || !settings.githubUsername) {
      setPrs([])
      setError(null)
      return
    }

    if (!opts?.silent) setLoading(true)
    setError(null)
    try {
      const data = await fetchTaggedPullRequests(settings.githubToken, settings.githubUsername)
      setPrs(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load pull requests')
      if (!opts?.silent) setPrs([])
    } finally {
      if (!opts?.silent) setLoading(false)
    }
  }, [settings.githubToken, settings.githubUsername])

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
  }, [prs, loading, error, updateFades])

  const configured = Boolean(settings.githubToken && settings.githubUsername)
  useAutoRefresh(() => load({ silent: true }), configured)

  const listContent = !configured ? (
    <div className="empty-state">
      <p>Connect GitHub to see PRs where you’re a reviewer, assignee, or mentioned.</p>
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
  ) : loading && prs.length === 0 ? (
    <div className="empty-state">
      <p>Loading pull requests…</p>
    </div>
  ) : prs.length === 0 ? (
    <div className="empty-state">
      <p>No open PRs tagging you right now. Nice inbox.</p>
    </div>
  ) : (
    prs.map((pr) => (
      <a key={pr.id} className="list-row" href={pr.htmlUrl}>
        <span className={`list-row-icon${pr.draft ? ' draft' : ''}`}>
          <GitPRIcon />
        </span>
        <div className="list-row-body">
          <p className="list-row-title">{pr.title}</p>
          <p className="list-row-meta">
            {pr.repoFullName} #{pr.number} · Updated {formatRelative(pr.updatedAt)}
          </p>
          <div className="list-row-tags">
            <span className="tag reason">{reasonLabel[pr.reason]}</span>
            {pr.draft ? <span className="tag">draft</span> : null}
            {pr.labels.slice(0, 3).map((label) => (
              <span key={label} className="tag">
                {label}
              </span>
            ))}
          </div>
        </div>
        <span className="list-row-action">
          <ExternalLinkIcon />
        </span>
      </a>
    ))
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
        <div
          className="panel pr-panel"
          ref={scrollRef}
          onScroll={updateFades}
        >
          {listContent}
        </div>
        <div className={`pr-fade pr-fade-bottom${fadeBottom ? ' is-visible' : ''}`} aria-hidden />
      </div>
    </section>
  )
}
