# Ruby AI Server

A full-stack AI chat application with vision capabilities.

## 📥 Download Desktop App

Download the latest version from [Releases](https://github.com/Pavan19102006/Ruby-ai/releases)

### macOS Installation

1. Download `Ruby AI-x.x.x-arm64.dmg`
2. Open the DMG file
3. Drag Ruby AI to Applications

**⚠️ If you see "Ruby AI is damaged and can't be opened":**

This happens because the app is not signed with an Apple Developer certificate. To fix it:

1. Open **Terminal** (Applications → Utilities → Terminal)
2. Run this command:
   ```bash
   xattr -cr /Applications/Ruby\ AI.app
   ```
3. Now open Ruby AI from Applications - it should work!

**Alternative:** Right-click the app → Open → Click "Open" in the dialog

### Windows Installation

1. Download `Ruby AI Setup x.x.x.exe`
2. Run the installer
3. If Windows SmartScreen appears, click "More info" → "Run anyway"

## Environment Variables Required

```
DATABASE_URL=your_neon_database_url
OPENROUTER_API_KEY=your_openrouter_api_key
VISION_MODEL=google/gemini-2.0-flash-001
GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=llama-3.3-70b-versatile
```

## Deploy to Railway

1. Push this repo to GitHub
2. Go to https://railway.app
3. Click "New Project" → "Deploy from GitHub repo"
4. Select this repository
5. Add environment variables in the "Variables" tab
6. Railway will auto-deploy on every push

## Deploy to Render

1. Push this repo to GitHub
2. Go to https://render.com
3. Create a new "Web Service"
4. Connect your GitHub repo
5. Set build command: `npm install && npm run build`
6. Set start command: `npm start`
7. Add environment variables

## Local Development

```bash
npm install
npm run dev
```

## Keyboard Shortcuts (Desktop App)

| Shortcut | Action |
|----------|--------|
| `⌘⇧Space` (Mac) / `Ctrl+Shift+Space` (Win) | Toggle window |
| `⌘⇧S` (Mac) / `Ctrl+Shift+S` (Win) | Capture screenshot |
| `Esc` | Hide window |
| `Enter` | Send message |
| `Shift+Enter` | New line |
