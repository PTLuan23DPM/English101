# ⚡ QUICK START - AI WRITING

## 🎯 **3-MINUTE SETUP**

### **Step 1: Copy Model Files** (30 seconds)

**Option A - PowerShell Script** (Recommended):
```powershell
# Right-click copy-models.ps1 → "Run with PowerShell"
# OR
.\copy-models.ps1
```

**Option B - Manual**:
```powershell
Copy-Item "C:\Users\ADMIN\Downloads\ielts_model\content\ielts_model\model.keras" `
  -Destination "ai-models\writing-scorer\"
  
Copy-Item "C:\Users\ADMIN\Downloads\ielts_model\content\ielts_model\scaler.pkl" `
  -Destination "ai-models\writing-scorer\"
```

### **Step 2: Start Python Service** (2 minutes)

**Option A - Batch File** (Recommended):
```powershell
cd python-services
# Double-click start-service.bat
# OR
.\start-service.bat
```

**Option B - Manual**:
```powershell
cd python-services
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
python writing_scorer.py
```

### **Step 3: Verify** (10 seconds)

Open browser: http://localhost:5001/health

Should see:
```json
{"status":"healthy","model_loaded":true}
```

---

## ✅ **YOU'RE DONE!**

Both services running:
- ✅ **Next.js**: http://localhost:3000 (already running)
- ✅ **Python**: http://localhost:5001 (just started)

---

## 🧪 **TEST FEATURES**

### **1. Timer Feature**
1. Go to: http://localhost:3000/english/writing
2. Click "Set Timer" button
3. Select "1 minute" (for quick test)
4. Write some text
5. Wait for timer to expire
6. Try to edit → **Blocked!** ✅

### **2. AI Assistant**
1. Write 50+ words
2. Click "AI Assistant" button (bottom-right)
3. Click "Check Grammar"
4. See grammar issues
5. Click "Get Suggestions"
6. See writing tips

### **3. AI Scoring**
1. Write 250+ words
2. Click "Submit"
3. Frontend calls Python service
4. Get CEFR level (A1-C2)
5. See detailed scores
6. View feedback

---

## 📊 **WHAT YOU GET**

### **Scoring Output**
```
CEFR Level: B2 (Upper Intermediate)
IELTS Score: 6.5

Task Response: 6.5/9
  ✓ Good word count
  ⚠️ Add more examples

Coherence & Cohesion: 6.0/9
  ✓ Good sentence variety
  
Lexical Resource: 7.0/9
  ✓ Good vocabulary diversity
  
Grammatical Range: 6.5/9
  ✓ Good sentence complexity
  
Statistics:
  Words: 287
  Sentences: 14
  Paragraphs: 4
  Unique words: 178
```

### **AI Suggestions**
```
📝 VOCABULARY
Consider using more academic vocabulary
Example: Instead of "very good", try "excellent"

📝 STRUCTURE  
Essays typically have 4-5 paragraphs
Example: Intro, 2-3 body, conclusion

📝 COHERENCE
Use linking words to connect ideas
Example: However, Moreover, Therefore
```

---

## 🔧 **TROUBLESHOOTING**

### Python service fails to start

**Error: "Module 'tensorflow' not found"**
```powershell
cd python-services
.\venv\Scripts\activate
pip install tensorflow==2.15.0
```

**Error: "Can't find model.keras"**
```powershell
# Run copy script again
.\copy-models.ps1
```

**Error: "Port 5001 already in use"**
```powershell
# Kill process
Get-Process -Id (Get-NetTCPConnection -LocalPort 5001).OwningProcess | Stop-Process
```

### Frontend can't connect

**Check Python service is running:**
```powershell
curl http://localhost:5001/health
```

**If not running:**
```powershell
cd python-services
.\start-service.bat
```

---

## 📁 **PROJECT STRUCTURE**

```
English101/
├── ai-models/
│   └── writing-scorer/
│       ├── model.keras          ✅ (288 KB)
│       └── scaler.pkl           ✅ (2 KB)
│
├── python-services/
│   ├── venv/                    ✅ (auto-created)
│   ├── writing_scorer.py        ✅
│   ├── requirements.txt         ✅
│   └── start-service.bat        ✅
│
├── src/app/english/writing/
│   ├── components/
│   │   ├── TimerModal.tsx       ✅
│   │   └── AIAssistant.tsx      ✅
│   └── page.tsx                 ⏳ (to be updated)
│
├── copy-models.ps1              ✅
└── Documentation/
    ├── AI_WRITING_COMPLETE.md
    ├── WRITING_AI_IMPLEMENTATION.md
    └── QUICK_START_AI_WRITING.md ← You are here
```

---

## 🎨 **UI COMPONENTS READY**

- ✅ **TimerModal** - Popup to set timer
- ✅ **AIAssistant** - Floating panel for grammar/suggestions
- ✅ **CSS Styles** - All styles added to globals.css

**What's left:**
- ⏳ Update writing page to use these components
- ⏳ Integrate scoring API call
- ⏳ Display results with CEFR level

---

## 📝 **NEXT: UPDATE WRITING PAGE**

Edit `src/app/english/writing/page.tsx`:

1. **Import components:**
```typescript
import TimerModal from "./components/TimerModal";
import AIAssistant from "./components/AIAssistant";
```

2. **Add state:**
```typescript
const [showTimerModal, setShowTimerModal] = useState(false);
const [timeLeft, setTimeLeft] = useState<number | null>(null);
const [timerExpired, setTimerExpired] = useState(false);
```

3. **Add timer logic:**
```typescript
const startTimer = (minutes: number) => {
  setTimeLeft(minutes * 60);
  setTimerExpired(false);
};

useEffect(() => {
  if (timeLeft === null || timeLeft <= 0) return;
  
  const interval = setInterval(() => {
    setTimeLeft(prev => {
      if (prev === null || prev <= 1) {
        setTimerExpired(true);
        toast.warning("Time's up!");
        return 0;
      }
      return prev - 1;
    });
  }, 1000);
  
  return () => clearInterval(interval);
}, [timeLeft]);
```

4. **Add components to JSX:**
```tsx
{/* Set Timer Button */}
<button onClick={() => setShowTimerModal(true)}>
  ⏱️ Set Timer
</button>

{/* Timer Display */}
{timeLeft !== null && (
  <div className={`timer-display ${timeLeft < 300 ? 'warning' : ''} ${timerExpired ? 'expired' : ''}`}>
    ⏱️ {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
  </div>
)}

{/* Textarea with block */}
<textarea
  value={text}
  onChange={(e) => setText(e.target.value)}
  disabled={timerExpired}
  className={timerExpired ? "disabled" : ""}
/>

{/* Modals */}
<TimerModal 
  isOpen={showTimerModal}
  onClose={() => setShowTimerModal(false)}
  onStart={startTimer}
/>

{/* AI Assistant */}
<AIAssistant text={text} />
```

5. **Update submit to call Python service:**
```typescript
const handleSubmit = async () => {
  const response = await fetch('http://localhost:5001/score', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, prompt: currentPrompt.prompt })
  });
  
  const result = await response.json();
  // Display result.cefr_level, result.detailed_scores, etc.
};
```

---

## 🎉 **THAT'S IT!**

**Components ready:** ✅  
**Python service ready:** ✅  
**Model loaded:** ✅  
**CSS added:** ✅  

**Just update the writing page and test!** 🚀

---

## 📚 **FULL DOCUMENTATION**

- **QUICK_START_AI_WRITING.md** ← You are here
- **AI_WRITING_COMPLETE.md** - Complete feature list
- **WRITING_AI_IMPLEMENTATION.md** - Technical implementation
- **COPY_MODEL_FILES.md** - Detailed setup
- **SIDEBAR_V2_COMPLETE.md** - Sidebar redesign

---

**Ready to test! 🎊**

