# Release Guide for Todo App

## Pre-Release Checklist

### 1. Update App Metadata

Before building, update these files:

**`src-tauri/tauri.conf.json`**:
- Update `package.productName` - Your app's display name
- Update `package.version` - Semantic version (e.g., "1.0.0")
- Update `tauri.bundle.identifier` - Change from `com.todoapp.dev` to your actual bundle ID (e.g., `com.yourcompany.todoapp`)

**`src-tauri/Cargo.toml`**:
- Update `version` to match tauri.conf.json
- Update `description` - Brief app description
- Update `authors` - Your name/company
- Add `license` - e.g., "MIT" or "Apache-2.0"
- Add `repository` - Your GitHub/GitLab URL (optional)

**`package.json`**:
- Update `version` to match other files
- Update `name` if needed

### 2. Test Thoroughly

- [ ] Test all features in production build
- [ ] Test on clean system (no dev dependencies)
- [ ] Verify database migrations work on fresh install
- [ ] Test translation feature with API key
- [ ] Test backup/restore functionality
- [ ] Test import/export
- [ ] Verify system tray works
- [ ] Test notifications
- [ ] Test keyboard shortcuts
- [ ] Verify auto-start functionality

### 3. Prepare Icons

Ensure all icon sizes are present in `src-tauri/icons/`:
- 32x32.png
- 128x128.png
- 128x128@2x.png
- icon.icns (macOS)
- icon.ico (Windows)
- icon.png (system tray)

### 4. Code Signing (Recommended for Production)

**Windows:**
- Obtain a code signing certificate (.pfx file)
- Set environment variables:
  ```powershell
  $env:TAURI_PRIVATE_KEY="path/to/certificate.pfx"
  $env:TAURI_KEY_PASSWORD="your_password"
  ```
- Or configure in `tauri.conf.json` under `tauri.bundle.windows.certificateThumbprint`

**macOS:**
- Requires Apple Developer account ($99/year)
- Configure signing in Xcode or use `codesign` command
- Notarize your app for Gatekeeper

**Linux:**
- Optional but recommended
- Can use GPG keys for package signing

### 5. Build the Production Version

```bash
# Build for current platform
npm run tauri:build

# The output will be in:
# Windows: src-tauri/target/release/bundle/msi/ (installer)
# macOS: src-tauri/target/release/bundle/dmg/ (disk image)
# Linux: src-tauri/target/release/bundle/deb/ or /appimage/
```

### 6. Test the Built App

1. Install the built app on a clean system
2. Test all functionality
3. Verify no console errors
4. Check file permissions
5. Test database creation and migrations

### 7. Distribution Options

**Option A: Direct Distribution**
- Host installers on your website
- Use file sharing services (Dropbox, Google Drive, etc.)
- Provide download links to users

**Option B: GitHub Releases** (Recommended)
1. Create a new release on GitHub
2. Tag the release (e.g., `v1.0.0`)
3. Upload installers as release assets
4. Write release notes

**Option C: App Stores**
- **Microsoft Store**: Requires developer account, submission process
- **Mac App Store**: Requires Apple Developer account, strict guidelines
- **Snap Store** (Linux): Requires snap package format

### 8. Important Notes

**Translation API Key:**
- Users must configure their own Google Translate API key in Settings
- Consider adding a note in the app or README about obtaining an API key
- The API key is stored securely in the database, not exposed to frontend

**Database Location:**
- Windows: `%APPDATA%\com.todoapp.dev\todo.db`
- macOS: `~/Library/Application Support/com.todoapp.dev/todo.db`
- Linux: `~/.local/share/com.todoapp.dev/todo.db`

**First Run:**
- App will create database automatically
- Migrations run automatically on first launch
- No user setup required

### 9. Update Documentation

- Update README.md with installation instructions
- Add changelog/CHANGELOG.md
- Document any breaking changes
- Provide troubleshooting guide

### 10. Version Bumping

For future releases, update version in:
1. `src-tauri/tauri.conf.json` → `package.version`
2. `src-tauri/Cargo.toml` → `version`
3. `package.json` → `version`

Use semantic versioning (MAJOR.MINOR.PATCH):
- MAJOR: Breaking changes
- MINOR: New features (backward compatible)
- PATCH: Bug fixes

## Quick Build Commands

```bash
# Development build (for testing)
npm run tauri:dev

# Production build
npm run tauri:build

# Build only for specific platform (if cross-compiling)
# Windows
npm run tauri:build -- --target x86_64-pc-windows-msvc

# macOS (requires macOS)
npm run tauri:build -- --target x86_64-apple-darwin
npm run tauri:build -- --target aarch64-apple-darwin

# Linux
npm run tauri:build -- --target x86_64-unknown-linux-gnu
```

## Troubleshooting Build Issues

**Out of Memory:**
- Close other applications
- Increase swap space
- Build on a machine with more RAM

**Icon Issues:**
- Ensure all icon files exist
- Check icon file formats (PNG for images, ICO for Windows, ICNS for macOS)

**Bundle Identifier Conflicts:**
- Change `tauri.bundle.identifier` to something unique
- Format: `com.yourcompany.appname`

**Missing Dependencies:**
- Run `npm install` before building
- Ensure Rust toolchain is up to date: `rustup update`

## Post-Release

1. Monitor for user feedback
2. Track bug reports
3. Plan next version features
4. Consider setting up automatic updates (Tauri updater)

