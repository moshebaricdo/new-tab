export type AppIconKey = 'gmail' | 'calendar' | 'figma' | 'github' | 'link'

export type AppShortcut = {
  id: string
  name: string
  url: string
  /** Custom uploaded icon as a data URL (localStorage). */
  iconDataUrl?: string
  /** Built-in fallback when no custom icon is set. */
  iconKey?: AppIconKey
}

export type FolderLink = {
  id: string
  title: string
  url: string
}

export type ShortcutFolder = {
  id: string
  name: string
  links: FolderLink[]
  collapsed?: boolean
}

export type ThemeMode = 'light' | 'dark'

export type Settings = {
  displayName: string
  githubToken: string
  githubUsername: string
  googleClientId: string
  theme: ThemeMode
}

export type GitHubNotificationReason =
  | 'review_requested'
  | 'mention'
  | 'assign'
  | 'team_mention'
  | 'approval_requested'

export type GitHubNotification = {
  id: string
  title: string
  htmlUrl: string
  repoFullName: string
  updatedAt: string
  unread: boolean
  reason: GitHubNotificationReason
  subjectType: string
  /** Issue/PR number when parseable from the API subject URL. */
  number?: number
}

export type CalendarEvent = {
  id: string
  title: string
  htmlLink?: string
  start: Date
  end: Date
  allDay: boolean
  location?: string
  /** Video conference URL (Meet, Zoom, etc.) when present on the invite. */
  conferenceLink?: string
}

export type StoredData = {
  settings: Settings
  apps: AppShortcut[]
  folders: ShortcutFolder[]
}

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string
            scope: string
            callback: (response: {
              access_token?: string
              expires_in?: string | number
              error?: string
            }) => void
          }) => { requestAccessToken: (override?: { prompt?: string }) => void }
          revoke: (token: string, callback?: () => void) => void
        }
      }
    }
  }
}
