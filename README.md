# env canvas

A visual canvas workspace for AI conversations. Branch, connect, and orchestrate multiple AI models.

## Features

- 🎨 **Infinite Canvas** — Pan, zoom, organize conversations spatially
- ⑂ **Branch Conversations** — Fork from any message to explore alternatives
- 🔗 **Connect Context** — Link nodes to share conversation context
- 🧠 **Multi-Model** — Claude, GPT-4, Gemini, Grok in one interface
- 💾 **Persistent** — Conversations and API keys saved locally
- 🍎 **Native Mac App** — Runs as a real app, not in browser

## Getting Started

```bash
# Install dependencies
npm install

# Run in development mode (opens Electron app)
npm start

# Build DMG for distribution
npm run build:dmg
```

The DMG will be in the `dist/` folder.

## Usage

- **Double-click** canvas to create a new chat node
- **Drag** nodes to organize them
- **Connect** nodes by dragging from one handle to another
- **Branch** from any message using the ⑂ button
- Click the **model name** in a node to switch AI providers

## Keyboard Shortcuts

- `Delete` / `Backspace` — Delete selected node
- `Cmd + Scroll` — Zoom

## Structure

```
env-canvas/
├── main.js              # Electron main process
├── preload.js           # IPC bridge
├── package.json         # Dependencies & build config
├── assets/
│   └── icon.icns        # App icon
├── public/
│   └── index.html
└── src/
    ├── App.js           # Main app with React Flow
    ├── App.css          # Styles
    ├── store.js         # Zustand store + API calls
    └── components/
        ├── ChatNode.js  # Chat block node
        ├── Toolbar.js   # Top toolbar
        └── Settings.js  # API key settings
```

## AppleScript Support

The app includes AppleScript support for computer control:

```javascript
// In your React code:
await window.electronAPI.runAppleScript('tell application "Finder" to ...');
```
