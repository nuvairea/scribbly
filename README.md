# Scribbly

> Offline first space for notes, thoughts, and scribbles.

<p align="center">
  <a href="https://scribbly-app.onrender.com">
  <img src="https://img.shields.io/badge/live_app-scribbly--app.onrender.com-2f6f61?style=flat-square" alt="Live app" />
</a>
  <a href="https://github.com/nuvairea/scribbly/releases/tag/v3.0.0"><img src="https://img.shields.io/badge/status-v3.0.0-orange?style=flat-square" alt="Status: v3.0.0" /></a>
  <a href="https://react.dev"><img src="https://img.shields.io/badge/React-TypeScript-61dafb?style=flat-square&logo=react&logoColor=111111" alt="React and TypeScript" /></a>
  <a href="https://vitejs.dev"><img src="https://img.shields.io/badge/Vite-646cff?style=flat-square&logo=vite&logoColor=white" alt="Vite" /></a>
  <a href="./LICENSE"><img src="https://img.shields.io/badge/License-MIT-yellow?style=flat-square" alt="License: MIT" /></a>
</p>

Write freely, stay in flow, and keep your thoughts close, even without a connection.

## Features

Scribbly lets you create, edit, and color-tag notes, search across your notes, and filter them by today, this week, or this month. Deleted notes are moved to trash, where they can be recovered or permanently removed.

You can sign in with Google or continue as a guest. Signed-in users can automatically sync their notes, while offline changes are saved locally and retried automatically when a connection is available.

Scribbly also includes light and dark themes with system preference support, and installs as a PWA that works offline.

Account and data management is available from Settings, including exporting notes as JSON, permanently clearing the trash, and deleting your account.

## Built with

- **Frontend:** React, TypeScript, Vite
- **Styling:** CSS Modules
- **Animations:** Motion
- **Icons:** Lucide
- **Auth:** Google OAuth
- **PWA:** installable, works offline
- **Backend:** [scribbly-server](https://github.com/nuvairea/scribbly-server) (Node.js, Express, MongoDB)
- **Deployment:** Render, with GitHub Actions

## Run locally

```bash
git clone https://github.com/nuvairea/scribbly.git
cd scribbly
npm install
npm run dev
```

Guest mode works without the backend. For login and sync, run [scribbly-server](https://github.com/nuvairea/scribbly-server) locally (setup is in its README), then add `VITE_API_URL=<your server's URL>` to a `.env` file in the project root and restart the dev server.

## License

This project is licensed under the [MIT License](./LICENSE).
