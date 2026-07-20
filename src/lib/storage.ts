import type { AppShortcut, Settings, ShortcutFolder, StoredData } from '../types'

const STORAGE_KEY = 'new-tab-screen:v1'

export const DEFAULT_SETTINGS: Settings = {
  displayName: '',
  githubToken: '',
  githubUsername: '',
  googleClientId: '',
  theme: 'light',
}

export const DEFAULT_APPS: AppShortcut[] = [
  { id: 'app-gmail', name: 'Gmail', url: 'https://mail.google.com', iconKey: 'gmail' },
  { id: 'app-calendar', name: 'Calendar', url: 'https://calendar.google.com', iconKey: 'calendar' },
  { id: 'app-figma', name: 'Figma', url: 'https://www.figma.com', iconKey: 'figma' },
  { id: 'app-github', name: 'GitHub', url: 'https://github.com', iconKey: 'github' },
]

export const DEFAULT_FOLDERS: ShortcutFolder[] = [
  { id: 'folder-figma', name: 'Figma', links: [] },
  { id: 'folder-docs', name: 'Docs & notes', links: [] },
]

function uid(prefix: string) {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`
}

export function createId(prefix: string) {
  return uid(prefix)
}

function normalizeApp(app: AppShortcut & { icon?: string }): AppShortcut {
  const legacy = app as AppShortcut & { icon?: string }
  return {
    id: app.id,
    name: app.name,
    url: app.url,
    iconDataUrl: app.iconDataUrl,
    iconKey: app.iconKey ?? (legacy.icon as AppShortcut['iconKey']) ?? 'link',
  }
}

function loadRaw(): StoredData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as StoredData
  } catch {
    return null
  }
}

export function loadStoredData(): StoredData {
  const existing = loadRaw()
  if (!existing) {
    return {
      settings: { ...DEFAULT_SETTINGS },
      apps: DEFAULT_APPS.map((a) => ({ ...a })),
      folders: DEFAULT_FOLDERS.map((f) => ({
        ...f,
        links: f.links.map((l) => ({ ...l })),
      })),
    }
  }

  return {
    settings: { ...DEFAULT_SETTINGS, ...existing.settings },
    apps: existing.apps?.length
      ? existing.apps.map((a) => normalizeApp(a as AppShortcut & { icon?: string }))
      : DEFAULT_APPS.map((a) => ({ ...a })),
    folders: existing.folders ?? [],
  }
}

export function saveStoredData(data: StoredData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

export function saveSettings(settings: Settings) {
  const data = loadStoredData()
  data.settings = settings
  saveStoredData(data)
}

export function saveApps(apps: AppShortcut[]) {
  const data = loadStoredData()
  data.apps = apps
  saveStoredData(data)
}

export function saveFolders(folders: ShortcutFolder[]) {
  const data = loadStoredData()
  data.folders = folders
  saveStoredData(data)
}
