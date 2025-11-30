# Script to start project WITHOUT building Python Docker (run Python locally)
Write-Host "🚀 Starting English101 WITHOUT Docker Python Service..." -ForegroundColor Cyan
Write-Host "   Python service will run locally instead" -ForegroundColor Yellow

# Step 1: Check Docker Desktop (only for database)
Write-Host "`n📦 Checking Docker Desktop for database..." -ForegroundColor Yellow
try {
    docker ps | Out-Null
    Write-Host "✅ Docker Desktop is running" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker Desktop is not running!" -ForegroundColor Red
    Write-Host "   Please start Docker Desktop for database." -ForegroundColor Yellow
    exit 1
}

# Step 2: Start only database
Write-Host "`n🐳 Starting database container..." -ForegroundColor Yellow
docker compose up -d db
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to start database" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Database started" -ForegroundColor Green

# Step 3: Wait for database
Write-Host "`n⏳ Waiting for database..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Step 4: Set DATABASE_URL
$env:DATABASE_URL = "postgresql://app:app@localhost:15432/english_app?schema=public"

# Step 5: Generate Prisma Client
Write-Host "`n🔧 Generating Prisma Client..." -ForegroundColor Yellow
npx prisma generate
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to generate Prisma Client" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Prisma Client generated" -ForegroundColor Green

# Step 6: Run migrations
Write-Host "`n📊 Running migrations..." -ForegroundColor Yellow
npx prisma migrate deploy
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  Trying migrate dev..." -ForegroundColor Yellow
    npx prisma migrate dev --name init
}
Write-Host "✅ Migrations completed" -ForegroundColor Green

# Step 7: Seed database
Write-Host "`n🌱 Seeding database..." -ForegroundColor Yellow
npm run db:seed
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  Seed failed, but continuing..." -ForegroundColor Yellow
} else {
    Write-Host "✅ Database seeded" -ForegroundColor Green
}

# Step 8: Check Python environment
Write-Host "`n🐍 Checking Python environment..." -ForegroundColor Yellow
$pythonCmd = "python"
if (Get-Command python -ErrorAction SilentlyContinue) {
    $pythonVersion = python --version 2>&1
    Write-Host "✅ Found Python: $pythonVersion" -ForegroundColor Green
} else {
    Write-Host "❌ Python not found!" -ForegroundColor Red
    Write-Host "   Please install Python 3.11+ from python.org" -ForegroundColor Yellow
    exit 1
}

# Step 9: Setup Python virtual environment
Write-Host "`n📦 Setting up Python virtual environment..." -ForegroundColor Yellow
$venvPath = "python-services\venv"
if (-not (Test-Path $venvPath)) {
    Write-Host "Creating virtual environment..." -ForegroundColor Gray
    python -m venv $venvPath
}
Write-Host "✅ Virtual environment ready" -ForegroundColor Green

# Step 10: Install Python dependencies (this will take time but faster than Docker)
Write-Host "`n📥 Installing Python packages (this may take 10-15 minutes)..." -ForegroundColor Yellow
Write-Host "   This is faster than Docker build because:" -ForegroundColor Gray
Write-Host "   - No Docker layer overhead" -ForegroundColor Gray
Write-Host "   - Direct pip install" -ForegroundColor Gray
Write-Host "   - Can use existing packages if already installed" -ForegroundColor Gray

$activateScript = "$venvPath\Scripts\Activate.ps1"
& $activateScript
pip install --upgrade pip setuptools wheel
pip install --default-timeout=2000 --retries 10 -r python-services\requirements.txt

if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  Some packages failed, but continuing..." -ForegroundColor Yellow
} else {
    Write-Host "✅ Python packages installed" -ForegroundColor Green
}

# Step 11: Start Python service in background
Write-Host "`n🚀 Starting Python service (local)..." -ForegroundColor Yellow
$pythonServiceJob = Start-Job -ScriptBlock {
    Set-Location $using:PWD
    & "$using:venvPath\Scripts\python.exe" "$using:PWD\python-services\writing_scorer.py"
}
Write-Host "✅ Python service started (PID: $($pythonServiceJob.Id))" -ForegroundColor Green
Write-Host "   Service running at: http://localhost:5001" -ForegroundColor Cyan

# Step 12: Wait a bit for Python service to start
Start-Sleep -Seconds 3

# Step 13: Start Next.js
Write-Host "`n🚀 Starting Next.js dev server..." -ForegroundColor Yellow
Write-Host "   Web app: http://localhost:3000" -ForegroundColor Cyan
Write-Host "   Admin: http://localhost:3000/admin-dashboard/dashboard" -ForegroundColor Cyan
Write-Host "   Python API: http://localhost:5001" -ForegroundColor Cyan
Write-Host "`n   Login credentials:" -ForegroundColor Yellow
Write-Host "   User: test@example.com / password123" -ForegroundColor White
Write-Host "   Admin: admin@example.com / password123" -ForegroundColor White
Write-Host "`n   Press Ctrl+C to stop all services" -ForegroundColor Gray
Write-Host ""

npm run dev

# Cleanup on exit
Write-Host "`nStopping Python service..." -ForegroundColor Yellow
Stop-Job $pythonServiceJob
Remove-Job $pythonServiceJob

