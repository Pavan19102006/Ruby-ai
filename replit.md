# Ruby AI - Intelligent Chat Assistant

## Overview
Ruby AI is a beautiful, full-stack AI chat application built with a ruby-red themed design. It features real-time streaming responses, conversation management, and a modern, responsive interface.

## Recent Changes
- **January 2026**: Initial build of Ruby AI with:
  - Ruby-themed design system (HSL 348 primary color)
  - Real-time streaming AI responses
  - Conversation sidebar with create/delete functionality
  - Dark/light mode toggle
  - Form validation with Zod schemas
  - PostgreSQL database for conversation persistence

## Tech Stack
- **Frontend**: React, TypeScript, TailwindCSS, Shadcn/UI, Wouter routing
- **Backend**: Express.js, Node.js, PostgreSQL with Drizzle ORM
- **AI**: OpenAI-compatible API (Replit AI Integrations)

## Project Architecture

### Directory Structure
```
client/
├── src/
│   ├── components/
│   │   ├── ui/           # Shadcn UI components
│   │   ├── chat-sidebar.tsx
│   │   ├── chat-message.tsx
│   │   ├── chat-input.tsx
│   │   ├── chat-window.tsx
│   │   └── theme-toggle.tsx
│   ├── pages/
│   │   ├── chat.tsx      # Main chat page
│   │   └── not-found.tsx
│   ├── lib/
│   │   ├── queryClient.ts
│   │   ├── theme-provider.tsx
│   │   └── utils.ts
│   └── App.tsx
server/
├── routes.ts             # API endpoints
├── storage.ts            # Database operations
├── db.ts                 # Database connection
└── index.ts              # Server entry
shared/
└── schema.ts             # Drizzle schema + Zod validation
```

### API Endpoints
- `GET /api/conversations` - List all conversations
- `POST /api/conversations` - Create new conversation
- `GET /api/conversations/:id` - Get conversation with messages
- `DELETE /api/conversations/:id` - Delete conversation
- `POST /api/conversations/:id/messages` - Send message (SSE streaming response)

### Database Schema
- **conversations**: id, title, createdAt
- **messages**: id, conversationId, role, content, createdAt

## Configuration

### Environment Variables
- `DATABASE_URL` - PostgreSQL connection string (auto-configured)
- `OLLAMA_API_KEY` - User's API key (optional)
- `OLLAMA_BASE_URL` - API base URL (optional)
- `AI_INTEGRATIONS_OPENAI_API_KEY` - Replit AI key (auto-configured)
- `AI_INTEGRATIONS_OPENAI_BASE_URL` - Replit AI URL (auto-configured)

## Development

### Running the app
The workflow "Start application" runs `npm run dev` which starts the Express server with Vite for hot module replacement.

### Database migrations
```bash
npm run db:push
```

## User Preferences
- Ruby red color theme (HSL 348)
- Inter font for UI, JetBrains Mono for code
- Dark mode support
- Streaming AI responses with typing indicators
