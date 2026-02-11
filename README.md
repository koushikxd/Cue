# Cue

<p align="center">
  <img src="github.png" alt="Cue - AI Task Manager" width="800">
</p>

A minimalist AI-powered task manager that intuitively processes natural language to organize your day. Simply type what you need, and let AI handle the rest.

## Features

- AI-powered task intelligence: Create, edit, schedule, prioritize, sort, and complete tasks using natural language
- Bring Your Own Key (BYOK): Use your own free Groq API key — no server-side keys required
- Multiple AI models: Choose between Llama 3.1, Llama 3.3, Llama 4 Scout, and Qwen 3
- Privacy-focused with local storage (IndexedDB)
- PWA with offline support
- Minimalistic dark themed UI
- Keyboard shortcuts
- Swipe gestures on mobile
- Device sync via JSON export/import
- Customizable settings
- Secure authentication with Clerk (Optional)
- Google Calendar integration for task sync and notifications (Optional)

## Tech Stack

- **Framework**: [Next.js](https://nextjs.org/)
- **AI**: Groq models via [ai-sdk](https://github.com/vercel/ai) (BYOK)
- **UI**: [TailwindCSS](https://tailwindcss.com/)
- **State**: Local with [IndexedDB](https://dexie.org/)
- **Animations**: [Framer Motion](https://www.framer.com/motion/)
- **Date Handling**: [date-fns](https://date-fns.org/)

## AI Capabilities

Cue understands natural language commands for task management:

- **Intelligent Creation**: "Add team meeting tomorrow at 3pm with high priority"
- **Smart Editing**: "Move my dentist appointment to Friday at 2pm"
- **Quick Actions**: "Mark gym session as complete" or "Delete yesterday's tasks"
- **Bulk Processing**: "Add buy groceries today and schedule dentist for next Friday"
- **Time Understanding**: Automatically converts time references (2pm, morning, etc.)
- **Date Parsing**: Handles relative dates (today, tomorrow, next week)
- **Priority Recognition**: Identifies importance levels from your language

## Getting Started

```bash
# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env.local

# Start development server
pnpm run dev
```

### AI Setup (BYOK)

Cue uses a Bring Your Own Key approach for AI features. No server-side API keys are needed.

1. Get a free API key from [Groq Console](https://console.groq.com/keys)
2. Open Settings (gear icon) in the app
3. Enable AI Features and paste your Groq API key
4. Optionally select your preferred AI model

Your API key is stored locally in your browser and never saved on any server.

### Environment Variables

```bash
# Required for authentication (Optional feature)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk-your-api-here
CLERK_SECRET_KEY=sk-your-api-key-here

NEXT_PUBLIC_WEB_URL=http://localhost:3000

# Google Calendar integration (Optional)
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

## Authentication & Calendar Integration (Optional)

Cue uses Clerk for secure authentication and Google Calendar integration:

- **Secure Sign-in**: Sign in with your Google account through Clerk
- **Calendar Sync**: Automatically sync your tasks with Google Calendar
- **Smart Notifications**: Get timely reminders for your tasks through Google Calendar
- **Privacy First**: Your calendar data is only accessed with your explicit permission

To enable Google Calendar integration:
1. Set up `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in your `.env.local`
2. Configure Google OAuth in your Clerk dashboard
3. Sign in with your Google account
4. Grant calendar access permissions when prompted

## Development

```bash
# Lint code
pnpm run lint

# Type check
pnpm run tc

# Build for production
pnpm run build
```

## License

MIT
