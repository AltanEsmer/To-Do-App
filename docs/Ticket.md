# Deployment & Release Ticket

## Overview
This ticket covers the deployment and release preparation phase, focusing on setting up automatic updates, preparing production build, and distributing the app. Translation improvements have been completed.

---

## 1. Pre-Build Preparation

### 1.1 Update Version Numbers

#### Tasks:
- [ ] **Update version in `src-tauri/tauri.conf.json`**
  - Set `package.version` to release version (e.g., "1.0.0")
  - Use semantic versioning (MAJOR.MINOR.PATCH)
  - MAJOR: Breaking changes
  - MINOR: New features (backward compatible)
  - PATCH: Bug fixes

- [ ] **Update version in `src-tauri/Cargo.toml`**
  - Set `version` to match tauri.conf.json
  - Update `description` with app description
  - Update `authors` with your name/company
  - Add `license` (e.g., "MIT" or "Apache-2.0")
  - Add `repository` URL (optional)

- [ ] **Update version in `package.json`**
  - Set `version` to match other files

### 1.2 Update App Metadata

#### Tasks:
- [ ] **Update `src-tauri/tauri.conf.json`**
  - [ ] Set `package.productName` to final app name
  - [ ] Change `tauri.bundle.identifier` from `com.todoapp.dev` to production identifier (e.g., `com.yourcompany.todoapp`)
  - [ ] Verify all bundle settings

### 1.3 Prepare Icons

#### Tasks:
- [ ] **Verify all icons exist in `src-tauri/icons/`:**
  - [ ] 32x32.png
  - [ ] 128x128.png
  - [ ] 128x128@2x.png
  - [ ] icon.icns (macOS)
  - [ ] icon.ico (Windows)
  - [ ] icon.png (system tray)

---

## 2. Set Up Automatic Updates

### 2.1 Add Updater Dependencies

#### Tasks:
- [ ] **Verify updater feature in `src-tauri/Cargo.toml`**
  - Ensure `tauri` dependency includes `updater` feature:
    ```toml
    tauri = { version = "1.8", features = [..., "updater"] }
    ```
  - If not present, add `"updater"` to the features array

### 2.2 Configure Updater

#### Tasks:
- [ ] **Add updater configuration to `src-tauri/tauri.conf.json`**
  - [ ] Set `tauri.updater.active` to `true`
  - [ ] Configure `tauri.updater.endpoints` with GitHub Releases URL:
    ```json
    "updater": {
      "active": true,
      "endpoints": [
        "https://github.com/YOUR_USERNAME/YOUR_REPO/releases/latest/download/updater.json"
      ],
      "dialog": true,
      "pubkey": "YOUR_PUBLIC_KEY_HERE"
    }
    ```
  - Replace `YOUR_USERNAME` with your GitHub username
  - Replace `YOUR_REPO` with your repository name
  - Set `tauri.updater.dialog` to `true`
  - Add `tauri.updater.pubkey` (will be generated in next step)

### 2.3 Generate Signing Keys

#### Tasks:
- [ ] **Install tauri-signer** (if not already installed)
  ```powershell
  cargo install tauri-signer
  ```

- [ ] **Generate keypair for signing updates**
  ```powershell
  cd src-tauri
  tauri-signer generate -w ~/.tauri/myapp.key
  ```
  - This creates:
    - **Private key:** `~/.tauri/myapp.key` (keep this secret!)
    - **Public key:** Displayed in terminal (copy this)

- [ ] **Store private key securely**
  - [ ] Add `~/.tauri/myapp.key` to `.gitignore`
  - [ ] Never commit private key to git
  - [ ] Store private key in secure location (password manager, encrypted backup)
  - [ ] For CI/CD: Store as GitHub Secret or environment variable

- [ ] **Update `tauri.conf.json` with public key**
  - Copy the public key from terminal output
  - Replace `YOUR_PUBLIC_KEY_HERE` in `tauri.updater.pubkey` with the generated public key

### 2.4 Implement Update Checking (Optional)

#### Tasks:
- [ ] **Add update checking to app** (optional, updater can check automatically)
  - Backend: Update `src-tauri/src/main.rs` if needed
  - Frontend: Add update check button in Settings (optional)
  - Reference `docs/DEPLOYMENT.md` for implementation details

---

## 3. Code Signing (Optional but Recommended)

### 3.1 Windows Code Signing

#### Tasks:
- [ ] **Obtain code signing certificate** (.pfx file)
- [ ] **Configure signing** (choose one):
  - Option A: Set environment variables:
    ```powershell
    $env:TAURI_PRIVATE_KEY="path/to/certificate.pfx"
    $env:TAURI_KEY_PASSWORD="your_password"
    ```
  - Option B: Configure in `tauri.conf.json` under `tauri.bundle.windows.certificateThumbprint`

### 3.2 macOS Code Signing

#### Tasks:
- [ ] **Obtain Apple Developer account** ($99/year)
- [ ] **Configure signing** in Xcode or using `codesign` command
- [ ] **Notarize app** for Gatekeeper

### 3.3 Linux Code Signing

#### Tasks:
- [ ] **Optional**: Use GPG keys for package signing

---

## 4. Build Production Release

### 4.1 Pre-Build Checks

#### Tasks:
- [ ] **Run `npm install`** to ensure dependencies are up to date
- [ ] **Test in development mode** (`npm run tauri:dev`)
  - [ ] All features work
  - [ ] No console errors
  - [ ] Database migrations work
  - [ ] Translation feature works
  - [ ] Backup/restore works
  - [ ] Import/export works

### 4.2 Build Process

#### Tasks:
- [ ] **Build production release**
  ```powershell
  npm run tauri:build
  ```

- [ ] **Verify build completed successfully**
  - Check for build errors
  - Verify output directory contains installers

- [ ] **Locate build outputs:**
  - Windows: `src-tauri/target/release/bundle/msi/TodoApp_1.0.0_x64_en-US.msi`
  - macOS: `src-tauri/target/release/bundle/dmg/TodoApp_1.0.0_x64.dmg`
  - Linux: `src-tauri/target/release/bundle/deb/TodoApp_1.0.0_amd64.deb`

---

## 5. Sign Installers for Updates

### 5.1 Sign Windows Installer

#### Tasks:
- [ ] **Sign Windows MSI**
  ```powershell
  cd src-tauri
  tauri-signer sign ~/.tauri/myapp.key target/release/bundle/msi/TodoApp_1.0.0_x64_en-US.msi
  ```
  - This creates `TodoApp_1.0.0_x64_en-US.msi.sig`

### 5.2 Sign macOS Installer

#### Tasks:
- [ ] **Sign macOS DMG**
  ```powershell
  tauri-signer sign ~/.tauri/myapp.key target/release/bundle/dmg/TodoApp_1.0.0_x64.dmg
  ```
  - This creates `TodoApp_1.0.0_x64.dmg.sig`
- [ ] **Sign macOS ARM build** (if applicable)
  ```powershell
  tauri-signer sign ~/.tauri/myapp.key target/release/bundle/dmg/TodoApp_1.0.0_aarch64.dmg
  ```
  - This creates `TodoApp_1.0.0_aarch64.dmg.sig`

### 5.3 Sign Linux Installer

#### Tasks:
- [ ] **Sign Linux DEB/AppImage**
  ```powershell
  tauri-signer sign ~/.tauri/myapp.key target/release/bundle/deb/TodoApp_1.0.0_amd64.deb
  ```
  - This creates `TodoApp_1.0.0_amd64.deb.sig`

### 5.4 Get Signatures

#### Tasks:
- [ ] **Read signature files** for each platform
  ```powershell
  # Windows
  Get-Content target/release/bundle/msi/TodoApp_1.0.0_x64_en-US.msi.sig
  
  # macOS Intel
  Get-Content target/release/bundle/dmg/TodoApp_1.0.0_x64.dmg.sig
  
  # macOS ARM (if applicable)
  Get-Content target/release/bundle/dmg/TodoApp_1.0.0_aarch64.dmg.sig
  
  # Linux
  Get-Content target/release/bundle/deb/TodoApp_1.0.0_amd64.deb.sig
  ```
  - Copy signature strings for `updater.json`

---

## 6. Create GitHub Release

### 6.1 Prepare Release

#### Tasks:
- [ ] **Create release notes**
  - List new features
  - List bug fixes
  - List known issues
  - Include installation instructions
  - Format as Markdown

- [ ] **Create `updater.json` file**
  - [ ] Set version to match release version (e.g., "1.0.0")
  - [ ] Add release notes
  - [ ] Set `pub_date` to release date (ISO 8601 format: `2024-01-01T00:00:00Z`)
  - [ ] Add platform entries with signatures and URLs:
    ```json
    {
      "version": "1.0.0",
      "notes": "Initial release",
      "pub_date": "2024-01-01T00:00:00Z",
      "platforms": {
        "windows-x86_64": {
          "signature": "WINDOWS_SIGNATURE_HERE",
          "url": "https://github.com/YOUR_USERNAME/YOUR_REPO/releases/download/v1.0.0/TodoApp_1.0.0_x64_en-US.msi"
        },
        "darwin-x86_64": {
          "signature": "MACOS_INTEL_SIGNATURE_HERE",
          "url": "https://github.com/YOUR_USERNAME/YOUR_REPO/releases/download/v1.0.0/TodoApp_1.0.0_x64.dmg"
        },
        "darwin-aarch64": {
          "signature": "MACOS_ARM_SIGNATURE_HERE",
          "url": "https://github.com/YOUR_USERNAME/YOUR_REPO/releases/download/v1.0.0/TodoApp_1.0.0_aarch64.dmg"
        },
        "linux-x86_64": {
          "signature": "LINUX_SIGNATURE_HERE",
          "url": "https://github.com/YOUR_USERNAME/YOUR_REPO/releases/download/v1.0.0/TodoApp_1.0.0_amd64.deb"
        }
      }
    }
    ```
  - Replace all placeholders with actual values
  - Verify JSON syntax is valid

### 6.2 Create Release on GitHub

#### Tasks:
- [ ] **Go to GitHub repository** → Releases → "Draft a new release"
- [ ] **Set release tag**: `v1.0.0` (must match version, prefixed with `v`)
- [ ] **Set release title**: `v1.0.0` or `Release 1.0.0`
- [ ] **Add release description**: Paste release notes
- [ ] **Upload files**:
  - [ ] Upload installer files (`.msi`, `.dmg`, `.deb`, etc.)
  - [ ] Upload signature files (`.sig` files)
  - [ ] Upload `updater.json`
- [ ] **Publish the release**

---

## 7. Test Production Build

### 7.1 Installation Testing

#### Tasks:
- [ ] **Install on clean system**
  - [ ] Test first launch (database creation)
  - [ ] Verify database migrations run automatically
  - [ ] Test all major features
  - [ ] Verify no console errors in production build

### 7.2 Feature Testing

#### Tasks:
- [ ] **Test file permissions**
- [ ] **Test system tray**
- [ ] **Test notifications**
- [ ] **Test keyboard shortcuts**
- [ ] **Test auto-start functionality** (if implemented)
- [ ] **Test on different OS versions** (if possible)

### 7.3 Update Testing

#### Tasks:
- [ ] **Test update detection**
  - [ ] Verify app checks for updates (if configured)
  - [ ] Test update dialog appears when update available
  - [ ] Test update download and installation
  - [ ] Verify app restarts with new version

---

## 8. Distribution

### 8.1 Distribution Options

#### Tasks:
- [ ] **Option A: GitHub Releases** (Recommended)
  - [ ] Link to GitHub Releases page
  - [ ] Share download links with users
  - [ ] Automatic updates work via GitHub Releases

- [ ] **Option B: Direct Distribution**
  - [ ] Host installers on website
  - [ ] Use file sharing services
  - [ ] Provide download links
  - [ ] Note: Automatic updates require updater.json endpoint

- [ ] **Option C: App Stores** (Optional)
  - [ ] Microsoft Store (Windows)
  - [ ] Mac App Store (macOS)
  - [ ] Snap Store (Linux)

### 8.2 Documentation

#### Tasks:
- [ ] **Update README.md**
  - [ ] Add installation instructions
  - [ ] Add download links
  - [ ] Document system requirements
  - [ ] Add troubleshooting section
  - [ ] Add update instructions

- [ ] **Create CHANGELOG.md**
  - [ ] Document version history
  - [ ] List breaking changes
  - [ ] Include upgrade instructions

- [ ] **Update user documentation**
  - [ ] Feature documentation
  - [ ] FAQ section
  - [ ] Known issues

---

## 9. Post-Release Tasks

### 9.1 Monitoring

#### Tasks:
- [ ] **Monitor for user feedback**
- [ ] **Track bug reports**
- [ ] **Monitor GitHub Issues**
- [ ] **Track download statistics**

### 9.2 Future Updates

#### Tasks:
- [ ] **Plan next version features**
- [ ] **Set up CI/CD automation** (optional, see DEPLOYMENT.md)
  - [ ] Create GitHub Actions workflow
  - [ ] Automate builds on tag push
  - [ ] Automate signing and release creation
  - [ ] Example workflow in `docs/DEPLOYMENT.md`

---

## 10. Success Criteria

### Deployment:
- ✅ Version numbers updated in all files
- ✅ App metadata configured correctly
- ✅ All icons present and correct
- ✅ Automatic updates configured
- ✅ Signing keys generated and secured
- ✅ Production build completed successfully
- ✅ Installers signed for all platforms
- ✅ GitHub Release created with updater.json
- ✅ Production build tested on clean system
- ✅ Distribution channels set up
- ✅ Documentation updated

---

## 11. Priority & Timeline

### High Priority (Must Complete Before Release):
1. ✅ Update version numbers and metadata
2. ✅ Set up automatic updates
3. ✅ Generate signing keys
4. ✅ Build production release
5. ✅ Sign installers
6. ✅ Create GitHub Release
7. ✅ Test production build

### Medium Priority (Should Complete):
1. Code signing (can be added later)
2. Update checking implementation
3. Cross-platform testing
4. Documentation updates

### Low Priority (Nice to Have):
1. CI/CD automation
2. App Store distribution
3. Advanced update features

---

## 12. Notes

- Use PowerShell commands for any terminal operations
- Reference existing documentation in `docs/` folder:
  - `DEPLOYMENT.md` - Detailed deployment guide with examples
  - `RELEASE_CHECKLIST.md` - Pre-release checklist
  - `RELEASE.md` - Release guide
- Follow existing code patterns and conventions
- Test in both Tauri desktop mode and browser mode
- Ensure backward compatibility with existing data
- **Security**: Never commit private signing keys to git
- **Versioning**: Use semantic versioning (MAJOR.MINOR.PATCH)
- **Updates**: Test update flow before release
- **Distribution**: GitHub Releases is recommended for automatic updates
- **Platform Keys**: 
  - Windows: `windows-x86_64`
  - macOS Intel: `darwin-x86_64`
  - macOS Apple Silicon: `darwin-aarch64`
  - Linux: `linux-x86_64`

---

## 13. Quick Reference Commands

### Development:
```powershell
npm run tauri:dev          # Development build
npm run test                # Run tests
npm run test:ui             # Run tests with UI
```

### Building:
```powershell
npm install                 # Update dependencies
npm run tauri:build         # Production build
```

### Signing:
```powershell
# Install tauri-signer
cargo install tauri-signer

# Generate keys
cd src-tauri
tauri-signer generate -w ~/.tauri/myapp.key

# Sign installer
tauri-signer sign ~/.tauri/myapp.key target/release/bundle/msi/TodoApp_1.0.0_x64_en-US.msi

# Read signature
Get-Content target/release/bundle/msi/TodoApp_1.0.0_x64_en-US.msi.sig
```

### Version Update:
Update version in:
- `src-tauri/tauri.conf.json` → `package.version`
- `src-tauri/Cargo.toml` → `version`
- `package.json` → `version`

### Troubleshooting:

**Updates Not Detecting:**
- Check version format: GitHub tag must be `v1.0.0` (with `v` prefix)
- Verify `updater.json` URL is accessible
- Ensure JSON is valid
- Check signatures match
- Verify public key in `tauri.conf.json` matches keypair

**Build Errors:**
- Ensure updater feature is enabled: `tauri = { version = "1.8", features = [..., "updater"] }`
- Check version numbers match across all files
- Verify all dependencies are installed: `npm install`

---

**Time to release this beautiful app! 🚀**
