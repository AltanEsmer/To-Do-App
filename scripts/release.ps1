# TodoApp Complete Release Script
# This script automates the entire release process: version bump, build, sign, and create updater.json

param(
    [Parameter(Mandatory=$true)]
    [string]$Version,
    
    [Parameter(Mandatory=$false)]
    [string]$ReleaseNotes = "Bug fixes and improvements",
    
    [Parameter(Mandatory=$false)]
    [string]$KeyPath = "$env:USERPROFILE\.tauri\todoapp.key",
    
    [Parameter(Mandatory=$false)]
    [ValidateSet("windows", "macos", "linux", "all")]
    [string]$Platform = "windows",
    
    [Parameter(Mandatory=$false)]
    [string]$GitHubUser = "AltanEsmer",
    
    [Parameter(Mandatory=$false)]
    [string]$GitHubRepo = "To-Do-App",
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipBuild,
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipSign,
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipCommit
)

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "🚀 TodoApp Complete Release Script" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host "Version: $Version" -ForegroundColor Green
Write-Host "Platform: $Platform" -ForegroundColor Green
Write-Host ""

# Validate version format
if ($Version -notmatch '^\d+\.\d+\.\d+$') {
    Write-Host "❌ Error: Version must be in format X.Y.Z (e.g., 1.0.0)" -ForegroundColor Red
    exit 1
}

# Step 1: Update version numbers
Write-Host "📝 Step 1: Updating version numbers..." -ForegroundColor Yellow
Write-Host ""

# Update package.json
Write-Host "  → Updating package.json..." -ForegroundColor Gray
$packageJson = Get-Content "package.json" -Raw | ConvertFrom-Json
$oldVersion = $packageJson.version
$packageJson.version = $Version
$packageJson | ConvertTo-Json -Depth 100 | Set-Content "package.json"
Write-Host "    ✅ package.json: $oldVersion → $Version" -ForegroundColor Green

# Update Cargo.toml
Write-Host "  → Updating src-tauri/Cargo.toml..." -ForegroundColor Gray
$cargoContent = Get-Content "src-tauri/Cargo.toml" -Raw
$cargoContent = $cargoContent -replace 'version = "[\d\.]+"', "version = `"$Version`""
$cargoContent | Set-Content "src-tauri/Cargo.toml"
Write-Host "    ✅ Cargo.toml updated" -ForegroundColor Green

# Update tauri.conf.json
Write-Host "  → Updating src-tauri/tauri.conf.json..." -ForegroundColor Gray
$tauriConf = Get-Content "src-tauri/tauri.conf.json" -Raw | ConvertFrom-Json
$tauriConf.package.version = $Version
$tauriConf | ConvertTo-Json -Depth 100 | Set-Content "src-tauri/tauri.conf.json"
Write-Host "    ✅ tauri.conf.json updated" -ForegroundColor Green

Write-Host ""

# Step 2: Commit changes (optional)
if (-not $SkipCommit) {
    Write-Host "📝 Step 2: Committing version changes..." -ForegroundColor Yellow
    Write-Host "  → Staging files..." -ForegroundColor Gray
    git add package.json src-tauri/Cargo.toml src-tauri/tauri.conf.json
    Write-Host "  → Committing..." -ForegroundColor Gray
    git commit -m "chore: bump version to $Version" 2>&1 | Out-Null
    Write-Host "    ✅ Changes committed" -ForegroundColor Green
    Write-Host ""
    Write-Host "  ⚠️  Remember to push: git push" -ForegroundColor Yellow
    Write-Host ""
}

# Step 3: Build (optional)
if (-not $SkipBuild) {
    Write-Host "🔨 Step 3: Building release..." -ForegroundColor Yellow
    Write-Host "  → This may take several minutes..." -ForegroundColor Gray
    Write-Host ""
    
    npm run tauri:build
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Build failed!" -ForegroundColor Red
        exit 1
    }
    
    Write-Host ""
    Write-Host "    ✅ Build completed successfully" -ForegroundColor Green
    Write-Host ""
} else {
    Write-Host "⏭️  Step 3: Skipping build (--SkipBuild)" -ForegroundColor Yellow
    Write-Host ""
}

# Step 4: Sign installer (optional)
$signatures = @{}
if (-not $SkipSign) {
    Write-Host "🔐 Step 4: Signing installer..." -ForegroundColor Yellow
    
    # Check if key exists
    if (-not (Test-Path $KeyPath)) {
        Write-Host "❌ Error: Private key not found at $KeyPath" -ForegroundColor Red
        Write-Host "Run: tauri-signer generate -w $KeyPath" -ForegroundColor Yellow
        exit 1
    }
    
    # Check if tauri-signer is installed
    try {
        $null = Get-Command tauri-signer -ErrorAction Stop
    } catch {
        Write-Host "❌ Error: tauri-signer not found" -ForegroundColor Red
        Write-Host "Install with: cargo install tauri-signer --locked" -ForegroundColor Yellow
        exit 1
    }
    
    Set-Location "src-tauri"
    
    # Sign Windows installer
    if ($Platform -eq "windows" -or $Platform -eq "all") {
        $installer = "target\release\bundle\msi\TodoApp_${Version}_x64_en-US.msi"
        if (Test-Path $installer) {
            Write-Host "  → Signing Windows installer..." -ForegroundColor Gray
            tauri-signer sign $KeyPath $installer
            
            $sigFile = "$installer.sig"
            if (Test-Path $sigFile) {
                $signatures["windows-x86_64"] = (Get-Content $sigFile -Raw).Trim()
                Write-Host "    ✅ Windows installer signed" -ForegroundColor Green
            }
        } else {
            Write-Host "    ⚠️  Windows installer not found: $installer" -ForegroundColor Yellow
        }
    }
    
    # Sign macOS app
    if ($Platform -eq "macos" -or $Platform -eq "all") {
        $app = "target\release\bundle\macos\TodoApp.app"
        if (Test-Path $app) {
            Write-Host "  → Signing macOS app..." -ForegroundColor Gray
            tauri-signer sign $KeyPath $app
            
            $sigFile = "$app.tar.gz.sig"
            if (Test-Path $sigFile) {
                $signatures["darwin-x86_64"] = (Get-Content $sigFile -Raw).Trim()
                Write-Host "    ✅ macOS app signed" -ForegroundColor Green
            }
        } else {
            Write-Host "    ⚠️  macOS app not found: $app" -ForegroundColor Yellow
        }
    }
    
    # Sign Linux AppImage
    if ($Platform -eq "linux" -or $Platform -eq "all") {
        $installer = "target\release\bundle\appimage\todo-app_${Version}_amd64.AppImage"
        if (Test-Path $installer) {
            Write-Host "  → Signing Linux AppImage..." -ForegroundColor Gray
            tauri-signer sign $KeyPath $installer
            
            $sigFile = "$installer.sig"
            if (Test-Path $sigFile) {
                $signatures["linux-x86_64"] = (Get-Content $sigFile -Raw).Trim()
                Write-Host "    ✅ Linux AppImage signed" -ForegroundColor Green
            }
        } else {
            Write-Host "    ⚠️  Linux AppImage not found: $installer" -ForegroundColor Yellow
        }
    }
    
    Set-Location ..
    Write-Host ""
} else {
    Write-Host "⏭️  Step 4: Skipping signing (--SkipSign)" -ForegroundColor Yellow
    Write-Host ""
}

# Step 5: Create updater.json
Write-Host "📄 Step 5: Creating updater.json..." -ForegroundColor Yellow

$pubDate = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
$updaterJson = @{
    version = $Version
    notes = $ReleaseNotes
    pub_date = $pubDate
    platforms = @{}
}

# Add Windows platform
if ($signatures.ContainsKey("windows-x86_64")) {
    $updaterJson.platforms["windows-x86_64"] = @{
        signature = $signatures["windows-x86_64"]
        url = "https://github.com/$GitHubUser/$GitHubRepo/releases/download/v$Version/TodoApp_${Version}_x64_en-US.msi"
    }
}

# Add macOS platforms
if ($signatures.ContainsKey("darwin-x86_64")) {
    $updaterJson.platforms["darwin-x86_64"] = @{
        signature = $signatures["darwin-x86_64"]
        url = "https://github.com/$GitHubUser/$GitHubRepo/releases/download/v$Version/TodoApp.app.tar.gz"
    }
}

if ($signatures.ContainsKey("darwin-aarch64")) {
    $updaterJson.platforms["darwin-aarch64"] = @{
        signature = $signatures["darwin-aarch64"]
        url = "https://github.com/$GitHubUser/$GitHubRepo/releases/download/v$Version/TodoApp.app.tar.gz"
    }
}

# Add Linux platform
if ($signatures.ContainsKey("linux-x86_64")) {
    $updaterJson.platforms["linux-x86_64"] = @{
        signature = $signatures["linux-x86_64"]
        url = "https://github.com/$GitHubUser/$GitHubRepo/releases/download/v$Version/todo-app_${Version}_amd64.AppImage"
    }
}

$updaterJsonPath = "updater.json"
$updaterJson | ConvertTo-Json -Depth 10 | Set-Content $updaterJsonPath
Write-Host "    ✅ updater.json created at $updaterJsonPath" -ForegroundColor Green
Write-Host ""

# Summary
Write-Host ""
Write-Host "✅ Release preparation complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Next steps:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Review updater.json:" -ForegroundColor White
Write-Host "   Get-Content updater.json" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Push changes (if not already):" -ForegroundColor White
Write-Host "   git push" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Create GitHub Release:" -ForegroundColor White
Write-Host "   - Go to: https://github.com/$GitHubUser/$GitHubRepo/releases/new" -ForegroundColor Gray
Write-Host "   - Tag: v$Version" -ForegroundColor Gray
Write-Host "   - Title: TodoApp v$Version" -ForegroundColor Gray
Write-Host "   - Upload files:" -ForegroundColor Gray

if ($Platform -eq "windows" -or $Platform -eq "all") {
    Write-Host "     • src-tauri/target/release/bundle/msi/TodoApp_${Version}_x64_en-US.msi" -ForegroundColor Gray
    Write-Host "     • src-tauri/target/release/bundle/msi/TodoApp_${Version}_x64_en-US.msi.sig" -ForegroundColor Gray
}

if ($Platform -eq "macos" -or $Platform -eq "all") {
    Write-Host "     • src-tauri/target/release/bundle/macos/TodoApp.app.tar.gz" -ForegroundColor Gray
    Write-Host "     • src-tauri/target/release/bundle/macos/TodoApp.app.tar.gz.sig" -ForegroundColor Gray
}

if ($Platform -eq "linux" -or $Platform -eq "all") {
    Write-Host "     • src-tauri/target/release/bundle/appimage/todo-app_${Version}_amd64.AppImage" -ForegroundColor Gray
    Write-Host "     • src-tauri/target/release/bundle/appimage/todo-app_${Version}_amd64.AppImage.sig" -ForegroundColor Gray
}

Write-Host "     • updater.json" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Verify update URL:" -ForegroundColor White
Write-Host "   https://github.com/$GitHubUser/$GitHubRepo/releases/latest/download/updater.json" -ForegroundColor Gray
Write-Host ""
Write-Host "🎉 Done! Your app will auto-update when users open it." -ForegroundColor Green
Write-Host ""

