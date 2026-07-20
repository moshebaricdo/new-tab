import { useEffect, useState } from 'react'
import { formatClock, formatHeaderDate, greetingForHour } from '../lib/time'
import type { ThemeMode } from '../types'
import { MoonIcon, SettingsIcon, SunIcon } from './Icons'

type HeaderProps = {
  displayName: string
  theme: ThemeMode
  onThemeChange: (theme: ThemeMode) => void
  onOpenSettings: () => void
}

export function Header({ displayName, theme, onThemeChange, onOpenSettings }: HeaderProps) {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 15_000)
    return () => window.clearInterval(id)
  }, [])

  const name = displayName.trim() || 'there'
  const greeting = greetingForHour(now.getHours())

  return (
    <header className="header">
      <div>
        <p className="header-meta">
          <span>{formatHeaderDate(now)}</span>
          <span className="header-dot" aria-hidden />
          <time dateTime={now.toISOString()}>{formatClock(now)}</time>
        </p>
        <h1 className="header-greeting">
          {greeting}, {name}
        </h1>
      </div>
      <div className="header-actions">
        <div className="theme-toggle" role="group" aria-label="Color theme">
          <button
            type="button"
            className={theme === 'light' ? 'is-active' : undefined}
            onClick={() => onThemeChange('light')}
            aria-label="Light mode"
            aria-pressed={theme === 'light'}
            title="Light"
          >
            <SunIcon />
          </button>
          <button
            type="button"
            className={theme === 'dark' ? 'is-active' : undefined}
            onClick={() => onThemeChange('dark')}
            aria-label="Dark mode"
            aria-pressed={theme === 'dark'}
            title="Dark"
          >
            <MoonIcon />
          </button>
        </div>
        <button
          type="button"
          className="icon-btn"
          onClick={onOpenSettings}
          aria-label="Settings"
          title="Settings"
        >
          <SettingsIcon />
        </button>
      </div>
    </header>
  )
}
