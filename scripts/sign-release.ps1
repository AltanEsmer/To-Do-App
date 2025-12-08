# TodoApp Signing Helper Script
# This script helps you sign your release installers

param(
    [Parameter(Mandatory=$true)]
    [string]$Version,
    
    [Parameter(Mandatory=$false)]
    [string]$KeyPath = "$env:USERPROFILE\.tauri\todoapp.key",
    
    [Parameter(Mandatory=$false)]
    [ValidateSet("windows", "macos", "linux")]
    [string]$Platform = "windows"
)

Write-Host "🔐 TodoApp Signing Helper" -ForegroundColor Cyan
Write-Host "Version: $Version" -ForegroundColor Green
Write-Host "Platform: $Platform" -ForegroundColor Green
Write-Host ""

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

# Sign based on platform
switch ($Platform) {
    "windows" {
        $installer = "target\release\bundle\msi\TodoApp_${Version}_x64_en-US.msi"
        if (-not (Test-Path $installer)) {
            Write-Host "❌ Error: Installer not found at $installer" -ForegroundColor Red
            Write-Host "Build first with: npm run tauri:build" -ForegroundColor Yellow
            exit 1
        }
        
        Write-Host "🔏 Signing Windows installer..." -ForegroundColor Yellow
        tauri-signer sign $KeyPath $installer
        
        if (Test-Path "$installer.sig") {
            Write-Host "✅ Windows installer signed" -ForegroundColor Green
            Write-Host ""
            Write-Host "📋 Signature content:" -ForegroundColor Cyan
            Get-Content "$installer.sig"
        } else {
            Write-Host "❌ Error: Signature file not created" -ForegroundColor Red
            exit 1
        }
    }
    
    "macos" {
        $installer = "target\release\bundle\macos\TodoApp.app"
        if (-not (Test-Path $installer)) {
            Write-Host "❌ Error: App bundle not found at $installer" -ForegroundColor Red
            exit 1
        }
        
        Write-Host "🔏 Signing macOS app..." -ForegroundColor Yellow
        tauri-signer sign $KeyPath $installer
        
        if (Test-Path "$installer.tar.gz.sig") {
            Write-Host "✅ macOS app signed" -ForegroundColor Green
            Write-Host ""
            Write-Host "📋 Signature content:" -ForegroundColor Cyan
            Get-Content "$installer.tar.gz.sig"
        }
    }
    
    "linux" {
        $installer = "target\release\bundle\appimage\todo-app_${Version}_amd64.AppImage"
        if (-not (Test-Path $installer)) {
            Write-Host "❌ Error: AppImage not found at $installer" -ForegroundColor Red
            exit 1
        }
        
        Write-Host "🔏 Signing Linux AppImage..." -ForegroundColor Yellow
        tauri-signer sign $KeyPath $installer
        
        if (Test-Path "$installer.sig") {
            Write-Host "✅ Linux AppImage signed" -ForegroundColor Green
            Write-Host ""
            Write-Host "📋 Signature content:" -ForegroundColor Cyan
            Get-Content "$installer.sig"
        }
    }
}

Set-Location ..

Write-Host ""
Write-Host "📋 Next steps:" -ForegroundColor Cyan
Write-Host "  1. Create updater.json with the signature above" -ForegroundColor White
Write-Host "  2. Create GitHub release with tag v$Version" -ForegroundColor White
Write-Host "  3. Upload: installer + .sig file + updater.json" -ForegroundColor White
Write-Host "  4. See RELEASE_GUIDE.md for details" -ForegroundColor White
Write-Host ""
