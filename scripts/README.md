# Release Scripts

This folder contains helper scripts for releasing TodoApp.

## Scripts

### prepare-release.ps1

Updates version numbers across all configuration files.

**Usage:**
```powershell
.\scripts\prepare-release.ps1 -Version "1.0.0" -Author "Your Name" -License "MIT"
```

**Parameters:**
- `-Version` (required): The version number (e.g., "1.0.0")
- `-Author` (optional): Your name for Cargo.toml (default: "you")
- `-License` (optional): License type (default: "MIT")

**What it does:**
- Updates `package.json`
- Updates `src-tauri/Cargo.toml`
- Updates `src-tauri/tauri.conf.json`

---

### sign-release.ps1

Signs the release installers with your private key.

**Usage:**
```powershell
# Sign Windows installer
.\scripts\sign-release.ps1 -Version "1.0.0" -Platform windows

# Sign macOS app
.\scripts\sign-release.ps1 -Version "1.0.0" -Platform macos

# Sign Linux AppImage
.\scripts\sign-release.ps1 -Version "1.0.0" -Platform linux
```

**Parameters:**
- `-Version` (required): The version number
- `-Platform` (optional): windows, macos, or linux (default: windows)
- `-KeyPath` (optional): Path to private key (default: `~/.tauri/todoapp.key`)

**What it does:**
- Finds the installer for the specified platform
- Signs it using tauri-signer
- Displays the signature content

---

### updater.json.template

Template for creating the `updater.json` file required for automatic updates.

**How to use:**
1. Copy the template
2. Replace all placeholders:
   - `REPLACE_WITH_VERSION`: Your version number (e.g., "1.0.0")
   - `REPLACE_WITH_RELEASE_NOTES`: Short description of the release
   - `REPLACE_WITH_ISO_DATE`: Current date in ISO 8601 format (e.g., "2024-12-08T12:00:00Z")
   - `REPLACE_WITH_SIGNATURE_CONTENT`: Content from `.sig` files
   - `YOUR_USERNAME`: Your GitHub username
   - `YOUR_REPO`: Your repository name
3. Upload to GitHub Release

---

## Quick Release Workflow

```powershell
# 1. Prepare version
.\scripts\prepare-release.ps1 -Version "1.0.0" -Author "Your Name"

# 2. Review and commit
git diff
git add .
git commit -m "chore: bump version to 1.0.0"
git push

# 3. Build
npm run tauri:build

# 4. Sign
.\scripts\sign-release.ps1 -Version "1.0.0"

# 5. Create updater.json from template

# 6. Create GitHub release and upload files
```

For detailed instructions, see `docs/RELEASE_GUIDE.md`.
