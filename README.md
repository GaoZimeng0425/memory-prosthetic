# Memory Prosthetic

> A local-first knowledge management tool that helps you collect, organize, and search your personal knowledge content.

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19.2-blue)](https://react.dev/)
[![Tauri](https://img.shields.io/badge/Tauri-2.x-purple)](https://tauri.app/)

## 📖 Overview

> **🤖 Fully AI-Developed**: This project was developed entirely by autonomous AI agents using the [BMAD-METHOD](https://github.com/bmad-code-org/BMAD-METHOD) workflow methodology.

**Memory Prosthetic** (记忆外挂) is a desktop application that transforms vague memories into precise retrieval. It allows you to:

- 📥 **Collect** web content from your browser with one click
- 🔍 **Search** semantically using local AI embeddings
- 📁 **Organize** with favorites and tags
- 🗺️ **Visualize** knowledge graphs
- 🔌 **Integrate** with AI assistants via MCP protocol

**Core Philosophy:** *Think it, find it. See it, remember it.*

## ✨ Features

### Desktop Application

- **Semantic Search**: Find content by meaning, not just keywords
- **Knowledge Graph**: Visualize relationships between your saved content
- **Local-First**: All data stored locally, privacy guaranteed
- **Fast Retrieval**: Spotlight-like quick access
- **MCP Integration**: Connect with AI assistants for enhanced workflows

### Browser Extension

- **One-Click Save**: Capture web pages instantly
- **Smart Extraction**: Automatically extracts main content
- **Tag Management**: Add tags while saving
- **Seamless Sync**: Works seamlessly with desktop app

## 🏗️ Architecture

This is a **monorepo** project using workspaces:

```
memory-prosthetic/
├── apps/
│   ├── desktop/              # Tauri desktop application
│   └── browser-extension/  # Chrome browser extension (WXT)
└── packages/
    ├── ai/                  # AI utilities and embeddings
    ├── editor/              # Rich text editor components
    ├── shared/              # Shared types and utilities
    └── ui/                  # Shared UI component library
```

### Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| **Desktop Framework** | Tauri | 2.x |
| **Frontend Framework** | React | 19.2 |
| **Language** | TypeScript | 5.0 |
| **State Management** | Zustand + TanStack Query | Latest |
| **UI Components** | shadcn/ui + TailwindCSS | Latest |
| **Database** | SQLite + sqlite-vec | Latest |
| **AI Model** | all-MiniLM-L6-v2 | Local Embedding |
| **Browser Extension** | WXT | Manifest V3 |
| **Package Manager** | Bun | Latest |

## 🚀 Getting Started

### Prerequisites

- **Bun** (>= 1.0) - [Install Bun](https://bun.sh)
- **Rust** (>= 1.70) - [Install Rust](https://www.rust-lang.org/tools/install)
- **Node.js** (>= 18) - For some tooling
- **System Dependencies** (for Tauri):
  - macOS: Xcode Command Line Tools
  - Linux: `libwebkit2gtk-4.0-dev`, `libssl-dev`, etc.
  - Windows: Microsoft Visual C++ Build Tools

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd memory-prosthetic
   ```

2. **Install dependencies**

   ```bash
   bun install
   ```

3. **Start development server**

   ```bash
   # Desktop app
   bun run dev:desktop

   # Browser extension
   bun run dev:browser-extension
   ```

### Building

```bash
# Build desktop app
bun run build:desktop

# Build browser extension
bun run build:browser-extension

# Build all
bun run build
```

## 📁 Project Structure

### Apps

#### `apps/desktop/`

Tauri-based desktop application with:

- React 19 + TypeScript frontend
- Rust backend for native operations
- SQLite database with vector search
- Knowledge graph visualization (@antv/g6)

#### `apps/browser-extension/`

Browser extension built with WXT:

- Manifest V3 compatible
- React-based popup and content scripts
- One-click content capture

### Packages

#### `packages/ai/`

AI utilities for:

- Embedding generation
- Semantic search
- Local model management

#### `packages/editor/`

Rich text editor components:

- Content editing capabilities
- Markdown support
- Custom formatting

#### `packages/shared/`

Shared code across apps:

- Type definitions
- Utility functions
- API clients
- Constants

#### `packages/ui/`

Reusable UI component library:

- 70+ components based on shadcn/ui
- TailwindCSS styling
- Accessible and customizable

## 📚 Documentation

### User & Developer Documentation

Located in `docs/` directory:

- 📋 [API Endpoints](./docs/api-endpoints.md) - Complete backend API reference
- 🏗️ [Architecture](./docs/architecture.md) - System architecture and design decisions
- 📖 [Development Guide](./docs/development-guide.md) - Setup and development workflow
- 📝 [Project Overview](./docs/project-overview.md) - Project background and features
- 🔌 [Integration Architecture](./docs/integration-architecture.md) - MCP and external integrations
- 🗺️ [AI Graph Architecture](./docs/architecture-ai-graph-separation.md) - AI and graph system design
- 📚 [Documentation Guide](./docs/README.md) - Documentation organization and navigation

### BMAD Development Artifacts

Located in `_bmad-output/` directory (internal):

- **PRD & Epics**: Product requirements and task breakdown
- **Architecture**: Source architecture documents
- **Implementation**: Technical specs and implementation plans
- **Workflows**: BMAD workflow execution history
- 📖 [BMAD Output Guide](./_bmad-output/README.md) - Internal documentation structure

## 🛠️ Development

### Available Scripts

```bash
# Development
bun run dev:desktop              # Start desktop app in dev mode
bun run dev:browser-extension    # Start browser extension dev server

# Building
bun run build:desktop            # Build desktop app
bun run build:browser-extension  # Build browser extension
bun run build                    # Build all apps

# Code Quality
bun run format                   # Format code with Biome
```

### Code Style

This project uses:

- **Biome** for formatting and linting
- **TypeScript** strict mode
- **ESLint** compatible rules

Run formatting:

```bash
bun run format
```

### Workspace Management

This is a Bun workspace monorepo. Each package can be run independently:

```bash
# Run a specific package
bun run --filter @memory-prosthetic/desktop dev

# Build a specific package
bun run --filter @memory-prosthetic/desktop build
```

## 🤖 Development

This project was **developed entirely by AI agents** using advanced autonomous development methodologies.

### AI-Agent Development

The entire codebase, including features, bug fixes, documentation, and infrastructure, was created through autonomous AI agent collaboration using:

- **Claude Code** (Anthropic) - Primary AI development agent
- **BMAD Method** - Structured AI-agent development workflow
- **Autonomous Testing & Review** - Automated code quality assurance
- **Iterative Development** - Continuous AI-driven improvement

Special thanks to the **[BMAD-METHOD](https://github.com/bmad-code-org/BMAD-METHOD)** project for providing the structured workflow methodology that enabled this fully autonomous development process.

### Traditional Development

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

### Development Methodology
- **[BMAD-METHOD](https://github.com/bmad-code-org/BMAD-METHOD)** - For the revolutionary AI-agent development methodology that made this project possible
- **[Claude Code](https://claude.ai/code)** - For the powerful AI development agent

### Technologies & Libraries
- **[Tauri](https://tauri.app/)** - For the amazing desktop framework
- **[shadcn/ui](https://ui.shadcn.com/)** - For beautiful UI components
- **[TanStack](https://tanstack.com/)** - For excellent React libraries
- **[WXT](https://wxt.dev/)** - For browser extension tooling

## 📧 Contact

For questions, issues, or contributions, please open an issue on GitHub.

---

**Made with ❤️ for knowledge workers who want to remember everything.**
