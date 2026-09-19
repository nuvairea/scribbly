# Scribbly

> Quick, clean note taking for the web.

[![Live app](https://img.shields.io/badge/live_app-scribbly--app.onrender.com-2f6f61?style=flat-square)](https://scribbly-app.onrender.com)
[![Vanilla JavaScript](https://img.shields.io/badge/JavaScript-vanilla-f7df1e?style=flat-square&logo=javascript&logoColor=111111)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![PWA](https://img.shields.io/badge/PWA-installable-5a4fcf?style=flat-square)](https://web.dev/progressive-web-apps/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

Scribbly is a focused note-taking app with fast local editing, searchable notes, color tags, and optional account-based sync. It works as a responsive web app and an installable Progressive Web App.

## Preview

<table>
  <tr>
    <th align="left" width="78%">Desktop dashboard</th>
    <th align="left" width="22%">Mobile dashboard</th>
  </tr>
  <tr>
    <td width="78%"><img src="./assets/screenshots/desktop-1.png" alt="Scribbly desktop dashboard" height="420" style="max-width: 100%;"></td>
    <td width="22%"><img src="./assets/screenshots/mobile-1.png" alt="Scribbly mobile dashboard" height="420" style="max-width: 100%;"></td>
  </tr>
  <tr>
    <th align="left" width="78%">Desktop note editor</th>
    <th align="left" width="22%">Mobile note editor</th>
  </tr>
  <tr>
    <td width="78%"><img src="./assets/screenshots/desktop-2.png" alt="Scribbly desktop note editor" height="420" style="max-width: 100%;"></td>
    <td width="22%"><img src="./assets/screenshots/mobile-2.png" alt="Scribbly mobile note editor" height="420" style="max-width: 100%;"></td>
  </tr>
</table>

## Features

- Create, edit, and color-tag notes
- Search across all notes
- Filter notes by today, this week, or this month
- Soft-delete notes and recover them from Recently Deleted
- Sign up, log in, or continue as a guest
- Sync notes automatically when logged in
- Continue working offline with automatic retry when a save fails
- Install the app as a PWA for offline app-shell access
- Switch between light and dark themes, or follow the system preference
- Manage your account and data from a dedicated Settings page: export notes as JSON, permanently clear trash, or delete your account

## Built with

- Vanilla JavaScript using ES modules
- HTML and CSS custom properties for responsive theming
- A service worker for offline app-shell caching
- `fetch` and session-cookie authentication

## Getting started

Scribbly is a static frontend with no build step.

```bash
git clone https://github.com/nuvairea/scribbly.git
cd scribbly
```

Serve the directory with any static server. Opening `index.html` directly is not recommended because ES modules and the service worker require an HTTP origin:

```bash
npx live-server
# or
python3 -m http.server 5500
```

Then open the local URL shown by the server. The frontend connects to the deployed Scribbly API by default. To run the complete stack locally, use the backend project linked below.

## Project structure

```text
scribbly/
├── index.html
├── manifest.json
├── sw.js
├── css/
│   ├── base.css         # variables, fonts, resets, and theme styles
│   ├── header.css       # app header and search styles
│   ├── modals.css       # note and authentication modals
│   ├── notes.css        # note cards, tabs, and empty states
│   ├── responsive.css   # mobile layout rules
│   ├── settings.css     # settings modal and controls
│   ├── sidebar.css      # navigation and account menu
│   └── toast.css        # notification styles
├── js/
│   ├── main.js          # application bootstrap and module wiring
│   ├── app-utils.js     # shared event and button utilities
│   ├── auth.js          # authentication API calls
│   ├── auth-events.js   # authentication and account event handlers
│   ├── note-events.js   # note, navigation, search, and tab handlers
│   ├── notes.js         # note CRUD, caching, and sync logic
│   ├── theme.js         # theme selection and system preference handling
│   └── ui.js            # rendering, DOM updates, and toast messages
└── assets/
  ├── favicons/
  ├── fonts/
  ├── iconify-icon.min.js
  └── screenshots/
```

## Backend

The API is maintained in a separate Node.js and Express service. See the [Scribbly Server repository](https://github.com/nuvairea/scribbly-server)