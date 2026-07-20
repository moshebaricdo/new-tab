import { endOfDay, startOfDay } from 'date-fns'
import type { CalendarEvent } from '../types'

const TOKEN_KEY = 'new-tab-screen:gcal-token'
const TOKEN_EXP_KEY = 'new-tab-screen:gcal-token-exp'

type GcalEntryPoint = {
  entryPointType?: string
  uri?: string
}

type GcalEvent = {
  id: string
  summary?: string
  htmlLink?: string
  location?: string
  hangoutLink?: string
  eventType?: string
  start?: { dateTime?: string; date?: string }
  end?: { dateTime?: string; date?: string }
  conferenceData?: {
    entryPoints?: GcalEntryPoint[]
  }
}

/** Status / non-meeting event types we never want in the dashboard. */
const EXCLUDED_EVENT_TYPES = new Set([
  'workingLocation',
  'outOfOffice',
  'focusTime',
  'birthday',
])

function waitForGoogle(timeoutMs = 8000): Promise<typeof window.google> {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.oauth2) {
      resolve(window.google)
      return
    }
    const start = Date.now()
    const id = window.setInterval(() => {
      if (window.google?.accounts?.oauth2) {
        window.clearInterval(id)
        resolve(window.google)
      } else if (Date.now() - start > timeoutMs) {
        window.clearInterval(id)
        reject(new Error('Google Identity Services failed to load.'))
      }
    }, 50)
  })
}

export function getStoredAccessToken(): string | null {
  const token = sessionStorage.getItem(TOKEN_KEY)
  const exp = Number(sessionStorage.getItem(TOKEN_EXP_KEY) || 0)
  if (!token || !exp || Date.now() > exp) {
    sessionStorage.removeItem(TOKEN_KEY)
    sessionStorage.removeItem(TOKEN_EXP_KEY)
    return null
  }
  return token
}

function storeAccessToken(token: string, expiresInSeconds = 3500) {
  sessionStorage.setItem(TOKEN_KEY, token)
  sessionStorage.setItem(TOKEN_EXP_KEY, String(Date.now() + expiresInSeconds * 1000))
}

export const GCAL_DISCONNECTED_EVENT = 'new-tab:gcal-disconnected'

export function clearAccessToken() {
  const token = sessionStorage.getItem(TOKEN_KEY)
  sessionStorage.removeItem(TOKEN_KEY)
  sessionStorage.removeItem(TOKEN_EXP_KEY)
  if (token && window.google?.accounts?.oauth2) {
    window.google.accounts.oauth2.revoke(token)
  }
  window.dispatchEvent(new Event(GCAL_DISCONNECTED_EVENT))
}

export async function connectGoogleCalendar(clientId: string): Promise<string> {
  if (!clientId.trim()) {
    throw new Error('Add a Google OAuth Client ID in Settings.')
  }

  await waitForGoogle()

  return new Promise((resolve, reject) => {
    const client = window.google!.accounts.oauth2.initTokenClient({
      client_id: clientId.trim(),
      scope: 'https://www.googleapis.com/auth/calendar.readonly',
      callback: (response) => {
        if (response.error || !response.access_token) {
          reject(new Error(response.error || 'Google sign-in was cancelled.'))
          return
        }
        storeAccessToken(response.access_token)
        resolve(response.access_token)
      },
    })
    client.requestAccessToken({ prompt: '' })
  })
}

function conferenceLinkFrom(e: GcalEvent): string | undefined {
  if (e.hangoutLink) return e.hangoutLink

  const points = e.conferenceData?.entryPoints ?? []
  const video = points.find((p) => p.entryPointType === 'video' && p.uri)
  if (video?.uri) return video.uri

  const more = points.find((p) => p.entryPointType === 'more' && p.uri)
  if (more?.uri) return more.uri

  return points.find((p) => p.uri)?.uri
}

function parseEvent(e: GcalEvent): CalendarEvent | null {
  if (!e.start) return null
  if (e.eventType && EXCLUDED_EVENT_TYPES.has(e.eventType)) return null

  const allDay = Boolean(e.start.date && !e.start.dateTime)
  const start = new Date(e.start.dateTime || `${e.start.date}T00:00:00`)
  const end = new Date(
    e.end?.dateTime ||
      (e.end?.date ? `${e.end.date}T00:00:00` : e.start.dateTime || `${e.start.date}T23:59:59`),
  )

  return {
    id: e.id,
    title: e.summary || '(No title)',
    htmlLink: e.htmlLink,
    start,
    end,
    allDay,
    location: e.location,
    conferenceLink: conferenceLinkFrom(e),
  }
}

/** Today's remaining meetings (excludes working location / OOO / focus / birthdays). */
export async function fetchUpcomingEvents(accessToken: string): Promise<CalendarEvent[]> {
  const now = new Date()
  const timeMin = startOfDay(now).toISOString()
  const timeMax = endOfDay(now).toISOString()

  const url = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events')
  url.searchParams.set('timeMin', timeMin)
  url.searchParams.set('timeMax', timeMax)
  url.searchParams.set('singleEvents', 'true')
  url.searchParams.set('orderBy', 'startTime')
  url.searchParams.set('maxResults', '50')
  url.searchParams.set('conferenceDataVersion', '1')
  // Only regular (and Gmail-sourced) events — skips workingLocation, OOO, etc.
  url.searchParams.append('eventTypes', 'default')
  url.searchParams.append('eventTypes', 'fromGmail')

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  const data = (await res.json()) as { items?: GcalEvent[]; error?: { message?: string } }
  if (!res.ok) {
    if (res.status === 401) clearAccessToken()
    throw new Error(data.error?.message || `Calendar API error (${res.status})`)
  }

  return (data.items ?? [])
    .map(parseEvent)
    .filter((e): e is CalendarEvent => Boolean(e))
    .filter((e) => e.end.getTime() >= now.getTime())
}
