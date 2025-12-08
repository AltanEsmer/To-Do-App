# Release Checklist

Use this checklist before every release to ensure nothing is missed.

## Pre-Release Preparation

### Version Updates
- [ ] Update version in `package.json`
- [ ] Update version in `src-tauri/Cargo.toml`
- [ ] Update version in `src-tauri/tauri.conf.json`
- [ ] All three versions match exactly

### Metadata (First Release Only)
- [ ] Update `productName` in `tauri.conf.json`
- [ ] Update `bundle.identifier` to production (remove `.dev`)
- [ ] Update `authors` in `Cargo.toml`
- [ ] Update `description` in `Cargo.toml`
- [ ] Add `license` in `Cargo.toml`
- [ ] Add `repository` URL in `Cargo.toml` (optional)

### Icons
- [ ] All required icons exist in `src-tauri/icons/`:
  - [ ] 32x32.png
  - [ ] 128x128.png
  - [ ] 128x128@2x.png
  - [ ] icon.icns (macOS)
  - [ ] icon.ico (Windows)
  - [ ] icon.png (system tray)

### Updater Configuration (First Release Only)
- [ ] `updater` feature added to `Cargo.toml`
- [ ] Updater configuration in `tauri.conf.json`:
  - [ ] `active` set to `true`
  - [ ] `endpoints` URL updated with your GitHub username/repo
  - [ ] `dialog` set to `true`
  - [ ] `pubkey` contains your generated public key
- [ ] Private key generated and stored securely
- [ ] Private key added to `.gitignore`
- [ ] Private key NOT committed to Git
- [ ] GitHub Secrets configured (if using CI/CD):
  - [ ] `TAURI_PRIVATE_KEY` secret created
  - [ ] `TAURI_KEY_PASSWORD` secret created (if applicable)

### Code Quality
- [ ] Run tests: `npm run test`
- [ ] All tests passing
- [ ] Run linter: `npm run lint`
- [ ] No linter errors
- [ ] Test in dev mode: `npm run tauri:dev`
- [ ] All features working
- [ ] No console errors

### Git
- [ ] All changes committed
- [ ] Commit message includes version bump
- [ ] Changes pushed to main branch
- [ ] Working directory clean

---

## Build Process

### Local Build
- [ ] Dependencies up to date: `npm install`
- [ ] Production build: `npm run tauri:build`
- [ ] Build completed without errors
- [ ] Installers created in `src-tauri/target/release/bundle/`

### Signing
- [ ] Installer signed with tauri-signer:
  - [ ] Windows: `.msi.sig` created
  - [ ] macOS: `.app.tar.gz.sig` created
  - [ ] Linux: `.AppImage.sig` created
- [ ] Signature file verified (not empty)

### updater.json
- [ ] `updater.json` created with:
  - [ ] Correct version number
  - [ ] Release notes
  - [ ] Current date in ISO 8601 format
  - [ ] Platform-specific entries
  - [ ] Correct download URLs
  - [ ] Signature content from `.sig` file
- [ ] JSON is valid (no syntax errors)

---

## GitHub Release

### Tag
- [ ] Git tag created: `v{VERSION}` (with `v` prefix)
- [ ] Tag pushed to GitHub: `git push origin v{VERSION}`

### Release Creation
- [ ] GitHub Release created
- [ ] Tag: `v{VERSION}`
- [ ] Title: `TodoApp v{VERSION}`
- [ ] Description with release notes
- [ ] Files uploaded:
  - [ ] Installer (`.msi`, `.dmg`, or `.AppImage`)
  - [ ] Signature file (`.sig`)
  - [ ] `updater.json`
- [ ] Release published (not draft)

### Verify URLs
- [ ] Installer download URL works
- [ ] `updater.json` URL accessible:
  ```
  https://github.com/YOUR_USERNAME/YOUR_REPO/releases/latest/download/updater.json
  ```
- [ ] All files downloadable

---

## Testing

### Fresh Installation
- [ ] Download installer from GitHub Releases
- [ ] Install on clean system or VM
- [ ] App installs successfully
- [ ] App launches without errors
- [ ] Test core features:
  - [ ] Create task
  - [ ] Edit task
  - [ ] Delete task
  - [ ] Categories work
  - [ ] Filters work
  - [ ] Statistics display
  - [ ] Settings work
  - [ ] System tray works
- [ ] No console errors

### Auto-Update (Subsequent Releases)
- [ ] Install previous version
- [ ] Launch app
- [ ] Update dialog appears
- [ ] Click "Update"
- [ ] App updates successfully
- [ ] New version number shown
- [ ] All features still work

### Cross-Platform (if applicable)
- [ ] Test on Windows
- [ ] Test on macOS
- [ ] Test on Linux

---

## Post-Release

### Documentation
- [ ] Update `README.md` with:
  - [ ] New version number
  - [ ] Download link
  - [ ] Release notes
- [ ] Update `CHANGELOG.md`:
  - [ ] New version section
  - [ ] Features added
  - [ ] Bugs fixed
  - [ ] Breaking changes (if any)
- [ ] Update user documentation if features changed

### Communication
- [ ] Announce release (if applicable):
  - [ ] Social media
  - [ ] Mailing list
  - [ ] Discord/Slack
  - [ ] Website

### Monitoring
- [ ] Monitor GitHub Issues for bug reports
- [ ] Monitor download statistics
- [ ] Monitor user feedback
- [ ] Track any update failures

### Cleanup
- [ ] Remove local build artifacts if needed
- [ ] Archive release notes
- [ ] Plan next version features

---

## Emergency Rollback

If critical issues are discovered:

- [ ] Mark release as pre-release in GitHub
- [ ] Delete `updater.json` from releases (stops auto-updates)
- [ ] Fix the issue
- [ ] Release a patch version (e.g., 1.0.1)
- [ ] Communicate the issue to users

---

## Version-Specific Notes

### First Release (1.0.0)
- Complete all "First Release Only" items
- Extra testing recommended
- Consider beta testing period

### Major Release (X.0.0)
- Document breaking changes clearly
- Update migration guide
- Consider deprecation warnings in previous version

### Minor Release (X.Y.0)
- Document new features
- Update screenshots if UI changed
- Update feature list in README

### Patch Release (X.Y.Z)
- Focus on bug fixes
- Can be released quickly
- Test affected areas thoroughly

---

## Common Issues Checklist

### If Build Fails
- [ ] Check Node.js version
- [ ] Check Rust version
- [ ] Clear cache: `npm cache clean --force`
- [ ] Delete `node_modules` and reinstall
- [ ] Delete `src-tauri/target` and rebuild
- [ ] Check for syntax errors in config files

### If Updates Don't Work
- [ ] Verify tag has `v` prefix
- [ ] Check `updater.json` is accessible
- [ ] Verify public key matches private key
- [ ] Ensure version in `updater.json` is higher
- [ ] Check signature is correct
- [ ] Verify updater feature is enabled

### If Signature Fails
- [ ] Use same private key that generated public key
- [ ] Signature file uploaded to release
- [ ] Signature content correctly copied to `updater.json`

---

## Quick Command Reference

```powershell
# Install dependencies
npm install

# Run tests
npm run test

# Run linter
npm run lint

# Dev mode
npm run tauri:dev

# Production build
npm run tauri:build

# Sign installer (Windows)
cd src-tauri
tauri-signer sign "$env:USERPROFILE\.tauri\todoapp.key" target/release/bundle/msi/TodoApp_1.0.0_x64_en-US.msi

# Read signature
Get-Content target/release/bundle/msi/TodoApp_1.0.0_x64_en-US.msi.sig

# Create and push tag
git tag v1.0.0
git push origin v1.0.0
```

---

**Print this checklist and check off items as you go!** ✅
