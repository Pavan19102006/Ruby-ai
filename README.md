# Ruby AI Server

A full-stack AI chat application with vision capabilities.

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
