import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  GCAL_DISCONNECTED_EVENT,
  connectGoogleCalendar,
  fetchUpcomingEvents,
  getStoredAccessToken,
  isCalendarLinked,
} from '../lib/calendar'
import { useAutoRefresh } from '../lib/useAutoRefresh'
import { formatEventTime, formatRelative } from '../lib/time'
import type { CalendarEvent, Settings } from '../types'
import { JOIN_ICON_SIZE, RefreshIcon, VideoIcon } from './Icons'

type Props = {
  settings: Settings
  onOpenSettings: () => void
}

type LoadOptions = {
  forceConnect?: boolean
  silent?: boolean
}

export function Meetings({ settings, onOpenSettings }: Props) {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [connected, setConnected] = useState(() => isCalendarLinked())

  const load = useCallback(
    async (opts: LoadOptions = {}) => {
      const { forceConnect = false, silent = false } = opts
      if (!settings.googleClientId) {
        setEvents([])
        setConnected(false)
        setError(null)
        return
      }

      // Background sync: only refresh if we've linked before (or still have a token).
      if (silent && !forceConnect && !isCalendarLinked()) {
        setConnected(false)
        setEvents([])
        return
      }

      if (!silent) setLoading(true)
      setError(null)
      try {
        let token = forceConnect ? null : getStoredAccessToken()
        if (!token) {
          // Reuses prior consent; may briefly flash a Google popup when the ~1h token expires.
          token = await connectGoogleCalendar(settings.googleClientId)
        }

        const data = await fetchUpcomingEvents(token)
        setEvents(data)
        setConnected(true)
      } catch (e) {
        if (silent) {
          setConnected(false)
          setEvents([])
          setError(null)
        } else {
          setError(e instanceof Error ? e.message : 'Failed to load calendar')
          setConnected(isCalendarLinked() && Boolean(getStoredAccessToken()))
        }
      } finally {
        if (!silent) setLoading(false)
      }
    },
    [settings.googleClientId],
  )

  useEffect(() => {
    if (settings.googleClientId && isCalendarLinked()) {
      void load({ silent: true })
    }
  }, [settings.googleClientId, load])

  useEffect(() => {
    const onDisconnected = () => {
      setConnected(false)
      setEvents([])
      setError(null)
    }
    window.addEventListener(GCAL_DISCONNECTED_EVENT, onDisconnected)
    return () => window.removeEventListener(GCAL_DISCONNECTED_EVENT, onDisconnected)
  }, [])

  const { primary, rest } = useMemo(() => {
    if (events.length === 0) return { primary: null, rest: [] as CalendarEvent[] }
    return { primary: events[0], rest: events.slice(1) }
  }, [events])

  const configured = Boolean(settings.googleClientId.trim())
  useAutoRefresh(() => load({ silent: true }), configured && connected)

  return (
    <section className="meetings">
      <div className="section-head">
        <h2 className="section-title">Today</h2>
        <div className="section-actions">
          <button
            type="button"
            className="ghost-btn"
            onClick={() => void load({ forceConnect: !connected })}
            disabled={loading || !configured}
          >
            <RefreshIcon className={loading ? 'spin' : undefined} />
            {connected ? 'Refresh' : 'Connect'}
          </button>
        </div>
      </div>

      {!configured ? (
        <div className="panel empty-state">
          <p>Add a Google OAuth Client ID in Settings to show your calendar events.</p>
          <button type="button" className="ghost-btn" onClick={onOpenSettings}>
            Open settings
          </button>
        </div>
      ) : error ? (
        <div className="panel error-state">
          <p>{error}</p>
          <button
            type="button"
            className="ghost-btn"
            onClick={() => void load({ forceConnect: true })}
          >
            Connect again
          </button>
        </div>
      ) : !connected ? (
        <div className="panel empty-state">
          <p>Connect Google Calendar to see today’s meetings.</p>
          <button
            type="button"
            className="ghost-btn"
            onClick={() => void load({ forceConnect: true })}
          >
            Connect Google Calendar
          </button>
        </div>
      ) : loading && events.length === 0 ? (
        <div className="panel empty-state">
          <p>Loading events…</p>
        </div>
      ) : !primary ? (
        <div className="panel empty-state">
          <p>No more meetings today.</p>
        </div>
      ) : (
        <div className="panel meetings-card">
          <div className="meeting-next">
            <div className="meeting-next-copy">
              <span className="meeting-eyebrow">
                {formatRelative(primary.start).replace(/^./, (c) => c.toUpperCase())}
              </span>
              {primary.htmlLink ? (
                <a className="meeting-next-title" href={primary.htmlLink}>
                  {primary.title}
                </a>
              ) : (
                <h3 className="meeting-next-title">{primary.title}</h3>
              )}
              <p className="meeting-next-meta">
                {formatEventTime(primary.start, primary.end, primary.allDay)}
                {primary.location ? ` · ${primary.location}` : ''}
              </p>
            </div>
            {primary.conferenceLink ? (
              <div className="meeting-next-actions">
                <a className="btn-join" href={primary.conferenceLink}>
                  <VideoIcon size={JOIN_ICON_SIZE} />
                  Join
                </a>
              </div>
            ) : null}
          </div>

          {rest.length > 0 ? (
            <div className="meetings-rest">
              {rest.map((event) => (
                <MeetingRow key={event.id} event={event} />
              ))}
            </div>
          ) : null}
        </div>
      )}
    </section>
  )
}

function MeetingRow({ event }: { event: CalendarEvent }) {
  return (
    <div className="list-row meeting-row">
      <div className="list-row-body">
        {event.htmlLink ? (
          <a className="list-row-title meeting-row-title" href={event.htmlLink}>
            {event.title}
          </a>
        ) : (
          <p className="list-row-title">{event.title}</p>
        )}
        <p className="list-row-meta">
          {formatEventTime(event.start, event.end, event.allDay)}
          {event.location ? ` · ${event.location}` : ''}
        </p>
      </div>
    </div>
  )
}
