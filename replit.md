# Code Vortex – Gemini DevOps Copilot

## Overview
Code Vortex is a comprehensive full-stack developer assistant application that combines AI-powered code assistance with real-time GitHub repository analytics. Built with React, TypeScript, Express, and Gemini AI.

## Key Features
- **AI Coding Copilot**: Streaming code generation, test creation, documentation, and refactoring using Gemini AI
- **Explainable AI**: Line-by-line code analysis with risk assessment, security issues, and performance notes
- **GitHub Analytics Dashboard**: Real-time insights including commits (7 days), PRs, issues, and repository hotspots
- **Interactive Charts**: Commit activity timeline, PR status breakdown, and contributor activity visualization
- **Repository Hotspot Analysis**: Identifies high-risk files with commit frequency tracking and AI-powered insights
- **Glassmorphism Design**: Modern dark mode UI with 3D floating elements, particle effects, and smooth animations

## Project Structure
```
├── client/
│   ├── src/
│   │   ├── components/          # React components
│   │   │   ├── ui/              # shadcn/ui components
│   │   │   ├── app-sidebar.tsx  # Navigation sidebar
│   │   │   ├── theme-provider.tsx
│   │   │   ├── theme-toggle.tsx
│   │   │   ├── particle-background.tsx
│   │   │   └── floating-shapes.tsx
│   │   ├── pages/               # Application pages
│   │   │   ├── home.tsx         # Landing page with 3D effects
│   │   │   ├── copilot.tsx      # AI code assistant
│   │   │   ├── explain.tsx      # Code explanation tool
│   │   │   ├── dashboard.tsx    # GitHub analytics
│   │   │   └── settings.tsx     # Configuration
│   │   ├── App.tsx
│   │   └── index.css
│   └── index.html
├── server/
│   ├── routes.ts               # API routes
│   ├── storage.ts              # In-memory storage
│   └── app.ts
├── shared/
│   └── schema.ts               # TypeScript schemas and types
└── design_guidelines.md        # UI/UX design specifications
```

## Tech Stack
- **Frontend**: React 18, TypeScript, Tailwind CSS, shadcn/ui, Wouter (routing)
- **Backend**: Express.js, Node.js
- **AI**: Google Gemini API (gemini-2.0-flash, gemini-1.5-pro)
- **Data Fetching**: React Query (TanStack Query)
- **Charts**: Recharts
- **Fonts**: Inter (UI), JetBrains Mono (code)

## Recent Changes (2025-01-21)

### Phase 1: Schema & Frontend ✅
- Configured design system with indigo/purple/cyan color scheme
- Added custom animations (float, pulse-glow, shimmer)
- Implemented all data schemas and TypeScript interfaces
- Built complete frontend with all pages and components:
  - Landing page with particle background and 3D floating shapes
  - AI Copilot with chat interface and mode selection
  - Explainable AI analyzer with risk assessment badges
  - GitHub Analytics dashboard with animated counters and Recharts visualizations
  - Settings page for GitHub PAT and AI model selection
- Created theme provider with dark/light mode toggle
- Set up sidebar navigation with glassmorphism styling

### Phase 2: Backend Implementation ✅
- Implemented Gemini AI service (server/gemini.ts) for:
  - Code generation with multiple modes (generate, test, document, refactor, boilerplate)
  - Line-by-line code explanation with risk assessment
  - Repository hotspot file analysis
- Implemented GitHub API integration service (server/github.ts) for:
  - Repository listing and selection
  - Commit activity tracking (7-30 days)
  - PR status (open/merged/closed)
  - Contributor statistics
  - Hotspot file detection with commit frequency
- Created all API routes with proper validation and error handling

### Phase 3: Integration & Polish ✅
- Connected frontend to backend with React Query
- Fixed queryClient to properly handle credentials and GitHub PAT authorization
- Implemented loading skeletons and error states throughout
- Added animated counters for dashboard metrics
- Tested GitHub integration successfully (repositories, commits, contributors, hotspots)
- Application gracefully handles missing Gemini API key

## Configuration
- **GitHub PAT**: Stored in localStorage, configured in Settings page
- **AI Model**: User can toggle between Gemini Flash (fast) and Pro (advanced)
- **Theme**: Dark mode by default, switchable in Settings

## Environment Variables
- `GEMINI_API_KEY`: Google Gemini API key for AI features (requested from user on first AI operation)

## Application Status
✅ **Fully Functional** - All core features implemented and tested:
- GitHub analytics dashboard with real-time data
- AI-powered code assistance (requires GEMINI_API_KEY)
- Explainable AI code analyzer (requires GEMINI_API_KEY)
- Repository hotspot detection
- Beautiful glassmorphism UI with dark/light mode
- Responsive design across all breakpoints

## Known Limitations
- AI features require valid GEMINI_API_KEY environment variable
- Streaming AI responses: Currently single-shot (can be enhanced with SSE/WebSocket)
