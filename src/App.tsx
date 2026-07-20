import { useEffect, useState } from 'react'
import { Header } from './components/Header'
import { Meetings } from './components/Meetings'
import { PullRequests } from './components/PullRequests'
import { SettingsModal } from './components/SettingsModal'
import { Shortcuts } from './components/Shortcuts'
import {
  loadStoredData,
  saveApps,
  saveFolders,
  saveSettings,
} from './lib/storage'
import type { AppShortcut, Settings, ShortcutFolder, ThemeMode } from './types'

function applyTheme(theme: ThemeMode) {
  document.documentElement.dataset.theme = theme
}

export default function App() {
  const initial = loadStoredData()
  const [settings, setSettings] = useState<Settings>(initial.settings)
  const [apps, setApps] = useState<AppShortcut[]>(initial.apps)
  const [folders, setFolders] = useState<ShortcutFolder[]>(initial.folders)
  const [settingsOpen, setSettingsOpen] = useState(
    () => !initial.settings.displayName && !initial.settings.githubToken,
  )

  useEffect(() => {
    applyTheme(settings.theme)
  }, [settings.theme])

  function handleSaveSettings(next: Settings) {
    setSettings(next)
    saveSettings(next)
  }

  function handleThemeChange(theme: ThemeMode) {
    if (theme === settings.theme) return
    const next = { ...settings, theme }
    setSettings(next)
    saveSettings(next)
  }

  function handleChangeApps(next: AppShortcut[]) {
    setApps(next)
    saveApps(next)
  }

  function handleChangeFolders(next: ShortcutFolder[]) {
    setFolders(next)
    saveFolders(next)
  }

  return (
    <div className="app">
      <Header
        displayName={settings.displayName}
        theme={settings.theme}
        onThemeChange={handleThemeChange}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <div className="layout">
        <div className="main-col">
          <Meetings
            settings={settings}
            onOpenSettings={() => setSettingsOpen(true)}
          />
          <PullRequests
            settings={settings}
            onOpenSettings={() => setSettingsOpen(true)}
          />
        </div>
        <aside className="side-col">
          <Shortcuts
            apps={apps}
            folders={folders}
            onChangeApps={handleChangeApps}
            onChangeFolders={handleChangeFolders}
          />
        </aside>
      </div>

      {settingsOpen ? (
        <SettingsModal
          settings={settings}
          onSave={handleSaveSettings}
          onClose={() => setSettingsOpen(false)}
        />
      ) : null}
    </div>
  )
}
