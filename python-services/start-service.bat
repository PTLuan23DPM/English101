@echo off
echo.
echo ========================================
echo   IELTS Writing Scorer Service
echo ========================================
echo.

REM Check if Python is available
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python is not installed or not in PATH
    echo Please install Python 3.8+ and try again
    pause
    exit /b 1
)

REM Change to script directory
cd /d "%~dp0"

REM Check if venv exists
if not exist "venv" (
    echo [INFO] Creating virtual environment...
    python -m venv venv
    echo [DONE] Virtual environment created
    echo.
)

REM Activate venv
echo [INFO] Activating virtual environment...
call venv\Scripts\activate.bat

REM Check if requirements are installed
python -c "import flask" 2>nul
if errorlevel 1 (
    echo [INFO] Installing dependencies...
    pip install -r requirements.txt
    echo [DONE] Dependencies installed
    echo.
)

REM Check if models directory exists
if not exist "..\ai-models\writing-scorer\models" (
    echo [WARNING] Models directory not found!
    echo Please ensure models are in: ai-models\writing-scorer\models\
    echo.
)

REM Start service
echo [INFO] Starting Writing Scorer Service...
echo [INFO] Service will run on: http://localhost:5001
echo [INFO] Press Ctrl+C to stop
echo.
echo ========================================
echo.

python writing_scorer.py

pause
