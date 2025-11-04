# Todo App

A modern, desktop todo application built with React, TypeScript, Tailwind CSS, and Tauri.

## Features

- ✅ Clean, modern UI with light/dark theme support
- ✅ Task management with priorities and due dates
- ✅ Dashboard view for today's tasks
- ✅ All tasks and completed tasks views
- ✅ **SQLite database persistence** (Phase 2)
- ✅ **Task attachments** - attach files to tasks
- ✅ **Projects/categories** - organize tasks by project
- ✅ **System notifications** - reminders for due tasks
- ✅ **System tray** - quick access menu
- ✅ **Auto-start option** - launch on system boot
- ✅ **Backup & restore** - timestamped database backups
- ✅ **Import/Export** - JSON data portability
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

### Setting up Rust on Windows

After installing Rust, you need to add Cargo to your PATH:

**Option 1: Windows GUI (Recommended)**
1. Press `Win + X` → Select "System"
2. Click "Environment Variables"
3. Under "User variables", select "Path" → Click "Edit"
4. Click "New" → Add: `C:\Users\YOUR_USERNAME\.cargo\bin`
5. Click "OK" on all dialogs
6. **Restart PowerShell** for changes to take effect

**Option 2: PowerShell (Permanent)**
```powershell
[Environment]::SetEnvironmentVariable("Path", $env:Path + ";$env:USERPROFILE\.cargo\bin", "User")
```
Then restart PowerShell.

**Verify installation:**
```powershell
cargo --version
```

**If you still get "program not found" errors:**
The project includes wrapper scripts (`run-tauri-dev.cmd` and `run-tauri-build.cmd`) that automatically add Cargo to PATH before running Tauri commands. These are used by the npm scripts automatically.

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
│   ├── api/            # Tauri API adapter
│   ├── components/     # Reusable UI components
│   ├── pages/          # Page components
│   ├── store/          # Zustand state management
│   ├── utils/          # Utility functions and hooks
│   ├── App.tsx         # Main app component with routing
│   └── main.tsx        # Entry point
├── src-tauri/
│   ├── src/
│   │   ├── main.rs     # Tauri setup, tray, command registration
│   │   ├── db.rs       # Database connection & migrations
│   │   ├── commands.rs # Task/project/backup/import/export commands
│   │   ├── notifications.rs # Notification helpers
│   │   └── attachments.rs   # File copy helper
│   └── migrations/     # SQL migration files
├── package.json
└── README.md
```

## Phase 2 Status

✅ SQLite database with migrations
✅ Task CRUD via Tauri commands
✅ Project management
✅ Subtasks support
✅ File attachments
✅ System notifications
✅ System tray with quick actions
✅ Auto-start toggle (setting stored, OS implementation pending)
✅ Backup/restore functionality
✅ Import/export JSON
✅ Settings page with all controls

## Data Storage

### Database Location

The SQLite database and all app data are stored in your OS-specific app data directory:

- **Windows**: `%APPDATA%\com.todoapp.dev\`
- **macOS**: `~/Library/Application Support/com.todoapp.dev/`
- **Linux**: `~/.local/share/com.todoapp.dev/`

Files:
- `todo.db` - Main SQLite database
- `backups/` - Timestamped database backups
- `attachments/` - Task attachment files

### Backup & Restore

**Create Backup:**
1. Go to Settings page
2. Click "Create Backup"
3. A timestamped copy of your database will be saved in the `backups/` folder

**Restore Backup:**
1. Go to Settings page
2. Click "Restore from Backup"
3. Select a `.db` file from the backups folder
4. Confirm the restore (this replaces your current database)
5. Restart the app to see restored data

**Note**: The app creates a backup of your current database before restoring, saved as `todo.db.bak`.

### Import/Export

**Export Data:**
1. Go to Settings page
2. Click "Export Data (JSON)"
3. Choose a location to save the JSON file
4. The export includes: tasks, projects, subtasks, attachments metadata, and settings

**Import Data:**
1. Go to Settings page
2. Click "Import Data (JSON)"
3. Select a previously exported JSON file
4. Confirm the import (merges or replaces existing data by ID)
5. The app will reload to show imported data

**Import Format:**
```json
{
  "tasks": [...],
  "projects": [...],
  "subtasks": [...],
  "attachments": [...],
  "settings": {...},
  "exported_at": 1234567890
}
```

## Troubleshooting

### Database Issues

**Database not found or corrupted:**
- The app will automatically create a new database on first run
- If you see errors, delete the `todo.db` file and restart the app
- Your data will be reset, but you can restore from a backup if available

**Migrations fail:**
- Check that `src-tauri/migrations/` folder exists with SQL files
- In development, migrations are read from `src-tauri/migrations/`
- In production, they should be bundled with the app

### Notifications Not Working

- Check Settings to ensure notifications are enabled
- On Windows/macOS, verify system notification permissions
- Notifications check for due tasks on app startup and when tasks are updated

### System Tray Not Appearing

- On Linux, ensure your desktop environment supports system trays
- The tray icon appears in your system's notification area
- Right-click the icon to access the menu

### Attachments Not Saving

- Verify the app has write permissions to the app data directory
- Check disk space availability
- Attachments are stored in `attachments/{task_id}/` subdirectories

### Logs

- Tauri logs: Check the console output when running `npm run tauri:dev`
- Database errors: Displayed in the app UI and console
- File operation errors: Check browser console for frontend errors

### Common Issues

**App won't start:**
- Ensure Rust toolchain is installed: `rustc --version`
- Run `npm install` to ensure dependencies are installed
- Check that port 5173 is available for the dev server

**Build fails:**
- On Windows: Install Microsoft C++ Build Tools
- Ensure all Rust dependencies compile: `cd src-tauri && cargo build`
- Check `tauri.conf.json` for correct paths

**Data not persisting:**
- Verify the app data directory is writable
- Check that migrations ran successfully (should happen automatically)
- Look for database file in app data directory

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

