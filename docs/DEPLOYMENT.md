# Deployment Guide with Automatic Updates

This guide walks you through deploying your Todo App desktop application with automatic update support using Tauri's built-in updater and GitHub Releases.

## Overview

The deployment path enables:
- ✅ **Automatic updates** - Users receive updates automatically
- ✅ **GitHub Releases** - Simple, free update server
- ✅ **Secure updates** - Code signing and signature verification
- ✅ **Easy versioning** - Semantic versioning with automatic update checks

## Prerequisites

1. **GitHub Repository** - Your app code must be in a GitHub repository
2. **GitHub Personal Access Token** - For uploading releases (with `repo` scope)
3. **Rust & Node.js** - Already installed for development

## Step 1: Add Updater Dependencies

First, add the Tauri updater plugin to your Rust dependencies.

**Update `src-tauri/Cargo.toml`:**

```toml
[dependencies]
tauri = { version = "1.8", features = ["shell-open", "dialog-all", "fs-all", "path-all", "notification-all", "system-tray", "global-shortcut", "updater"] }
# ... existing dependencies ...
```

**Note:** The `updater` feature is already included in Tauri 1.8, but ensure it's enabled.

## Step 2: Configure Updater in Tauri Config

Add updater configuration to `src-tauri/tauri.conf.json`:

```json
{
  "tauri": {
    "updater": {
      "active": true,
      "endpoints": [
        "https://github.com/YOUR_USERNAME/YOUR_REPO/releases/latest/download/updater.json"
      ],
      "dialog": true,
      "pubkey": "YOUR_PUBLIC_KEY_HERE"
    },
    // ... rest of config
  }
}
```

**Replace:**
- `YOUR_USERNAME` - Your GitHub username
- `YOUR_REPO` - Your repository name
- `YOUR_PUBLIC_KEY_HERE` - Generated in Step 3

## Step 3: Generate Signing Keys

Generate a keypair for signing updates (one-time setup):

```bash
cd src-tauri
cargo install tauri-signer
tauri-signer generate -w ~/.tauri/myapp.key
```

This creates:
- **Private key:** `~/.tauri/myapp.key` (keep this secret!)
- **Public key:** Displayed in terminal (add to `tauri.conf.json`)

**Important:** 
- Never commit the private key to git
- Add `~/.tauri/myapp.key` to `.gitignore`
- Store the private key securely (password manager, encrypted backup)

## Step 4: Update Package Metadata

Before building, update version numbers:

**`src-tauri/tauri.conf.json`:**
```json
{
  "package": {
    "productName": "TodoApp",
    "version": "1.0.0"  // Update this
  },
  "tauri": {
    "bundle": {
      "identifier": "com.yourcompany.todoapp"  // Change from com.todoapp
    }
  }
}
```

**`src-tauri/Cargo.toml`:**
```toml
[package]
version = "1.0.0"  # Match tauri.conf.json
```

**`package.json`:**
```json
{
  "version": "1.0.0"  // Match other files
}
```

## Step 5: Build Production Release

Build the app with updater support:

```bash
npm run tauri:build
```

This creates installers in:
- **Windows:** `src-tauri/target/release/bundle/msi/TodoApp_1.0.0_x64_en-US.msi`
- **macOS:** `src-tauri/target/release/bundle/dmg/TodoApp_1.0.0_x64.dmg`
- **Linux:** `src-tauri/target/release/bundle/deb/TodoApp_1.0.0_amd64.deb`

## Step 6: Generate Update Manifest

After building, generate the update manifest:

```bash
cd src-tauri
tauri-signer sign ~/.tauri/myapp.key target/release/bundle/msi/TodoApp_1.0.0_x64_en-US.msi
```

This creates `TodoApp_1.0.0_x64_en-US.msi.sig` (signature file).

**For each platform, create:**
- Windows: `.msi` + `.msi.sig`
- macOS: `.dmg` + `.dmg.sig`
- Linux: `.deb` + `.deb.sig` (or `.AppImage` + `.AppImage.sig`)

## Step 7: Create GitHub Release

1. **Create a new release on GitHub:**
   - Go to your repository → Releases → "Draft a new release"
   - Tag: `v1.0.0` (must match version, prefixed with `v`)
   - Title: `v1.0.0` or `Release 1.0.0`
   - Description: Release notes

2. **Upload files:**
   - Upload installer files (`.msi`, `.dmg`, `.deb`, etc.)
   - Upload signature files (`.sig` files)
   - Upload `updater.json` (created in next step)

3. **Create `updater.json`:**
   Create a file named `updater.json` with:

```json
{
  "version": "1.0.0",
  "notes": "Initial release",
  "pub_date": "2024-01-01T00:00:00Z",
  "platforms": {
    "windows-x86_64": {
      "signature": "YOUR_WINDOWS_SIGNATURE_HERE",
      "url": "https://github.com/YOUR_USERNAME/YOUR_REPO/releases/download/v1.0.0/TodoApp_1.0.0_x64_en-US.msi"
    },
    "darwin-x86_64": {
      "signature": "YOUR_MACOS_SIGNATURE_HERE",
      "url": "https://github.com/YOUR_USERNAME/YOUR_REPO/releases/download/v1.0.0/TodoApp_1.0.0_x64.dmg"
    },
    "darwin-aarch64": {
      "signature": "YOUR_MACOS_ARM_SIGNATURE_HERE",
      "url": "https://github.com/YOUR_USERNAME/YOUR_REPO/releases/download/v1.0.0/TodoApp_1.0.0_aarch64.dmg"
    },
    "linux-x86_64": {
      "signature": "YOUR_LINUX_SIGNATURE_HERE",
      "url": "https://github.com/YOUR_USERNAME/YOUR_REPO/releases/download/v1.0.0/TodoApp_1.0.0_amd64.deb"
    }
  }
}
```

**Get signatures:**
- Read the `.sig` file contents: `cat TodoApp_1.0.0_x64_en-US.msi.sig`
- Copy the signature string into `updater.json`

4. **Publish the release**

## Step 8: Implement Update Checking (Optional)

Add update checking to your app. The updater can check automatically, but you can add manual checking:

**In `src-tauri/src/main.rs`:**

```rust
use tauri::UpdaterBuilder;

// In your setup function:
tauri::Builder::default()
    .setup(|app| {
        // ... existing setup code ...
        
        // Check for updates on startup (optional)
        let app_handle = app.handle().clone();
        tauri::async_runtime::spawn(async move {
            if let Ok(updater) = app_handle.updater_builder().build() {
                if let Ok(Some(update)) = updater.check().await {
                    // Update available - updater will show dialog automatically
                    // Or handle programmatically:
                    // update.download_and_install(|chunk_length, content_length| {
                    //     println!("Downloaded {} of {}", chunk_length, content_length.unwrap_or(0));
                    // }, || {
                    //     println!("Download finished");
                    // }).await;
                }
            }
        });
        
        Ok(())
    })
    // ... rest of builder
```

**Frontend (React/TypeScript):**

```typescript
import { check } from '@tauri-apps/api/updater';
import { installUpdate } from '@tauri-apps/api/updater';

async function checkForUpdates() {
  try {
    const { shouldUpdate, manifest } = await check({
      endpoint: 'https://github.com/YOUR_USERNAME/YOUR_REPO/releases/latest/download/updater.json',
      pubkey: 'YOUR_PUBLIC_KEY_HERE'
    });
    
    if (shouldUpdate) {
      // Show update dialog
      const confirmed = await confirm('Update available. Install now?');
      if (confirmed) {
        await installUpdate();
        // App will restart automatically
      }
    }
  } catch (error) {
    console.error('Update check failed:', error);
  }
}
```

## Step 9: Distribute Initial Release

Share your app with users:

1. **Direct Download:**
   - Link to GitHub Releases page
   - Users download and install manually

2. **Website:**
   - Host installers on your website
   - Link to download page

3. **App Stores** (optional):
   - Microsoft Store (Windows)
   - Mac App Store (macOS)
   - Snap Store (Linux)

## Step 10: Continue Updating Your App

For future updates, follow this process:

### 1. Update Version Numbers

Update version in all three files:
- `src-tauri/tauri.conf.json` → `package.version`
- `src-tauri/Cargo.toml` → `version`
- `package.json` → `version`

Use semantic versioning:
- **PATCH** (1.0.0 → 1.0.1): Bug fixes
- **MINOR** (1.0.0 → 1.1.0): New features
- **MAJOR** (1.0.0 → 2.0.0): Breaking changes

### 2. Make Your Changes

Develop and test your changes:

```bash
npm run tauri:dev  # Test in development
```

### 3. Build New Release

```bash
npm run tauri:build
```

### 4. Sign New Builds

```bash
cd src-tauri
tauri-signer sign ~/.tauri/myapp.key target/release/bundle/msi/TodoApp_1.0.1_x64_en-US.msi
# Repeat for all platforms
```

### 5. Create New GitHub Release

1. Create release `v1.0.1`
2. Upload new installers and signatures
3. Update `updater.json` with new version and URLs
4. Upload updated `updater.json`

### 6. Users Get Updates Automatically

- App checks for updates on startup (if configured)
- Users see update dialog when available
- Update downloads and installs automatically
- App restarts with new version

## Update Server Alternatives

### Option 1: GitHub Releases (Recommended)
- ✅ Free
- ✅ Simple setup
- ✅ No server maintenance
- ✅ CDN-backed downloads

### Option 2: Custom Server
Host `updater.json` and installers on your own server:

```json
{
  "tauri": {
    "updater": {
      "endpoints": [
        "https://yourdomain.com/updates/updater.json"
      ]
    }
  }
}
```

### Option 3: Tauri Update Server
Use Tauri's official update server (requires account setup).

## Troubleshooting

### Updates Not Detecting

1. **Check version format:**
   - GitHub tag must be `v1.0.0` (with `v` prefix)
   - `updater.json` version must match exactly

2. **Verify endpoints:**
   - Test `updater.json` URL in browser
   - Ensure JSON is valid

3. **Check signatures:**
   - Verify `.sig` files are uploaded
   - Ensure public key matches in `tauri.conf.json`

4. **Platform detection:**
   - Ensure correct platform keys in `updater.json`
   - Windows: `windows-x86_64`
   - macOS Intel: `darwin-x86_64`
   - macOS Apple Silicon: `darwin-aarch64`
   - Linux: `linux-x86_64`

### Build Errors

1. **Missing updater feature:**
   ```toml
   tauri = { version = "1.8", features = [..., "updater"] }
   ```

2. **Signature errors:**
   - Ensure private key path is correct
   - Check key permissions

3. **Version mismatch:**
   - Ensure all version numbers match across files

## Security Best Practices

1. **Private Key Security:**
   - Never commit private key to git
   - Store in secure location (password manager)
   - Use environment variables in CI/CD

2. **Code Signing:**
   - Sign installers for Windows/macOS
   - Reduces security warnings

3. **HTTPS Only:**
   - Always use HTTPS for update endpoints
   - Prevents man-in-the-middle attacks

## CI/CD Automation (Advanced)

Automate releases with GitHub Actions:

```yaml
# .github/workflows/release.yml
name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [windows-latest, macos-latest, ubuntu-latest]
    
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - uses: actions-rs/cargo@v1
      
      - name: Build
        run: npm run tauri:build
      
      - name: Sign
        run: |
          cargo install tauri-signer
          tauri-signer sign ${{ secrets.PRIVATE_KEY }} target/release/bundle/...
      
      - name: Upload Release
        uses: softprops/action-gh-release@v1
        with:
          files: |
            target/release/bundle/**/*.msi
            target/release/bundle/**/*.sig
```

## Summary

**Deployment Path:**
1. ✅ Add updater dependencies
2. ✅ Configure updater in `tauri.conf.json`
3. ✅ Generate signing keys
4. ✅ Build production release
5. ✅ Sign installers
6. ✅ Create GitHub Release with `updater.json`
7. ✅ Distribute to users
8. ✅ Continue updating: version bump → build → sign → release

**Update Flow:**
- User installs v1.0.0
- You release v1.0.1
- App checks for updates
- Update downloads automatically
- User confirms installation
- App updates and restarts

Your app now has automatic update support! 🎉
