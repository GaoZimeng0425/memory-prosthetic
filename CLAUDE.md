# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Memory Prosthetic is a local-first knowledge management tool with a desktop application (Tauri + React) and browser extension (WXT). It enables semantic search, knowledge graph visualization, and one-click web content capture.

## Architecture

### Monorepo Structure
```
memory-prosthetic/
├── apps/
│   ├── desktop/              # Tauri desktop app (React 19 + Rust)
│   └── browser-extension/   # Chrome extension (WXT + React)
└── packages/
    ├── ai/                  # AI utilities, embeddings, semantic search
    ├── editor/              # Rich text editor components
    ├── shared/              # Shared types, utilities, API clients
    └── ui/                  # Shared UI component library (70+ shadcn/ui components)
```

### Key Technologies
- **Frontend**: React 19, TypeScript 5.9, TanStack Router & Query, Zustand, TailwindCSS 4
- **Desktop**: Tauri 2.x (Rust backend with Axum HTTP server)
- **Browser Extension**: WXT (Manifest V3)
- **Database**: SQLite with sqlite-vec for vector embeddings
- **AI**: Local embedding model (all-MiniLM-L6-v2) via ONNX Runtime
- **Build Tools**: Bun workspaces, Vite, Biome for formatting

## Development Commands

### Root Level Commands
```bash
# Install dependencies
bun install

# Development
bun run dev:desktop              # Start desktop app
bun run dev:browser-extension    # Start browser extension dev server

# Building
bun run build:desktop            # Build desktop app (creates .dmg on macOS)
bun run build:browser-extension  # Build browser extension (creates .zip)
bun run build                    # Build both with version bump and Slack notifications

# Code Quality
bun run format                   # Format code with Biome
```

### Workspace-Specific Commands
```bash
# Run commands in specific packages
bun run --filter @memory-prosthetic/desktop dev
bun run --filter @memory-prosthetic/browser-extension dev

# Tauri commands (from desktop app directory)
cd apps/desktop
bun run tauri dev                # Tauri development
bun run tauri build              # Tauri production build
```

### Browser Extension Commands
```bash
cd apps/browser-extension
bun run dev                      # Development server
bun run build                    # Build extension
bun run zip                      # Build and create .zip for distribution
bun run dev:firefox              # Firefox development
bun run build:firefox            # Firefox build
```

## Build System

### Custom Build Script (`scripts/build.ts`)
The `bun run build` command runs a sophisticated build script that:
1. Optionally bumps version numbers (patch increment)
2. Builds desktop app (Tauri) and/or browser extension (WXT)
3. Copies artifacts to `.output/` directory
4. Sends Slack notifications (requires `SLACK_BOT_TOKEN` and `SLACK_CHANNEL_ID` env vars)
5. Updates version in: `package.json`, `tauri.conf.json`, and `Cargo.toml`

### Build Artifacts
- Desktop: `.dmg` files (macOS) in `.output/`
- Browser Extension: `.zip` files in `.output/`

## Code Style & Quality

### Biome Configuration
- **Line width**: 120 characters
- **Indent**: 2 spaces
- **Quote style**: Single quotes, double for JSX
- **Import organization**: Groups imports by type (Bun, Node, npm, React, internal packages)
- **Exclusions**: `packages/ui/src/components/ui/**` and `packages/editor/src/components/ui/**` (generated shadcn/ui components)

### Key Rules
- `noInferrableTypes`: error (don't write explicit types that can be inferred)
- `useAsConstAssertion`: error (use `as const` for literal types)
- `noUnusedVariables`: warn
- `noUnusedImports`: warn
- `noExplicitAny`: warn
- `noFloatingPromises`: warn

### Formatting
Run `bun run format` to format all code. Uses `lint-staged` for pre-commit formatting.

## Architecture Patterns

### Communication
- **Desktop ↔ Browser Extension**: HTTP on localhost:21890
- **Frontend ↔ Backend**: Tauri commands (Rust) + Axum HTTP server
- **State Management**: Zustand stores + TanStack Query for server state

### Data Flow
1. Browser extension captures web content → sends to desktop app via HTTP
2. Desktop app processes content → stores in SQLite with embeddings
3. Frontend queries content via Tauri commands or HTTP API
4. Semantic search uses local embedding model via ONNX Runtime

### Database
- SQLite with `sqlite-vec` extension for vector similarity search
- Rust backend manages all database operations
- Local-first architecture: all data stored on user's machine

### AI Components
- Embedding model: `all-MiniLM-L6-v2` (384 dimensions)
- ONNX Runtime for local inference
- Vector search via `sqlite-vec`
- Knowledge graph visualization with @antv/g6

## Development Notes

### Prerequisites
- **Bun** (>= 1.0) - package manager and runtime
- **Rust** (>= 1.70) - Tauri backend
- **Node.js** (>= 18) - for some tooling
- **System dependencies**: Xcode CLI tools (macOS), webkit2gtk (Linux), VC++ Build Tools (Windows)

### Workspace Management
This is a Bun workspace monorepo. Each package has its own `package.json` and can be developed independently.

### UI Components
- Uses shadcn/ui with TailwindCSS 4
- Components are in `packages/ui/src/components/ui/` (generated, excluded from formatting)
- Custom components in `packages/ui/src/components/`

### Testing
- No test framework configured in root package.json
- Check individual app directories for test configurations

### Environment Variables
- `SLACK_BOT_TOKEN` and `SLACK_CHANNEL_ID`: For build notifications (optional)
- Desktop app may have additional Tauri-specific environment variables

## Common Development Tasks

### Adding a New Feature
1. Determine if it belongs in desktop app, browser extension, or shared package
2. For UI components: add to `packages/ui` if reusable
3. For business logic: add to appropriate package (`shared`, `ai`, `editor`)
4. Update types in `packages/shared` if needed
5. Add Tauri commands in `apps/desktop/src-tauri/src/` for desktop features

### Debugging
- Desktop app: Use browser dev tools (right-click in app)
- Browser extension: Use Chrome/Firefox extension dev tools
- Rust backend: Logs appear in terminal running `bun run dev:desktop`

### Database Changes
1. Modify Rust database code in `apps/desktop/src-tauri/src/`
2. SQLite migrations may be needed (check existing patterns)
3. Update TypeScript types in `packages/shared` if schema changes

### Browser Extension Development
- Uses WXT framework (similar to Vite)
- Entry points in `apps/browser-extension/src/entrypoints/`
- Communicates with desktop app via HTTP on port 21890
- Check if desktop app HTTP server is running when testing extension