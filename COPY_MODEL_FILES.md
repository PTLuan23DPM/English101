# 📋 COPY MODEL FILES - HƯỚNG DẪN

## 🎯 **MỤC TIÊU**

Copy 2 files từ Downloads vào project:
1. `model.keras` (288KB) - IELTS scoring model
2. `scaler.pkl` (2KB) - Data scaler

---

## 📁 **LOCATION**

**From:** `C:\Users\ADMIN\Downloads\ielts_model\content\ielts_model\`
**To:** `C:\Users\ADMIN\Desktop\English101\ai-models\writing-scorer\`

---

## 🚀 **METHOD 1: PowerShell Command**

```powershell
# Copy model.keras
Copy-Item "C:\Users\ADMIN\Downloads\ielts_model\content\ielts_model\model.keras" `
  -Destination "C:\Users\ADMIN\Desktop\English101\ai-models\writing-scorer\model.keras"

# Copy scaler.pkl
Copy-Item "C:\Users\ADMIN\Downloads\ielts_model\content\ielts_model\scaler.pkl" `
  -Destination "C:\Users\ADMIN\Desktop\English101\ai-models\writing-scorer\scaler.pkl"

# Verify
Get-ChildItem "C:\Users\ADMIN\Desktop\English101\ai-models\writing-scorer\"
```

---

## 🖱️ **METHOD 2: File Explorer (Manual)**

### Step 1: Open Source Folder
1. Press `Win + E` (open File Explorer)
2. Navigate to: `C:\Users\ADMIN\Downloads\ielts_model\content\ielts_model\`
3. You should see:
   - `model.keras` (288 KB)
   - `scaler.pkl` (2 KB)

### Step 2: Open Destination Folder
1. Open another File Explorer window
2. Navigate to: `C:\Users\ADMIN\Desktop\English101\ai-models\writing-scorer\`

### Step 3: Copy Files
1. Select both `model.keras` and `scaler.pkl`
2. Press `Ctrl + C` (copy)
3. Go to destination folder
4. Press `Ctrl + V` (paste)

---

## ✅ **VERIFY**

After copying, check files exist:

```powershell
cd C:\Users\ADMIN\Desktop\English101

# List files
dir ai-models\writing-scorer

# Should show:
# model.keras (288 KB)
# scaler.pkl (2 KB)
```

---

## 🔧 **SETUP PYTHON SERVICE**

### Step 1: Create Virtual Environment

```powershell
cd python-services

# Create venv
python -m venv venv

# Activate
.\venv\Scripts\activate

# You should see (venv) in prompt
```

### Step 2: Install Dependencies

```powershell
# Make sure venv is activated
pip install -r requirements.txt

# This will install:
# - flask
# - tensorflow
# - numpy
# - scikit-learn
```

### Step 3: Test Python Service

```powershell
# Start service
python writing_scorer.py

# Should see:
# Starting Writing Scorer Service on port 5001...
# * Running on http://0.0.0.0:5001
```

### Step 4: Test in Browser

Open: http://localhost:5001/health

Should return:
```json
{
  "status": "healthy",
  "model_loaded": true
}
```

---

## 🧪 **TEST SCORING**

Use PowerShell or Postman:

```powershell
# Test scoring
$body = @{
    text = "Education is very important in modern society. It helps people to develop skills and knowledge. Many students study hard to achieve their goals. Teachers play a crucial role in the learning process. They provide guidance and support to students."
} | ConvertTo-Json

Invoke-RestMethod -Method POST -Uri "http://localhost:5001/score" `
  -ContentType "application/json" -Body $body
```

Expected output:
```json
{
  "ielts_score": 6.5,
  "cefr_level": "B2",
  "cefr_description": "Upper Intermediate",
  "detailed_scores": {
    "task_response": {...},
    "coherence_cohesion": {...},
    "lexical_resource": {...},
    "grammatical_range": {...}
  },
  "word_count": 45,
  "statistics": {...}
}
```

---

## ⚠️ **TROUBLESHOOTING**

### Error: "Module not found: tensorflow"
```powershell
# Make sure venv is activated
.\venv\Scripts\activate

# Reinstall
pip install tensorflow==2.15.0
```

### Error: "Cannot load model.keras"
```powershell
# Check file exists
dir ..\ai-models\writing-scorer\model.keras

# If not found, copy again
Copy-Item "C:\Users\ADMIN\Downloads\ielts_model\content\ielts_model\model.keras" `
  -Destination "..\ai-models\writing-scorer\model.keras"
```

### Error: "Port 5001 already in use"
```powershell
# Kill process on port 5001
Get-Process -Id (Get-NetTCPConnection -LocalPort 5001).OwningProcess | Stop-Process

# Or use different port
# Edit writing_scorer.py, change:
# app.run(port=5002)
```

---

## 🎯 **QUICK START CHECKLIST**

- [ ] Copy `model.keras` to `ai-models/writing-scorer/`
- [ ] Copy `scaler.pkl` to `ai-models/writing-scorer/`
- [ ] Create Python venv
- [ ] Activate venv
- [ ] Install requirements
- [ ] Start Python service
- [ ] Test `/health` endpoint
- [ ] Test `/score` endpoint
- [ ] Service running on port 5001 ✓

---

## 🔄 **AUTO-START (Optional)**

Create batch file `start-python-service.bat`:

```batch
@echo off
cd python-services
call venv\Scripts\activate
python writing_scorer.py
pause
```

Double-click to start service!

---

**✅ Once both services are running:**
- Next.js: http://localhost:3000
- Python: http://localhost:5001

**Ready to test writing AI features!** 🎉

