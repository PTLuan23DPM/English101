@echo off
echo.
echo ========================================
echo   IELTS Writing Scorer Service
echo ========================================
echo.

REM Check if venv exists
if not exist "venv" (
    echo [INFO] Creating virtual environment...
    python -m venv venv
    echo [DONE] Virtual environment created
    echo.
)

REM Activate venv
echo [INFO] Activating virtual environment...
call venv\Scripts\activate

REM Check if requirements are installed
python -c "import flask" 2>nul
if errorlevel 1 (
    echo [INFO] Installing dependencies...
    pip install -r requirements.txt
    echo [DONE] Dependencies installed
    echo.
)

REM Check if model files exist
if not exist "..\ai-models\writing-scorer\model.keras" (
    echo [ERROR] model.keras not found!
    echo Please run copy-models.ps1 first
    pause
    exit /b 1
)

if not exist "..\ai-models\writing-scorer\scaler.pkl" (
    echo [ERROR] scaler.pkl not found!
    echo Please run copy-models.ps1 first
    pause
    exit /b 1
)

REM Start service
echo [INFO] Starting Writing Scorer Service...
echo [INFO] Service will run on: http://localhost:5001
echo [INFO] Press Ctrl+C to stop
echo.
python writing_scorer.py

pause

