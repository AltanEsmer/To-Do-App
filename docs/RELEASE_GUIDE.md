# Release Guide for TodoApp

This guide walks you through releasing a new version of TodoApp with automatic updates support.

## Table of Contents
- [Prerequisites](#prerequisites)
- [First-Time Setup](#first-time-setup)
- [Release Process](#release-process)
- [Testing the Release](#testing-the-release)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before you can release, ensure you have:
- ✅ Rust and Cargo installed
- ✅ Node.js and npm installed
- ✅ A GitHub account with this repository
- ✅ Git configured with your credentials
- ✅ All changes committed and pushed to main branch

---

## First-Time Setup

These steps only need to be done once:

### 1. Install Tauri Signer

```powershell
cargo install tauri-signer --locked
```

### 2. Generate Signing Keys

```powershell
# Create directory for keys (if it doesn't exist)
New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\.tauri"

# Generate keypair
cd src-tauri
tauri-signer generate -w "$env:USERPROFILE\.tauri\todoapp.key"
```

**Important:** Copy the public key that's displayed in the terminal. You'll need it in the next step.

### 3. Configure Public Key

1. Open `src-tauri/tauri.conf.json`
2. Find the `updater` section
3. Replace `YOUR_PUBLIC_KEY_HERE` with the public key you just copied

```json
"updater": {
  "active": true,
  "endpoints": [
    "https://github.com/YOUR_USERNAME/YOUR_REPO/releases/latest/download/updater.json"
  ],
  "dialog": true,
  "pubkey": "dW50cnVzdGVkIGNvbW1lbnQ6IG1pbmlzaWduIHB1YmxpYyBrZXk6..."
}
```

### 4. Update GitHub Repository URLs

In `src-tauri/tauri.conf.json`, replace:
- `YOUR_USERNAME` with your GitHub username
- `YOUR_REPO` with your repository name

### 5. Store Private Key in GitHub Secrets (for CI/CD)

If you want to use the GitHub Actions workflow:

1. Read your private key:
   ```powershell
   Get-Content "$env:USERPROFILE\.tauri\todoapp.key"
   ```

2. Go to your GitHub repository → Settings → Secrets and variables → Actions
3. Create two new repository secrets:
   - Name: `TAURI_PRIVATE_KEY`
     Value: (paste the entire content of your private key file)
   - Name: `TAURI_KEY_PASSWORD`
     Value: (leave empty if you didn't set a password)

**Security Note:** Never commit your private key to Git! It's already in `.gitignore`.

---

## Release Process

### Option A: Manual Release (Recommended for first release)

#### Step 1: Update Version Numbers

Update the version in **all three files** to match (e.g., `1.0.0`):

**package.json:**
```json
{
  "version": "1.0.0"
}
```

**src-tauri/Cargo.toml:**
```toml
[package]
version = "1.0.0"
description = "A personal todo desktop app"
authors = ["Your Name"]
license = "MIT"
```

**src-tauri/tauri.conf.json:**
```json
{
  "package": {
    "productName": "TodoApp",
    "version": "1.0.0"
  }
}
```

#### Step 2: Update Bundle Identifier (First Release Only)

In `src-tauri/tauri.conf.json`, change the bundle identifier from dev to production:

```json
"bundle": {
  "identifier": "com.yourcompany.todoapp"
}
```

#### Step 3: Commit Version Changes

```powershell
git add .
git commit -m "chore: bump version to 1.0.0"
git push
```

#### Step 4: Build Production Release

```powershell
# Install/update dependencies
npm install

# Build the app
npm run tauri:build
```

This will create installers in `src-tauri/target/release/bundle/`:
- **Windows:** `msi/*.msi`
- **macOS:** `dmg/*.dmg` or `macos/*.app`
- **Linux:** `deb/*.deb`, `appimage/*.AppImage`

#### Step 5: Sign the Installers

**For Windows (.msi):**
```powershell
cd src-tauri
tauri-signer sign "$env:USERPROFILE\.tauri\todoapp.key" target/release/bundle/msi/TodoApp_1.0.0_x64_en-US.msi
```

This creates a `.sig` file next to your installer.

**For macOS (.app):**
```powershell
tauri-signer sign "$env:USERPROFILE\.tauri\todoapp.key" target/release/bundle/macos/TodoApp.app
```

**For Linux (.AppImage):**
```powershell
tauri-signer sign "$env:USERPROFILE\.tauri\todoapp.key" target/release/bundle/appimage/todo-app_1.0.0_amd64.AppImage
```

#### Step 6: Create updater.json

Create `updater.json` manually or use this template:

**For Windows:**
```json
{
  "version": "1.0.0",
  "notes": "Initial release with task management, categories, and statistics.",
  "pub_date": "2024-12-08T12:00:00Z",
  "platforms": {
    "windows-x86_64": {
      "signature": "SIGNATURE_CONTENT_HERE",
      "url": "https://github.com/YOUR_USERNAME/YOUR_REPO/releases/download/v1.0.0/TodoApp_1.0.0_x64_en-US.msi"
    }
  }
}
```

To get the signature:
```powershell
Get-Content src-tauri/target/release/bundle/msi/TodoApp_1.0.0_x64_en-US.msi.sig
```

Replace `SIGNATURE_CONTENT_HERE` with the content of the `.sig` file.

#### Step 7: Create GitHub Release

1. Go to your GitHub repository
2. Click "Releases" → "Create a new release"
3. Tag version: `v1.0.0` (must include `v` prefix)
4. Release title: `TodoApp v1.0.0`
5. Description: Add release notes
6. Upload these files:
   - The installer (`.msi`, `.dmg`, or `.AppImage`)
   - The signature file (`.msi.sig`, `.app.tar.gz.sig`, or `.AppImage.sig`)
   - The `updater.json` file
7. Click "Publish release"

#### Step 8: Verify Update URL

Make sure this URL is accessible:
```
https://github.com/YOUR_USERNAME/YOUR_REPO/releases/latest/download/updater.json
```

---

### Option B: Automated Release with GitHub Actions

If you've set up GitHub Secrets (Step 5 of First-Time Setup):

#### Step 1-3: Same as Manual Release

Update version numbers and commit changes.

#### Step 4: Create and Push Tag

```powershell
git tag v1.0.0
git push origin v1.0.0
```

This will automatically trigger the GitHub Actions workflow that:
- ✅ Builds the app for all platforms
- ✅ Signs the installers
- ✅ Creates a GitHub release
- ✅ Uploads installers and signatures
- ✅ Generates `updater.json`

#### Step 5: Review and Publish

1. Go to GitHub → Actions to monitor the build
2. When complete, go to Releases
3. Find the draft release
4. Review the files
5. Click "Publish release"

---

## Testing the Release

### Test Installation

1. Download the installer from GitHub Releases
2. Install on a clean machine (or VM)
3. Run the app and verify:
   - App opens successfully
   - All features work
   - No errors in the console

### Test Auto-Update (for subsequent releases)

1. Install the previous version
2. Release a new version (e.g., 1.0.1)
3. Open the old version
4. The app should detect the update and show a dialog
5. Click "Update" and verify it updates successfully

---

## Troubleshooting

### Build Fails

**Error: "updater feature not found"**
- Solution: Add `"updater"` to features in `src-tauri/Cargo.toml`

**Error: "version mismatch"**
- Solution: Ensure version is identical in all three files

### Updates Not Detected

**Possible causes:**
1. GitHub tag doesn't have `v` prefix (must be `v1.0.0`, not `1.0.0`)
2. `updater.json` is not accessible at the expected URL
3. Signature doesn't match (public key in config doesn't match the keypair)
4. Version in `updater.json` is not higher than current version

**Debug steps:**
```powershell
# Check if updater.json is accessible
Invoke-WebRequest -Uri "https://github.com/YOUR_USERNAME/YOUR_REPO/releases/latest/download/updater.json"

# Verify public key in tauri.conf.json matches your keypair
```

### Signature Verification Fails

- Make sure you're using the same private key that generated the public key in config
- Verify the signature file is uploaded alongside the installer
- Check that the signature content in `updater.json` matches the `.sig` file

---

## Quick Release Checklist

Use this for every release:

- [ ] Update version in `package.json`
- [ ] Update version in `src-tauri/Cargo.toml`
- [ ] Update version in `src-tauri/tauri.conf.json`
- [ ] Update `description`, `authors`, `license` in Cargo.toml (first release)
- [ ] Update bundle identifier (first release)
- [ ] Commit and push changes
- [ ] Run tests: `npm run test`
- [ ] Build: `npm run tauri:build`
- [ ] Sign installers with tauri-signer
- [ ] Create `updater.json` with signatures
- [ ] Create GitHub release with tag `v{VERSION}`
- [ ] Upload installer, signature, and `updater.json`
- [ ] Publish release
- [ ] Test installation on clean system
- [ ] Test auto-update (subsequent releases)

---

## Semantic Versioning Guide

Follow semantic versioning for version numbers:

- **MAJOR** (1.0.0 → 2.0.0): Breaking changes
- **MINOR** (1.0.0 → 1.1.0): New features (backward compatible)
- **PATCH** (1.0.0 → 1.0.1): Bug fixes

---

## Platform-Specific Notes

### Windows
- Installer: `.msi` file
- Platform key: `windows-x86_64`
- Signature: `.msi.sig`

### macOS
- Installer: `.dmg` or `.app` (tarball)
- Platform keys: `darwin-x86_64` (Intel) or `darwin-aarch64` (Apple Silicon)
- Signature: `.app.tar.gz.sig`
- Note: Code signing requires Apple Developer account

### Linux
- Installers: `.deb`, `.AppImage`
- Platform key: `linux-x86_64`
- Signature: `.AppImage.sig`

---

## Support & Resources

- [Tauri Updater Documentation](https://tauri.app/v1/guides/distribution/updater/)
- [GitHub Actions for Tauri](https://github.com/tauri-apps/tauri-action)
- [Semantic Versioning](https://semver.org/)

**Ready to release? Good luck! 🚀**
