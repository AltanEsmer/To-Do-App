# 🚀 Deployment Setup - Quick Start

Congratulations! Your TodoApp is now configured for deployment with automatic updates.

## 📦 What Has Been Set Up

### Configuration Files Modified:
✅ **src-tauri/Cargo.toml** - Added `updater` feature to Tauri
✅ **src-tauri/tauri.conf.json** - Added updater configuration
✅ **.gitignore** - Added patterns to ignore signing keys

### Documentation Created:
📖 **docs/RELEASE_GUIDE.md** - Complete step-by-step release guide
📋 **docs/RELEASE_CHECKLIST.md** - Printable checklist for every release

### Automation Created:
🤖 **.github/workflows/release.yml** - GitHub Actions workflow for automated builds
🛠️ **scripts/prepare-release.ps1** - Script to update version numbers
🔐 **scripts/sign-release.ps1** - Script to sign installers
📄 **scripts/updater.json.template** - Template for update manifest

---

## 🎯 Next Steps (First-Time Setup)

### 1. Generate Signing Keys (Required)

```powershell
# Install tauri-signer
cargo install tauri-signer --locked

# Generate keypair
New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\.tauri"
cd src-tauri
tauri-signer generate -w "$env:USERPROFILE\.tauri\todoapp.key"
```

**Important:** Copy the public key displayed in the terminal!

### 2. Configure Public Key

Open `src-tauri/tauri.conf.json` and:
1. Replace `YOUR_PUBLIC_KEY_HERE` with your public key
2. Replace `YOUR_USERNAME` with your GitHub username
3. Replace `YOUR_REPO` with your repository name

### 3. Test Build (Optional but Recommended)

```powershell
npm install
npm run test
npm run tauri:dev
```

---

## 🚀 Your First Release

### Quick Method (Using Helper Scripts)

```powershell
# 1. Update version numbers
.\scripts\prepare-release.ps1 -Version "1.0.0" -Author "Your Name" -License "MIT"

# 2. Test and commit
npm run test
git add .
git commit -m "chore: bump version to 1.0.0"
git push

# 3. Build
npm run tauri:build

# 4. Sign the installer
.\scripts\sign-release.ps1 -Version "1.0.0"

# 5. Create updater.json from template (see scripts/updater.json.template)

# 6. Create GitHub Release
# - Tag: v1.0.0 (with 'v' prefix)
# - Upload: installer + .sig file + updater.json
```

### Automated Method (Using GitHub Actions)

```powershell
# 1. Update version numbers
.\scripts\prepare-release.ps1 -Version "1.0.0" -Author "Your Name"

# 2. Test and commit
npm run test
git add .
git commit -m "chore: bump version to 1.0.0"
git push

# 3. Set up GitHub Secrets (one-time only):
# Go to GitHub repo → Settings → Secrets and variables → Actions
# Add: TAURI_PRIVATE_KEY (content of your private key file)
# Add: TAURI_KEY_PASSWORD (leave empty if no password)

# 4. Create and push tag
git tag v1.0.0
git push origin v1.0.0

# GitHub Actions will automatically:
# - Build for Windows, macOS, and Linux
# - Sign the installers
# - Create a draft release
# - Upload all files including updater.json

# 5. Review and publish the draft release on GitHub
```

---

## 📚 Documentation Guide

### For Your First Release:
Start with: **docs/RELEASE_GUIDE.md**
- Complete setup instructions
- Step-by-step release process
- Troubleshooting guide

### For Every Release:
Use: **docs/RELEASE_CHECKLIST.md**
- Printable checklist
- Nothing gets missed
- Quality assurance

### For Script Usage:
See: **scripts/README.md**
- Helper script documentation
- Usage examples
- Quick reference

### For Planning:
Reference: **docs/Ticket.md**
- Deployment roadmap
- All tasks and requirements
- Success criteria

---

## ⚠️ Important Security Notes

### Private Key Security:
- ❌ **NEVER** commit your private key to Git
- ✅ It's already in `.gitignore`
- ✅ Store securely (password manager, encrypted backup)
- ✅ Use GitHub Secrets for CI/CD

### Update URLs:
Before first release, update in `src-tauri/tauri.conf.json`:
```json
"endpoints": [
  "https://github.com/YOUR_USERNAME/YOUR_REPO/releases/latest/download/updater.json"
]
```

---

## 🎨 Customization

### Before First Release:

1. **Update App Metadata** in `src-tauri/tauri.conf.json`:
   ```json
   "bundle": {
     "identifier": "com.yourcompany.todoapp"  // Change from com.todoapp
   }
   ```

2. **Update Author Info** in `src-tauri/Cargo.toml`:
   ```toml
   authors = ["Your Name"]
   license = "MIT"
   ```

3. **Verify Icons** in `src-tauri/icons/`:
   - All required sizes present
   - Professional quality
   - Proper format

---

## 🐛 Common Issues

### "updater feature not found"
- Solution: Already added to `Cargo.toml`, run `cargo build`

### "Updates not detecting"
- Check: Tag has 'v' prefix (v1.0.0)
- Check: updater.json is accessible
- Check: Public key matches private key

### "Build fails"
- Run: `npm install`
- Run: `cargo update`
- Check: Node.js and Rust versions

---

## 🎯 Release Checklist Quick Reference

- [ ] Generate signing keys (first time only)
- [ ] Update public key in config (first time only)
- [ ] Set GitHub Secrets (if using CI/CD)
- [ ] Update version numbers (use script)
- [ ] Run tests
- [ ] Build release
- [ ] Sign installer
- [ ] Create updater.json
- [ ] Create GitHub Release with tag v{VERSION}
- [ ] Upload: installer + .sig + updater.json
- [ ] Test on clean system

---

## 📞 Need Help?

1. **Read the full guide:** `docs/RELEASE_GUIDE.md`
2. **Check the checklist:** `docs/RELEASE_CHECKLIST.md`
3. **Review Tauri docs:** https://tauri.app/v1/guides/distribution/updater/
4. **Check your ticket:** `docs/Ticket.md`

---

**Ready to release? Follow the quick method above or dive into docs/RELEASE_GUIDE.md for complete instructions!** 🚀

**Pro Tip:** Do a test release with version 0.1.0 first to practice the workflow before your official 1.0.0 release!
