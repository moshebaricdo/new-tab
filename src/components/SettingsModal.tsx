import { useState } from 'react'
import { clearAccessToken, isCalendarLinked } from '../lib/calendar'
import type { Settings } from '../types'
import { Modal } from './Modal'

type Props = {
  settings: Settings
  onSave: (settings: Settings) => void
  onClose: () => void
}

export function SettingsModal({ settings, onSave, onClose }: Props) {
  const [draft, setDraft] = useState(settings)
  const [calendarConnected, setCalendarConnected] = useState(() => isCalendarLinked())

  function update<K extends keyof Settings>(key: K, value: Settings[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <Modal
      title="Settings"
      subtitle="Stored only in this browser’s local storage."
      onClose={onClose}
    >
      <form
        className="form-stack"
        onSubmit={(e) => {
          e.preventDefault()
          onSave(draft)
          onClose()
        }}
      >
        <div className="field">
          <label htmlFor="displayName">Display name</label>
          <input
            id="displayName"
            value={draft.displayName}
            onChange={(e) => update('displayName', e.target.value)}
            placeholder="Your name"
            autoComplete="nickname"
          />
        </div>

        <div className="settings-section">
          <h3 className="settings-section-title">GitHub</h3>
          <div className="form-stack">
            <div className="field">
              <label htmlFor="githubToken">Personal access token</label>
              <input
                id="githubToken"
                type="password"
                value={draft.githubToken}
                onChange={(e) => update('githubToken', e.target.value)}
                placeholder="ghp_…"
                autoComplete="off"
              />
              <p className="field-hint">
                Create a classic token with the <code>notifications</code> scope (or{' '}
                <code>repo</code>) at{' '}
                <a href="https://github.com/settings/tokens" target="_blank" rel="noreferrer">
                  github.com/settings/tokens
                </a>
                . Used to load your unread GitHub inbox.
              </p>
            </div>
            <div className="field">
              <label htmlFor="githubUsername">Username (optional)</label>
              <input
                id="githubUsername"
                value={draft.githubUsername}
                onChange={(e) => update('githubUsername', e.target.value)}
                placeholder="octocat"
                autoComplete="username"
              />
            </div>
          </div>
        </div>

        <div className="settings-section">
          <h3 className="settings-section-title">Google Calendar</h3>
          <div className="field">
            <label htmlFor="googleClientId">OAuth Client ID</label>
            <input
              id="googleClientId"
              value={draft.googleClientId}
              onChange={(e) => update('googleClientId', e.target.value)}
              placeholder="….apps.googleusercontent.com"
              autoComplete="off"
            />
            <p className="field-hint">
              In Google Cloud Console, create an OAuth 2.0 Web client. Add your GitHub Pages URL
              (and <code>http://localhost:5173</code> for local dev) under Authorized JavaScript
              origins. Enable the Google Calendar API. Sign-in happens in the browser — no backend.
            </p>
            {calendarConnected ? (
              <button
                type="button"
                className="btn-secondary"
                style={{ marginTop: 10 }}
                onClick={() => {
                  clearAccessToken()
                  setCalendarConnected(false)
                }}
              >
                Disconnect Google Calendar
              </button>
            ) : null}
          </div>
        </div>

        <div className="modal-actions">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn-primary">
            Save
          </button>
        </div>
      </form>
    </Modal>
  )
}
