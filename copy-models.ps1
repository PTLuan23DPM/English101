# Copy IELTS Model Files Script
Write-Host "🤖 Copying IELTS Model Files..." -ForegroundColor Cyan
Write-Host ""

# Define paths
$sourcePath = "C:\Users\ADMIN\Downloads\ielts_model\content\ielts_model"
$destPath = "C:\Users\ADMIN\Desktop\English101\ai-models\writing-scorer"

# Check if source exists
if (-not (Test-Path $sourcePath)) {
    Write-Host "❌ Source path not found!" -ForegroundColor Red
    Write-Host "   Expected: $sourcePath" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Please check the path and try again." -ForegroundColor Yellow
    pause
    exit 1
}

# Check if model.keras exists
if (-not (Test-Path "$sourcePath\model.keras")) {
    Write-Host "❌ model.keras not found!" -ForegroundColor Red
    Write-Host "   Expected: $sourcePath\model.keras" -ForegroundColor Yellow
    pause
    exit 1
}

# Check if scaler.pkl exists
if (-not (Test-Path "$sourcePath\scaler.pkl")) {
    Write-Host "❌ scaler.pkl not found!" -ForegroundColor Red
    Write-Host "   Expected: $sourcePath\scaler.pkl" -ForegroundColor Yellow
    pause
    exit 1
}

# Create destination directory if it doesn't exist
if (-not (Test-Path $destPath)) {
    Write-Host "📁 Creating destination directory..." -ForegroundColor Yellow
    New-Item -ItemType Directory -Force -Path $destPath | Out-Null
}

# Copy model.keras
Write-Host "📦 Copying model.keras (288 KB)..." -ForegroundColor Yellow
Copy-Item "$sourcePath\model.keras" -Destination "$destPath\model.keras" -Force

# Copy scaler.pkl
Write-Host "📦 Copying scaler.pkl (2 KB)..." -ForegroundColor Yellow
Copy-Item "$sourcePath\scaler.pkl" -Destination "$destPath\scaler.pkl" -Force

# Verify
Write-Host ""
Write-Host "✅ Files copied successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "📂 Destination: $destPath" -ForegroundColor Cyan
Write-Host ""

# List files
Get-ChildItem $destPath | Format-Table Name, Length -AutoSize

Write-Host ""
Write-Host "🎉 Done! You can now start the Python service." -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. cd python-services" -ForegroundColor White
Write-Host "  2. python -m venv venv" -ForegroundColor White
Write-Host "  3. .\venv\Scripts\activate" -ForegroundColor White
Write-Host "  4. pip install -r requirements.txt" -ForegroundColor White
Write-Host "  5. python writing_scorer.py" -ForegroundColor White
Write-Host ""

pause

