# Fix: tauri-signer Installation Issue

## Problem
The command `cargo install tauri-signer --locked` fails because `tauri-signer` is not a standalone crate. It's built into the Tauri CLI.

## Solution

### Option 1: Use Tauri CLI (Recommended)

The signing functionality is built into the Tauri CLI. Use one of these methods:

#### Method A: Using npx (No installation needed)
```powershell
# Create directory for keys
New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\.tauri"

# Generate keypair
cd src-tauri
npx @tauri-apps/cli signer generate -w "$env:USERPROFILE\.tauri\todoapp.key"
```

#### Method B: Using tauri command (if CLI is installed globally)
```powershell
# If you have tauri CLI installed globally
cd src-tauri
tauri signer generate -w "$env:USERPROFILE\.tauri\todoapp.key"
```

#### Method C: Install Tauri CLI globally first
```powershell
# Install Tauri CLI globally
npm install -g @tauri-apps/cli

# Then use tauri command
cd src-tauri
tauri signer generate -w "$env:USERPROFILE\.tauri\todoapp.key"
```

### Option 2: Use minisign (Alternative)

If the Tauri CLI method doesn't work, you can use `minisign` directly:

#### Install minisign

**Windows (using Chocolatey):**
```powershell
choco install minisign
```

**Windows (using Scoop):**
```powershell
scoop install minisign
```

**Or download from:** https://github.com/jedisct1/minisign/releases

#### Generate keys with minisign
```powershell
# Create directory
New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\.tauri"

# Generate keypair
cd "$env:USERPROFILE\.tauri"
minisign -G -p todoapp.key.pub -s todoapp.key
```

**Important:** With minisign, you'll get two files:
- `todoapp.key` - Private key (keep secret)
- `todoapp.key.pub` - Public key (use in tauri.conf.json)

## After Generating Keys

1. **Copy the public key** displayed in the terminal (or read from `todoapp.key.pub` if using minisign)

2. **Update `src-tauri/tauri.conf.json`:**
   ```json
   {
     "tauri": {
       "updater": {
         "active": true,
         "endpoints": [
           "https://github.com/YOUR_USERNAME/YOUR_REPO/releases/latest/download/updater.json"
         ],
         "dialog": true,
         "pubkey": "PASTE_PUBLIC_KEY_HERE"
       }
     }
   }
   ```

3. **Verify the private key is secure:**
   - Check `.gitignore` includes `*.key` or `~/.tauri/`
   - Never commit the private key

## Signing Installers

After building your app, sign the installers:

### Using Tauri CLI:
```powershell
cd src-tauri
npx @tauri-apps/cli signer sign "$env:USERPROFILE\.tauri\todoapp.key" target/release/bundle/msi/TodoApp_1.0.0_x64_en-US.msi
```

### Using minisign:
```powershell
minisign -S -s "$env:USERPROFILE\.tauri\todoapp.key" -m target/release/bundle/msi/TodoApp_1.0.0_x64_en-US.msi
```

## Quick Test

To verify the Tauri CLI signer works:

```powershell
cd src-tauri
npx @tauri-apps/cli signer --help
```

If this shows help text, the signer is available!

## Update Documentation

The following files need to be updated to use the correct command:
- `docs/RELEASE_GUIDE.md` - Change `cargo install tauri-signer` to use Tauri CLI
- `docs/DEPLOYMENT.md` - Update signing instructions
- `DEPLOYMENT_QUICKSTART.md` - Update quick start guide
- `scripts/sign-release.ps1` - Update script to use correct command

## Summary

✅ **Correct:** `npx @tauri-apps/cli signer generate`  
❌ **Incorrect:** `cargo install tauri-signer`

The signing functionality is part of the Tauri CLI, not a separate crate!
