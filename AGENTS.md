# Cue

This is an AI-powered task manager PWA built with Next.js, using natural language processing to organize tasks with local IndexedDB storage and optional Google Calendar sync.

This project uses pnpm.

## Build Commands

- `pnpm run dev` - Start development server
- `pnpm run build` - Build for production (uses --turbo)
- `pnpm run lint` - Run ESLint
- `pnpm run tc` - Run TypeScript type check

## Tech Stack Notes

- **Next.js 15** with App Router
- **React 19** with Server Components
- **TailwindCSS v4** for styling
- **Zustand** for state management
- **Dexie/IndexedDB** for local storage
- **Clerk** for optional authentication
- **Vercel AI SDK** for AI features (Claude, Llama, Grok, Qwen)

## Architecture

- `/app` - Next.js App Router pages and API routes
- `/components` - React components (UI in `/components/ui`)
- `/stores` - Zustand state stores
- `/types` - TypeScript type definitions
- `/public` - Static assets and PWA icons

## Plan Mode

When creating plans:

- Make the plan extremely concise. Sacrifice grammar for the sake of concision.
- At the end of each plan, give me a list of unresolved questions to answer, if any.

