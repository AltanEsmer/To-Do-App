# Todo App

A modern, desktop todo application built with React, TypeScript, Tailwind CSS, and Tauri.

## Features

- ✅ Clean, modern UI with light/dark theme support
- ✅ Task management with priorities and due dates
- ✅ Dashboard view for today's tasks
- ✅ All tasks and completed tasks views
- ✅ In-memory state management (no persistence in Phase 1)
- ✅ Accessible components with keyboard navigation
- ✅ Smooth animations with Framer Motion

## Tech Stack

- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI primitives
- **State Management**: Zustand
- **Routing**: React Router
- **Animations**: Framer Motion
- **Desktop**: Tauri
- **Testing**: Vitest
- **Linting/Formatting**: ESLint + Prettier

## Prerequisites

- Node.js 18+ and npm
- Rust (for Tauri) - [Install Rust](https://www.rust-lang.org/tools/install)
- For Windows: Microsoft C++ Build Tools

**Note**: Tauri icons are placeholder. To generate proper app icons, use tools like [Tauri Icon Generator](https://github.com/tauri-apps/tauri-icon) or add your own icons to `src-tauri/icons/`.

## Quick Start

### Installation

```bash
npm install
```

### Development

**Web only (Vite dev server):**
```bash
npm run dev
```
Opens at `http://localhost:5173`

**Desktop app (Tauri):**
```bash
npm run tauri:dev
```
This will start the Vite dev server and launch the Tauri desktop app.

### Building

**Web build:**
```bash
npm run build
```

**Desktop app build:**
```bash
npm run tauri:build
```

**Note**: For cross-platform builds (e.g., building Windows app on macOS or Linux), you may need to:
- Install cross-compilation toolchains
- Use GitHub Actions or similar CI/CD
- Or build on the target platform directly

The built app will be in `src-tauri/target/release/`

### Other Commands

```bash
npm run lint          # Run ESLint
npm run format        # Format code with Prettier
npm run format:check  # Check formatting without fixing
npm run test          # Run tests with Vitest
npm run test:ui       # Run tests with UI
```

## Project Structure

```
/
├── src/
│   ├── components/      # Reusable UI components
│   ├── pages/          # Page components
│   ├── store/          # Zustand state management
│   ├── utils/          # Utility functions and hooks
│   ├── App.tsx         # Main app component with routing
│   └── main.tsx        # Entry point
├── src-tauri/          # Tauri Rust backend (minimal in Phase 1)
├── package.json
└── README.md
```

## Phase 1 Status

✅ Project setup complete
✅ Tailwind CSS with theme toggle
✅ ESLint + Prettier configured
✅ Tauri initialized (minimal setup)
✅ All pages and components implemented
✅ Zustand store with in-memory CRUD
✅ Basic accessibility features
✅ Framer Motion animations

## Next Phase TODOs (Phase 2)

### Persistence
- [ ] Add local storage persistence for tasks
- [ ] Consider IndexedDB for larger datasets
- [ ] Implement data export/import

### Native Features
- [ ] System notifications for due tasks
- [ ] Tray icon and menu
- [ ] Global keyboard shortcuts
- [ ] Auto-start on system boot (optional)

### Enhanced Features
- [ ] Task categories/projects
- [ ] Task search and filtering
- [ ] Task templates
- [ ] Recurring tasks
- [ ] Task attachments
- [ ] Rich text descriptions

### Sync & Collaboration
- [ ] Cloud sync (optional)
- [ ] Multi-device support
- [ ] User authentication
- [ ] Sharing and collaboration features

### Performance & Polish
- [ ] Virtualized lists for large task lists
- [ ] Performance optimizations
- [ ] Additional animations and transitions
- [ ] Custom themes/color schemes

## Accessibility

The app includes:
- Keyboard navigation support
- ARIA labels and roles
- Focus management in modals
- Semantic HTML structure
- High contrast support (via theme)

## Contributing

This is a personal project, but suggestions and improvements are welcome!

## License

MIT

