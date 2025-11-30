#!/bin/bash

echo ""
echo "========================================"
echo "  AI Scorer Service (Writing & Speaking)"
echo "========================================"
echo ""

# Check if Python is available
if ! command -v python3 &> /dev/null; then
    echo "[ERROR] Python 3 is not installed or not in PATH"
    echo "Please install Python 3.8+ and try again"
    exit 1
fi

# Change to script directory
cd "$(dirname "$0")"

# Check if venv exists
if [ ! -d "venv" ]; then
    echo "[INFO] Creating virtual environment..."
    python3 -m venv venv
    echo "[DONE] Virtual environment created"
    echo ""
fi

# Activate venv
echo "[INFO] Activating virtual environment..."
source venv/bin/activate

# Check if requirements are installed
python3 -c "import flask" 2>/dev/null
if [ $? -ne 0 ]; then
    echo "[INFO] Installing dependencies..."
    pip install -r requirements.txt
    echo "[DONE] Dependencies installed"
    echo ""
fi

# Check if models directory exists
if [ ! -d "../ai-models/writing-scorer/models" ]; then
    echo "[WARNING] Models directory not found!"
    echo "Please ensure models are in: ai-models/writing-scorer/models/"
    echo ""
fi

# Start service
echo "[INFO] Starting AI Scorer Service (Writing & Speaking)..."
echo "[INFO] Service will run on: http://localhost:8080"
echo "[INFO] Press Ctrl+C to stop"
echo ""
echo "========================================"
echo ""

python3 ai_scorer.py

