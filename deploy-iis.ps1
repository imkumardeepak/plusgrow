param (
    [string]$BackendDeployPath = "C:\inetpub\wwwroot\plusgrow-api",
    [string]$FrontendDeployPath = "C:\inetpub\wwwroot\plusgrow-app",
    [string]$AppPoolName = "PlusGrowApiAppPool"
)

$ErrorActionPreference = "Stop"

Write-Host "========================================"
Write-Host "🚀 Starting Deployment Process..."
Write-Host "========================================"

# Ensure IIS Administration module is available
Import-Module WebAdministration -ErrorAction SilentlyContinue

Write-Host "1. Stopping IIS App Pool ($AppPoolName) to release file locks..."
try {
    Stop-WebAppPool -Name $AppPoolName
    Start-Sleep -Seconds 2 # Give it time to fully stop
} catch {
    Write-Host "⚠️ Could not stop App Pool (it might not exist yet or need admin privileges). Continuing..." -ForegroundColor Yellow
}

Write-Host "`n2. Building and Publishing Backend (ASP.NET Core)..."
$BackendProject = "Backend/PlusgrowWms.Api/PlusgrowWms.Api.csproj"
if (Test-Path $BackendProject) {
    # We publish directly to the IIS folder
    dotnet publish $BackendProject -c Release -o $BackendDeployPath
    Write-Host "✅ Backend published successfully to $BackendDeployPath" -ForegroundColor Green
} else {
    Write-Host "❌ Backend project not found at $BackendProject!" -ForegroundColor Red
    exit 1
}

Write-Host "`n3. Building Frontend (React/Vite)..."
$FrontendDir = "Frontend"
if (Test-Path $FrontendDir) {
    Push-Location $FrontendDir
    Write-Host "Installing NPM dependencies..."
    npm install
    Write-Host "Building production bundle..."
    npm run build
    Pop-Location
    
    Write-Host "Copying frontend files to IIS..."
    # Ensure destination exists
    if (-not (Test-Path $FrontendDeployPath)) {
        New-Item -ItemType Directory -Force -Path $FrontendDeployPath | Out-Null
    }
    
    # Clean old files first (optional, but recommended to avoid stale files)
    Remove-Item -Path "$FrontendDeployPath\*" -Recurse -Force -ErrorAction SilentlyContinue
    
    # Copy new build
    Copy-Item -Path "$FrontendDir\dist\*" -Destination $FrontendDeployPath -Recurse -Force
    Write-Host "✅ Frontend deployed successfully to $FrontendDeployPath" -ForegroundColor Green
} else {
    Write-Host "❌ Frontend directory not found at $FrontendDir!" -ForegroundColor Red
    exit 1
}

Write-Host "`n4. Starting IIS App Pool ($AppPoolName)..."
try {
    Start-WebAppPool -Name $AppPoolName
    Write-Host "✅ App Pool started." -ForegroundColor Green
} catch {
    Write-Host "⚠️ Could not start App Pool. You may need to start it manually." -ForegroundColor Yellow
}

Write-Host "========================================"
Write-Host "🎉 Deployment Completed Successfully!"
Write-Host "========================================"
