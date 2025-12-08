# TodoApp Release Helper Script
# This script helps you prepare a release by updating version numbers

param(
    [Parameter(Mandatory=$true)]
    [string]$Version,
    
    [Parameter(Mandatory=$false)]
    [string]$Author = "you",
    
    [Parameter(Mandatory=$false)]
    [string]$License = "MIT"
)

Write-Host "🚀 TodoApp Release Helper" -ForegroundColor Cyan
Write-Host "Preparing version: $Version" -ForegroundColor Green
Write-Host ""

# Validate version format (basic semantic versioning)
if ($Version -notmatch '^\d+\.\d+\.\d+$') {
    Write-Host "❌ Error: Version must be in format X.Y.Z (e.g., 1.0.0)" -ForegroundColor Red
    exit 1
}

# Update package.json
Write-Host "📝 Updating package.json..." -ForegroundColor Yellow
$packageJson = Get-Content "package.json" -Raw | ConvertFrom-Json
$packageJson.version = $Version
$packageJson | ConvertTo-Json -Depth 100 | Set-Content "package.json"
Write-Host "✅ package.json updated" -ForegroundColor Green

# Update Cargo.toml
Write-Host "📝 Updating src-tauri/Cargo.toml..." -ForegroundColor Yellow
$cargoContent = Get-Content "src-tauri/Cargo.toml" -Raw
$cargoContent = $cargoContent -replace 'version = "[\d\.]+"', "version = `"$Version`""
$cargoContent = $cargoContent -replace 'authors = \["[^"]*"\]', "authors = [`"$Author`"]"
$cargoContent = $cargoContent -replace 'license = "[^"]*"', "license = `"$License`""
$cargoContent | Set-Content "src-tauri/Cargo.toml"
Write-Host "✅ Cargo.toml updated" -ForegroundColor Green

# Update tauri.conf.json
Write-Host "📝 Updating src-tauri/tauri.conf.json..." -ForegroundColor Yellow
$tauriConf = Get-Content "src-tauri/tauri.conf.json" -Raw | ConvertFrom-Json
$tauriConf.package.version = $Version
$tauriConf | ConvertTo-Json -Depth 100 | Set-Content "src-tauri/tauri.conf.json"
Write-Host "✅ tauri.conf.json updated" -ForegroundColor Green

Write-Host ""
Write-Host "✅ All version numbers updated to $Version" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Next steps:" -ForegroundColor Cyan
Write-Host "  1. Review the changes: git diff" -ForegroundColor White
Write-Host "  2. Run tests: npm run test" -ForegroundColor White
Write-Host "  3. Test in dev mode: npm run tauri:dev" -ForegroundColor White
Write-Host "  4. Commit changes: git add . && git commit -m 'chore: bump version to $Version'" -ForegroundColor White
Write-Host "  5. Push changes: git push" -ForegroundColor White
Write-Host "  6. Build release: npm run tauri:build" -ForegroundColor White
Write-Host "  7. Follow RELEASE_GUIDE.md for complete instructions" -ForegroundColor White
Write-Host ""
