# Pre-Release Checklist

## Before Building

- [ ] Update version numbers in:
  - [ ] `src-tauri/tauri.conf.json` → `package.version`
  - [ ] `src-tauri/Cargo.toml` → `version`
  - [ ] `package.json` → `version`

- [ ] Update app metadata:
  - [ ] `package.productName` in tauri.conf.json
  - [ ] `tauri.bundle.identifier` (change from `com.todoapp.dev`)
  - [ ] `description` in Cargo.toml
  - [ ] `authors` in Cargo.toml
  - [ ] Add `license` in Cargo.toml (if applicable)
  - [ ] Add `repository` in Cargo.toml (if applicable)

- [ ] Verify all icons exist in `src-tauri/icons/`:
  - [ ] 32x32.png
  - [ ] 128x128.png
  - [ ] 128x128@2x.png
  - [ ] icon.icns (macOS)
  - [ ] icon.ico (Windows)
  - [ ] icon.png (system tray)

- [ ] Test in development mode:
  - [ ] All features work
  - [ ] No console errors
  - [ ] Database migrations work
  - [ ] Translation feature works
  - [ ] Backup/restore works
  - [ ] Import/export works

## Build Process

- [ ] Run `npm install` to ensure dependencies are up to date
- [ ] Run `npm run tauri:build`
- [ ] Verify build completed successfully
- [ ] Check output directory for installers

## Testing Built App

- [ ] Install on clean system
- [ ] Test first launch (database creation)
- [ ] Test all major features
- [ ] Test on different OS versions (if possible)
- [ ] Verify no console errors in production build
- [ ] Test file permissions
- [ ] Test system tray
- [ ] Test notifications
- [ ] Test keyboard shortcuts

## Distribution

- [ ] Create release notes
- [ ] Tag release in Git (e.g., `v1.0.0`)
- [ ] Upload installers to distribution platform
- [ ] Update documentation
- [ ] Announce release

## Optional: Code Signing

- [ ] Obtain code signing certificate (Windows/macOS)
- [ ] Configure signing in tauri.conf.json or environment
- [ ] Test signed build
- [ ] Verify signature (Windows: right-click → Properties → Digital Signatures)



