# 🤖 WRITING AI IMPLEMENTATION GUIDE

## 📋 **OVERVIEW**

Integrated IELTS scoring model vào writing practice với:
1. **AI-powered scoring** (IELTS → CEFR conversion)
2. **Grammar checking** service
3. **AI Assistant** với suggestions
4. **Timer** với block editing feature

---

## 🛠️ **ARCHITECTURE**

```
┌─────────────────────────────────────────────────┐
│              Frontend (Next.js)                 │
│  ┌──────────────┐  ┌──────────────┐             │
│  │ Writing Page │  │ AI Assistant │             │
│  │  + Timer     │  │  Component   │             │
│  └──────┬───────┘  └──────┬───────┘             │
│         │                  │                      │
│         └──────┬───────────┘                     │
└────────────────┼─────────────────────────────────┘
                 │ HTTP Request
┌────────────────┼─────────────────────────────────┐
│         Python Service (Flask)                   │
│  ┌──────▼───────────────────────────┐            │
│  │  Writing Scorer API (port 5001)  │            │
│  │  ┌──────────────┐  ┌───────────┐ │            │
│  │  │ model.keras  │  │scaler.pkl │ │            │
│  │  │(IELTS model) │  │           │ │            │
│  │  └──────────────┘  └───────────┘ │            │
│  └──────────────────────────────────┘            │
└──────────────────────────────────────────────────┘
```

---

## 📁 **FILES CREATED**

### **Python Service**
```
python-services/
├── writing_scorer.py          # Flask API service
└── requirements.txt           # Python dependencies

ai-models/
└── writing-scorer/
    ├── model.keras           # Copy from Downloads
    └── scaler.pkl            # Copy from Downloads
```

### **Frontend Components**
```
src/app/english/writing/components/
├── TimerModal.tsx            # Timer popup
└── AIAssistant.tsx          # AI Assistant panel
```

---

## 🚀 **SETUP INSTRUCTIONS**

### **Step 1: Copy Model Files**

```bash
# Copy model files từ Downloads
cp "C:\Users\ADMIN\Downloads\ielts_model\content\ielts_model\model.keras" ai-models/writing-scorer/
cp "C:\Users\ADMIN\Downloads\ielts_model\content\ielts_model\scaler.pkl" ai-models/writing-scorer/
```

### **Step 2: Setup Python Environment**

```bash
# Create virtual environment
cd python-services
python -m venv venv

# Activate (Windows)
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### **Step 3: Start Python Service**

```bash
# In python-services directory
python writing_scorer.py

# Service will start on: http://localhost:5001
```

### **Step 4: Update .env**

```env
# Add to .env
PYTHON_SERVICE_URL=http://localhost:5001
```

---

## 🎯 **FEATURES**

### **1. AI Scoring Model** 🤖

**Endpoint:** `POST http://localhost:5001/score`

**Input:**
```json
{
  "text": "Your essay here...",
  "prompt": "Essay topic..."
}
```

**Output:**
```json
{
  "ielts_score": 7.5,
  "overall_score": 7.3,
  "cefr_level": "C1",
  "cefr_description": "Advanced",
  "detailed_scores": {
    "task_response": {
      "score": 7.5,
      "feedback": ["✓ Good word count", "..."]
    },
    "coherence_cohesion": {
      "score": 7.0,
      "feedback": ["✓ Good sentence variety"]
    },
    "lexical_resource": {
      "score": 7.5,
      "feedback": ["✓ Good vocabulary diversity"]
    },
    "grammatical_range": {
      "score": 7.0,
      "feedback": ["✓ Good sentence complexity"]
    }
  },
  "word_count": 287,
  "statistics": {
    "words": 287,
    "characters": 1543,
    "sentences": 14,
    "paragraphs": 4,
    "unique_words": 178
  }
}
```

**IELTS → CEFR Conversion:**
```
IELTS 8.5-9.0  →  C2 (Proficient)
IELTS 7.0-8.0  →  C1 (Advanced)
IELTS 5.5-6.5  →  B2 (Upper Intermediate)
IELTS 4.0-5.0  →  B1 (Intermediate)
IELTS 3.0-3.5  →  A2 (Elementary)
IELTS 0.0-2.5  →  A1 (Beginner)
```

---

### **2. Grammar Checking** ✅

**Endpoint:** `POST http://localhost:5001/grammar-check`

**Features:**
- Capitalization errors
- Pronoun usage ("i" → "I")
- Basic grammar patterns
- Extensible (can add LanguageTool API)

**Output:**
```json
{
  "issues": [
    {
      "type": "capitalization",
      "message": "Sentence should start with capital letter",
      "sentence_index": 0,
      "severity": "error"
    }
  ],
  "issue_count": 1
}
```

---

### **3. Timer Feature** ⏱️

**Component:** `TimerModal.tsx`

**Preset Times:**
- 15 minutes (Quick practice)
- 20 minutes (IELTS Task 1)
- 40 minutes (IELTS Task 2)
- 60 minutes (Extended)
- Custom time (1-120 minutes)

**Behavior:**
- Start timer → Countdown begins
- Visual timer display (MM:SS)
- Warning at 5 minutes left
- Time expires → **Block editing** (textarea disabled)
- Toast notifications

**Implementation:**
```tsx
const [timeLeft, setTimeLeft] = useState<number | null>(null);
const [timerExpired, setTimerExpired] = useState(false);

// Start timer
const startTimer = (minutes: number) => {
  setTimeLeft(minutes * 60);
  setTimerExpired(false);
};

// Countdown
useEffect(() => {
  if (timeLeft === null || timeLeft <= 0) return;
  
  const interval = setInterval(() => {
    setTimeLeft(prev => {
      if (prev === null || prev <= 1) {
        setTimerExpired(true);
        toast.warning("Time's up!", {
          description: "You can no longer edit your text"
        });
        return 0;
      }
      return prev - 1;
    });
  }, 1000);
  
  return () => clearInterval(interval);
}, [timeLeft]);

// Block textarea
<textarea
  value={text}
  onChange={(e) => setText(e.target.value)}
  disabled={timerExpired}  // ← Block when expired
  className={timerExpired ? "disabled" : ""}
/>
```

---

### **4. AI Assistant Panel** 🎨

**Component:** `AIAssistant.tsx`

**Features:**

#### **Grammar Tab**
- Real-time grammar checking
- Issue categorization (error/warning/info)
- Sentence-level feedback

#### **Suggestions Tab**
- Word count analysis
- Sentence length analysis
- Vocabulary suggestions
- Structure suggestions
- Coherence suggestions

**Example Suggestions:**
```typescript
{
  type: "vocabulary",
  message: "Consider using more academic vocabulary",
  example: "Instead of 'very good', try 'excellent' or 'outstanding'"
}

{
  type: "structure",
  message: "Essays typically have 4-5 paragraphs",
  example: "Intro, 2-3 body paragraphs, conclusion"
}

{
  type: "coherence",
  message: "Use linking words to connect ideas",
  example: "However, Moreover, Therefore, Furthermore"
}
```

---

## 🎨 **CSS ADDITIONS**

Add to `src/app/globals.css`:

```css
/* ===== Timer Modal ===== */
.timer-modal {
  min-width: 500px;
}

.timer-modal__description {
  color: #6b7280;
  margin-bottom: 24px;
  text-align: center;
}

.timer-presets {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-bottom: 24px;
}

.timer-preset-btn {
  padding: 16px;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  background: #ffffff;
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
}

.timer-preset-btn:hover {
  border-color: #6366f1;
  background: #f9fafb;
}

.timer-preset-label {
  display: block;
  font-weight: 600;
  font-size: 15px;
  color: #111827;
  margin-bottom: 4px;
}

.timer-preset-desc {
  display: block;
  font-size: 12px;
  color: #6b7280;
}

.timer-custom {
  padding-top: 16px;
  border-top: 1px solid #e5e7eb;
}

.timer-custom label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: #374151;
  margin-bottom: 8px;
}

.timer-custom-input {
  display: flex;
  gap: 8px;
}

.timer-custom-input input {
  flex: 1;
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 14px;
}

/* ===== AI Assistant ===== */
.ai-assistant {
  position: fixed;
  right: 20px;
  bottom: 20px;
  z-index: 1000;
}

.ai-assistant__toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  color: white;
  border: none;
  border-radius: 50px;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
  transition: transform 0.2s, box-shadow 0.2s;
}

.ai-assistant__toggle:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(99, 102, 241, 0.4);
}

.ai-assistant__panel {
  position: fixed;
  right: 20px;
  bottom: 80px;
  width: 400px;
  max-height: 600px;
  background: white;
  border-radius: 16px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.ai-assistant__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #e5e7eb;
}

.ai-assistant__header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.ai-assistant__close {
  background: none;
  border: none;
  font-size: 24px;
  color: #9ca3af;
  cursor: pointer;
  line-height: 1;
}

.ai-assistant__actions {
  display: flex;
  gap: 8px;
  padding: 12px;
  background: #f9fafb;
}

.ai-action-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.ai-action-btn:hover:not(:disabled) {
  border-color: #6366f1;
  color: #6366f1;
}

.ai-action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.ai-assistant__tabs {
  display: flex;
  border-bottom: 1px solid #e5e7eb;
}

.ai-tab {
  flex: 1;
  padding: 12px;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  font-size: 13px;
  font-weight: 500;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s;
}

.ai-tab.active {
  color: #6366f1;
  border-bottom-color: #6366f1;
}

.ai-assistant__content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.ai-loading {
  text-align: center;
  padding: 40px 20px;
  color: #6b7280;
}

.ai-empty {
  text-align: center;
  padding: 40px 20px;
  color: #9ca3af;
}

.ai-empty p {
  font-size: 16px;
  font-weight: 500;
  margin-bottom: 8px;
}

.ai-empty span {
  font-size: 13px;
}

.ai-issue {
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 8px;
  border-left: 3px solid;
}

.ai-issue--error {
  background: #fef2f2;
  border-color: #ef4444;
}

.ai-issue--warning {
  background: #fefce8;
  border-color: #eab308;
}

.ai-issue__type {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  color: #6b7280;
  margin-bottom: 4px;
}

.ai-issue__message {
  font-size: 13px;
  color: #374151;
}

.ai-suggestion {
  padding: 12px;
  background: #f9fafb;
  border-radius: 8px;
  margin-bottom: 12px;
  border-left: 3px solid #6366f1;
}

.ai-suggestion__header {
  margin-bottom: 8px;
}

.ai-suggestion__type {
  display: inline-block;
  padding: 2px 8px;
  background: #eef2ff;
  color: #6366f1;
  font-size: 11px;
  font-weight: 600;
  border-radius: 4px;
  text-transform: uppercase;
}

.ai-suggestion__message {
  font-size: 13px;
  color: #374151;
  margin-bottom: 8px;
}

.ai-suggestion__example {
  padding: 8px;
  background: white;
  border-radius: 6px;
  font-size: 12px;
  color: #6b7280;
}

.ai-suggestion__example strong {
  color: #374151;
}

/* Timer Display */
.timer-display {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  color: #374151;
}

.timer-display.warning {
  background: #fef3c7;
  border-color: #fbbf24;
  color: #92400e;
}

.timer-display.expired {
  background: #fee2e2;
  border-color: #ef4444;
  color: #991b1b;
}

/* Disabled textarea */
textarea.disabled {
  background: #f3f4f6;
  color: #9ca3af;
  cursor: not-allowed;
}
```

---

## 🧪 **TESTING**

### **Test 1: Python Service**
```bash
curl -X POST http://localhost:5001/health
# Should return: {"status":"healthy","model_loaded":true}
```

### **Test 2: Score Writing**
```bash
curl -X POST http://localhost:5001/score \
  -H "Content-Type: application/json" \
  -d '{"text":"This is a test essay..."}'
```

### **Test 3: Grammar Check**
```bash
curl -X POST http://localhost:5001/grammar-check \
  -H "Content-Type: application/json" \
  -d '{"text":"i like to write essays."}'
```

### **Test 4: Timer**
1. Open writing page
2. Click "Set Timer"
3. Select 1 minute
4. Wait for timer to expire
5. Textarea should be disabled

### **Test 5: AI Assistant**
1. Write some text
2. Click "AI Assistant" button
3. Click "Check Grammar"
4. Click "Get Suggestions"
5. Review feedback

---

## 📊 **SCORING CRITERIA**

### **IELTS Band Descriptors**

| Band | Task Response | Coherence & Cohesion | Lexical Resource | Grammatical Range |
|------|--------------|---------------------|------------------|-------------------|
| 9 | Fully addresses | Skillful | Wide range | Wide range, error-free |
| 8 | Sufficiently addresses | Sequences logically | Wide resource | Wide range, few errors |
| 7 | Addresses all parts | Logical organization | Sufficient range | Good control |
| 6 | Addresses all parts | Coherent | Adequate | Mix of simple/complex |
| 5 | Addresses partially | Some organization | Limited | Limited range |

### **CEFR Mapping**

- **C2 (Proficient)**: Band 8.5-9.0
  - Can produce clear, well-structured, detailed text
  - Maintains control of organizational patterns

- **C1 (Advanced)**: Band 7.0-8.0
  - Can express ideas fluently and spontaneously
  - Can produce well-structured, detailed text

- **B2 (Upper Intermediate)**: Band 5.5-6.5
  - Can write clear, detailed text on subjects
  - Can write essays or reports

- **B1 (Intermediate)**: Band 4.0-5.0
  - Can write simple connected text
  - Can describe experiences and events

---

## 🎓 **USAGE EXAMPLES**

### **Frontend Integration**

```typescript
// Score writing
const scoreWriting = async (text: string) => {
  try {
    const response = await fetch('http://localhost:5001/score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, prompt: currentPrompt })
    });
    
    const result = await response.json();
    
    // Display results
    setCefrLevel(result.cefr_level);
    setIeltsScore(result.ielts_score);
    setDetailedScores(result.detailed_scores);
  } catch (error) {
    console.error('Scoring failed:', error);
  }
};
```

---

**✅ Implementation Complete! Start Python service và test thôi!** 🚀

