# Quick start: Database + Next.js (Python service optional)
Write-Host "🚀 Quick Start - Database + Next.js" -ForegroundColor Cyan

# Start database only
Write-Host "`n📦 Starting database..." -ForegroundColor Yellow
docker compose up -d db
Start-Sleep -Seconds 5

# Setup database
$env:DATABASE_URL = "postgresql://app:app@localhost:15432/english_app?schema=public"
Write-Host "`n🔧 Setting up database..." -ForegroundColor Yellow
npx prisma generate
npx prisma migrate deploy
npm run db:seed

# Start Next.js
Write-Host "`n🚀 Starting Next.js..." -ForegroundColor Yellow
Write-Host "   Web: http://localhost:3000" -ForegroundColor Cyan
Write-Host "   Admin: http://localhost:3000/admin-dashboard/dashboard" -ForegroundColor Cyan
Write-Host "`n   Python service: Run separately if needed" -ForegroundColor Gray
Write-Host "   cd python-services && .\start-service.bat" -ForegroundColor Gray
Write-Host ""

npm run dev

