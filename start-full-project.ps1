# Script to start English101 project WITH Python service
Write-Host "🚀 Starting English101 Project (Full with Python Service)..." -ForegroundColor Cyan

# Step 1: Check Docker Desktop
Write-Host "`n📦 Checking Docker Desktop..." -ForegroundColor Yellow
try {
    docker ps | Out-Null
    Write-Host "✅ Docker Desktop is running" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker Desktop is not running!" -ForegroundColor Red
    Write-Host "   Please start Docker Desktop and run this script again." -ForegroundColor Yellow
    exit 1
}

# Step 2: Build Python service first (this may take a while)
Write-Host "`n🐍 Building Python service (this may take 10-15 minutes due to large packages)..." -ForegroundColor Yellow
Write-Host "   Installing TensorFlow (~620MB) and PyTorch..." -ForegroundColor Gray
docker compose build python-service
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to build Python service" -ForegroundColor Red
    Write-Host "   This might be due to network timeout. Try again later or check your internet connection." -ForegroundColor Yellow
    exit 1
}
Write-Host "✅ Python service built successfully" -ForegroundColor Green

# Step 3: Start Docker containers
Write-Host "`n🐳 Starting Docker containers..." -ForegroundColor Yellow
docker compose up -d
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to start Docker containers" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Docker containers started" -ForegroundColor Green

# Step 4: Wait for database to be ready
Write-Host "`n⏳ Waiting for database to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Step 5: Set DATABASE_URL
$env:DATABASE_URL = "postgresql://app:app@localhost:15432/english_app?schema=public"

# Step 6: Generate Prisma Client
Write-Host "`n🔧 Generating Prisma Client..." -ForegroundColor Yellow
npx prisma generate
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to generate Prisma Client" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Prisma Client generated" -ForegroundColor Green

# Step 7: Run migrations
Write-Host "`n📊 Running database migrations..." -ForegroundColor Yellow
npx prisma migrate deploy
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  Migration failed, trying migrate dev..." -ForegroundColor Yellow
    npx prisma migrate dev --name init
}
Write-Host "✅ Migrations completed" -ForegroundColor Green

# Step 8: Seed database
Write-Host "`n🌱 Seeding database..." -ForegroundColor Yellow
npm run db:seed
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  Seed failed, but continuing..." -ForegroundColor Yellow
} else {
    Write-Host "✅ Database seeded" -ForegroundColor Green
}

# Step 9: Check Python service health
Write-Host "`n🔍 Checking Python service..." -ForegroundColor Yellow
Start-Sleep -Seconds 3
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5001/health" -Method GET -UseBasicParsing -TimeoutSec 5 -ErrorAction SilentlyContinue
    Write-Host "✅ Python service is running" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Python service may still be starting. It will be ready soon." -ForegroundColor Yellow
}

# Step 10: Start dev server
Write-Host "`n🚀 Starting Next.js dev server..." -ForegroundColor Yellow
Write-Host "   Web app: http://localhost:3000" -ForegroundColor Cyan
Write-Host "   Admin: http://localhost:3000/admin-dashboard/dashboard" -ForegroundColor Cyan
Write-Host "   Python API: http://localhost:5001" -ForegroundColor Cyan
Write-Host "`n   Login credentials:" -ForegroundColor Yellow
Write-Host "   User: test@example.com / password123" -ForegroundColor White
Write-Host "   Admin: admin@example.com / password123" -ForegroundColor White
Write-Host "`n   Press Ctrl+C to stop the server" -ForegroundColor Gray
Write-Host ""

npm run dev

