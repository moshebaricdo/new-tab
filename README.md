# New Tab Screen

A minimal personal new-tab dashboard with:

- **GitHub PRs** you’re review-requested on, mentioned in, or assigned to
- **Upcoming Google Calendar** events
- **Shortcuts**: a fixed app row (Gmail, Calendar, Figma, GitHub) plus folders of links you can add, edit, reorder, and delete

Everything editable (settings, shortcuts, folders, and the Google Calendar token) lives in **localStorage**.

## Develop locally

```bash
npm install
npm run dev
```

## Deploy to GitHub Pages

1. Push this repo to GitHub.
2. In the repo **Settings → Pages**, set Source to **GitHub Actions**.
3. Push to `main` (the included workflow builds and publishes `dist/`).

Or publish manually:

```bash
npm run build
# then upload dist/ to Pages, or:
npx gh-pages -d dist
```

After it’s live, set that URL as your browser’s new-tab page (extensions like [Custom New Tab URL](https://chromewebstore.google.com/detail/custom-new-tab-url) work well in Chrome).

## First-time setup

Open the gear icon and fill in:

### Display name

Shown in the greeting.

### GitHub

1. Create a [Personal Access Token](https://github.com/settings/tokens) (classic) with `repo` scope (or `public_repo` if you only need public PRs).
2. Paste the token and your GitHub username.

The dashboard searches open PRs where you are a **requested reviewer**, **mentioned**, or **assignee**.

### Google Calendar

1. In [Google Cloud Console](https://console.cloud.google.com/), create a project (or pick one).
2. Enable **Google Calendar API**.
3. Configure the **OAuth consent screen** (External is fine for personal use).
4. Create an **OAuth 2.0 Client ID** → Application type **Web application**.
5. Under **Authorized JavaScript origins**, add:
   - `http://localhost:5173` (local Vite)
   - your GitHub Pages origin, e.g. `https://YOUR_USER.github.io`
6. Paste the Client ID into Settings, then click **Connect** on Upcoming meetings.

Tokens are requested in the browser via Google Identity Services; nothing is sent to a backend you own.

## Persistence notes

| Data | Storage |
| --- | --- |
| Name, GitHub token/username, Google Client ID | `localStorage` |
| App row + folders/links | `localStorage` |
| Google OAuth access token | `localStorage` (auto-refreshes silently after Connect; Disconnect in Settings) |

Clearing site data for your Pages origin will wipe the dashboard configuration.
