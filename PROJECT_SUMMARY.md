# Project: RSVP Speed Reader

## Overview
A full-stack speed reading application implementing RSVP (Rapid Serial Visual Presentation) with ORP (Optimal Recognition Point) highlighting, designed to improve reading speed and focus -- particularly for users with ADHD. The project includes both a Python desktop GUI prototype and a polished Next.js web application with AI-powered lesson generation, allowing users to either upload text files or generate custom learning content on any topic through natural language prompts.

## Tech Stack & Skills
- **Languages:** Python 3, TypeScript, CSS
- **Frontend Framework:** Next.js 16 (App Router, React Server Components architecture)
- **UI Library:** React 19
- **Component System:** shadcn/ui (New York style) with Radix UI primitives (Slider, Progress, Slot)
- **Styling:** Tailwind CSS 4 with PostCSS, tw-animate-css for animations, CSS custom properties (oklch color space)
- **Icons:** Lucide React
- **AI Integration:** Puter.js (browser-based AI chat API with streaming support)
- **Desktop GUI:** Python tkinter
- **Utility Libraries:** clsx, tailwind-merge, class-variance-authority
- **Build & Tooling:** npm, ESLint 9 (with Next.js core-web-vitals and TypeScript configs), TypeScript 5 (strict mode)
- **Fonts:** Geist Sans and Geist Mono (loaded via next/font/google)
- **Deployment Target:** Vercel (also compatible with Netlify, Railway, AWS Amplify)

## Architecture & How It Works

### Project Structure
The project is organized into two independent implementations:

1. **Python Desktop App** (`speed_reader.py`) -- A standalone tkinter-based GUI application that serves as the original prototype.
2. **Next.js Web App** (`web/`) -- A modern, production-oriented web application built with the Next.js App Router pattern.

### Web Application Architecture
The web app follows a single-page component architecture centered around one primary client component:

- `src/app/layout.tsx` -- Root layout with font configuration and metadata
- `src/app/page.tsx` -- Minimal page component that renders the SpeedReader
- `src/components/speed-reader.tsx` -- Core application logic (~1,000 lines), managing all state, playback, AI generation, and UI rendering in a single cohesive component
- `src/components/ui/` -- Reusable shadcn/ui primitives (Button, Card, Progress, Slider) built on Radix UI
- `src/lib/utils.ts` -- Tailwind class merging utility

### Core Algorithm: Optimal Recognition Point (ORP)
Both implementations share the same ORP calculation algorithm. The ORP determines which character in a word should be highlighted (in red) as the natural eye fixation point. The algorithm maps word length to an index position slightly left of center:
- 1 character: index 0
- 2-5 characters: index 1
- 6-9 characters: index 2
- 10-13 characters: index 3
- 14+ characters: index 4

The word is split into three segments (before ORP, the ORP letter, after ORP) and rendered with the ORP letter styled in a contrasting red/pink gradient.

### Playback Engine
The reading engine uses a timer-based word advancement system with intelligent pacing:
- Base delay is calculated from the selected WPM (words per minute)
- Sentence-ending punctuation (`.`, `!`, `?`) triggers a 1.5x delay multiplier for natural pauses
- Mid-sentence punctuation (`,`, `;`, `:`) triggers a 1.2x delay multiplier
- The playback loop is managed through React's useEffect with proper cleanup of timeouts

### AI Lesson Generation
The web app integrates Puter.js, a browser-based AI service that requires no API keys. The generation flow:
1. User inputs a topic, specific learning goals, explanation style, and desired word count
2. A structured prompt is sent to the Puter.js AI chat endpoint with streaming enabled
3. The streaming response is parsed in real-time using a regex-based lesson delimiter pattern (`===LESSON: [Title]===`)
4. Parsed lessons are loaded into the reader as a navigable sequence with progress tracking

### State Management
All application state is managed with React hooks (useState, useCallback, useRef, useEffect) within the single SpeedReader component. The application uses a mode-based state machine with three modes: `home`, `reading`, and `lesson-complete`.

## Key Features
- **RSVP word-by-word display** with configurable speed from 100 to 800 WPM
- **ORP highlighting** with a red/pink gradient on the optimal fixation character in each word
- **Smart punctuation pausing** that adds natural delays at sentence and clause boundaries
- **AI-powered lesson generation** with four explanation styles (ELI5, Summary, Technical, Examples) and configurable word counts (50-300 per lesson)
- **Streamed AI responses** with real-time progress feedback during generation
- **Multi-lesson navigation** with progress dots, next/previous controls, and lesson completion tracking
- **File upload support** with both click-to-upload and drag-and-drop functionality for .txt files
- **Full keyboard shortcut system** (Space for play/pause, arrow keys for skip/speed, Escape for restart)
- **Downloadable lesson export** that saves all generated lessons as a formatted text file
- **Animated dark theme UI** with gradient backgrounds, blur effects, and pulsing ambient elements
- **Speed tier labels** providing playful feedback (Chill Mode, Steady Reader, Speed Demon, Turbo Mode, Ludicrous Speed)
- **Rotating pro tips** on the home screen to help users learn the interface
- **Responsive design** with mobile-friendly layout and adaptive typography
- **ADHD-focused design** that eliminates eye movement and reduces visual distractions
- **Python desktop prototype** as an alternative standalone option using tkinter

## Completeness & Status
**Assessment: MVP / Feature-Complete for Core Functionality**

**What is implemented and working:**
- The core RSVP reading engine is fully functional across both Python and web implementations
- The ORP algorithm is complete and consistent between both platforms
- AI lesson generation is implemented with streaming, error handling, and fallback parsing
- The UI is polished with a cohesive dark theme, animations, gradients, and responsive layout
- Keyboard shortcuts are fully wired up with proper event handling
- File upload (both click and drag-and-drop) is operational
- Lesson navigation, re-reading, and download features are complete

**What could be improved or is missing:**
- No automated tests (unit, integration, or end-to-end)
- No persistent state (reading position, speed preference, generated lessons are lost on refresh)
- File upload limited to .txt files only (no PDF, EPUB, DOCX support)
- No user authentication or saved reading history
- The Python desktop app and web app are independent with no shared code or data
- No CI/CD pipeline or deployment configuration beyond the standard Next.js setup
- No accessibility (a11y) audit or ARIA attributes beyond what shadcn/ui provides by default
- The `nul` file in the project root appears to be an artifact (empty file, likely from a Windows command redirect)

**Maturity:** The web application is a polished MVP suitable for demonstration and personal use. The Python prototype is a functional proof-of-concept. Neither has been hardened for production deployment at scale, but the web app is deployment-ready for platforms like Vercel.

## GitHub Suitability
**Safe for public GitHub upload.** This project contains no sensitive content:

- **No API keys or secrets:** The Puter.js AI integration is entirely client-side and requires no API keys -- authentication is handled by the Puter.js service in the browser
- **No environment variables:** There are no `.env` files and no server-side secrets
- **No proprietary algorithms:** The ORP calculation is based on well-documented speed reading research and is not proprietary
- **No personal data:** The sample text file contains only generic speed reading instructional content
- **No credentials:** No passwords, tokens, or authentication credentials are present anywhere in the codebase
- **Proper .gitignore:** The web app's `.gitignore` correctly excludes `node_modules`, `.next`, `.env*`, and build artifacts

**Recommendations before publishing:**
- Remove the `nul` empty file from the project root (Windows artifact)
- Remove the `.claude/settings.local.json` file or add `.claude/` to a root-level `.gitignore` (it contains Claude Code permission settings, not secrets, but is not relevant to the project itself)
- Add a root-level `.gitignore` for the overall project
- Consider adding a LICENSE file if one is desired (the README references MIT but no LICENSE file exists)
