# Script to start English101 project
Write-Host "🚀 Starting English101 Project..." -ForegroundColor Cyan

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

# Step 2: Start Docker containers
Write-Host "`n🐳 Starting Docker containers..." -ForegroundColor Yellow
docker compose up -d
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to start Docker containers" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Docker containers started" -ForegroundColor Green

# Step 3: Wait for database to be ready
Write-Host "`n⏳ Waiting for database to be ready..." -ForegroundColor Yellow
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
Write-Host "`n📊 Running database migrations..." -ForegroundColor Yellow
npx prisma migrate deploy
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  Migration failed, trying migrate dev..." -ForegroundColor Yellow
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

# Step 8: Start dev server
Write-Host "`n🚀 Starting Next.js dev server..." -ForegroundColor Yellow
Write-Host "   Web app: http://localhost:3000" -ForegroundColor Cyan
Write-Host "   Admin: http://localhost:3000/admin-dashboard/dashboard" -ForegroundColor Cyan
Write-Host "`n   Login credentials:" -ForegroundColor Yellow
Write-Host "   User: test@example.com / password123" -ForegroundColor White
Write-Host "   Admin: admin@example.com / password123" -ForegroundColor White
Write-Host "`n   Press Ctrl+C to stop the server" -ForegroundColor Gray
Write-Host ""

npm run dev

