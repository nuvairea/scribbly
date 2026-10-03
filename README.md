# Scribbly

> Offline first space for notes, thoughts, and scribbles.

[![Status](https://img.shields.io/badge/status-in_progress-orange?style=flat-square)](https://github.com/nuvairea/scribbly/tree/react-rewrite)
[![React](https://img.shields.io/badge/React-TypeScript-61dafb?style=flat-square&logo=react&logoColor=111111)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-646cff?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](./LICENSE)

Write freely, stay in flow, and keep your thoughts close, even without a connection.

This is the v3 rewrite, React + TypeScript, replacing the original vanilla JS build. In progress on `react-rewrite`; the live version at [scribbly-app.onrender.com](https://scribbly-app.onrender.com) is still running v2 ([tagged here](https://github.com/nuvairea/scribbly/releases/tag/v2.0.0)).

## Why I'm rebuilding it

v2 worked, but it got messy to maintain, and I wanted to try doing it properly this time: real typing, real component structure, cleaner state management, and a bit more intention behind how it feels to use day to day.

## Status

Actively being rebuilt. Core notes experience (create, edit, trash, search, tabs/month filtering) is mostly in place; account sync, settings, and theming are still being wired up. Not tagged yet, `v3.0.0-alpha` once the core flow is usable end to end.

## Built with

- React + TypeScript
- Vite
- Framer Motion
- CSS Modules

## Backend

Shares the same API as v2, see [scribbly-server](https://github.com/nuvairea/scribbly-server).
