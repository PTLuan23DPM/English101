# System Architecture Guide - Writing Scoring System

## 📍 Tổng quan về các file và chức năng

---

## 1. 🎯 NÚT SUBMIT VÀ CHẤM ĐIỂM

### Frontend (React Component)

**File**: `src/app/english/writing/page.tsx`

**Function**: `handleSubmit()` (dòng 174-351)

```typescript
const handleSubmit = async () => {
  // 1. Validate word count
  if (wordCount < 10) {
    toast.error("Not enough text");
    return;
  }

  // 2. Call scoring API
  let response = await fetch("http://localhost:5001/score-v2", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: text,
      prompt: selectedTask?.prompt || "",
      level: selectedTask?.level || "B2",
      task_type: selectedTask?.type || null,
    }),
  });

  // 3. Handle response and display results
  const result = await response.json();
  setScoringResult(result);
}
```

**Flow**:
1. User nhấn nút "Submit for Grading" → gọi `handleSubmit()`
2. Validate text (ít nhất 10 từ)
3. Gửi request đến Python service: `http://localhost:5001/score-v2`
4. Nhận kết quả và hiển thị trên UI

---

### Backend API (Python Flask Service)

**File**: `python-services/writing_scorer.py`

**Endpoint**: `/score-v2` (dòng 3001-3102)

```python
@app.route('/score-v2', methods=['POST'])
def score_writing_v2():
    """
    Score writing using NEW intelligent prompt-aware system
    """
    data = request.json
    text = data.get('text', '')
    prompt = data.get('prompt', '')
    task_level = data.get('level', 'B2')
    
    # Use intelligent scorer
    result = score_essay_intelligent(
        essay=text,
        prompt=prompt,
        task_level=task_level.upper(),
        task_type=task_type
    )
    
    return jsonify(result)
```

**Flow**:
1. Nhận request từ frontend
2. Gọi `score_essay_intelligent()` từ `intelligent_scorer.py`
3. Trả về JSON response với scores và feedback

---

### Intelligent Scorer (Core Logic)

**File**: `python-services/intelligent_scorer.py`

**Function**: `score_essay_intelligent()` (dòng 150-361)

**5 bước chấm điểm**:

1. **Prompt Analysis** (`prompt_analyzer.py`)
   - Phân tích đề bài để hiểu requirements
   - Trích xuất task type, keywords, required elements

2. **Content Validation** (`content_validator.py`)
   - Kiểm tra xem essay có on-topic không
   - Nếu off-topic → return 0.0 ngay lập tức

3. **Quality Assessment** (`quality_assessor.py`)
   - Đánh giá vocabulary, grammar, coherence
   - Sử dụng Gemini AI hoặc rule-based metrics

4. **Word Count Check**
   - Kiểm tra số từ có đạt yêu cầu không
   - Apply penalties nếu quá ngắn/dài

5. **Final Score Calculation**
   - Weighted average của các criteria
   - Convert sang 10-point scale và CEFR level

---

## 2. 🤖 LLM FEATURES (Gemini AI)

### Frontend Components

Tất cả các LLM features nằm trong thư mục:
**`src/app/english/writing/components/`**

#### a) Outline Generator
**File**: `src/app/english/writing/components/OutlineGenerator.tsx`
- **API**: `/api/writing/outline`
- **Function**: `generateOutline()` (dòng 31-70)
- **Chức năng**: Tạo outline cho bài viết

#### b) Brainstorm Ideas
**File**: `src/app/english/writing/components/BrainstormPanel.tsx`
- **API**: `/api/writing/brainstorm`
- **Function**: `brainstorm()` (dòng 37-80)
- **Chức năng**: Tạo ý tưởng cho bài viết

#### c) Generate Thesis
**File**: `src/app/english/writing/components/ThesisGenerator.tsx`
- **API**: `/api/writing/thesis`
- **Function**: `generateThesis()` 
- **Chức năng**: Tạo thesis statement

#### d) Language Pack
**File**: `src/app/english/writing/components/LanguagePackPanel.tsx`
- **API**: `/api/writing/language-pack`
- **Chức năng**: Cung cấp từ vựng và cấu trúc theo level

#### e) Rephrase
**File**: `src/app/english/writing/components/RephraseMenu.tsx`
- **API**: `/api/writing/rephrase`
- **Function**: `rephrase()` (dòng 30-80)
- **Chức năng**: Viết lại câu với nhiều style khác nhau

#### f) Expand Sentence
**File**: `src/app/english/writing/components/SentenceExpander.tsx`
- **API**: `/api/writing/expand`
- **Chức năng**: Mở rộng câu ngắn thành câu dài hơn

---

### Backend API Routes (Next.js)

Tất cả LLM API routes nằm trong:
**`src/app/api/writing/`**

#### Outline API
**File**: `src/app/api/writing/outline/route.ts`
```typescript
export async function POST(req: NextRequest) {
  // Call Gemini API to generate outline
  const response = await callGemini(prompt);
  return NextResponse.json(response);
}
```

#### Brainstorm API
**File**: `src/app/api/writing/brainstorm/route.ts`
- Gọi Gemini để brainstorm ideas

#### Rephrase API
**File**: `src/app/api/writing/rephrase/route.ts`
- Gọi Gemini để rephrase text

#### Thesis API
**File**: `src/app/api/writing/thesis/route.ts`
- Gọi Gemini để generate thesis

#### Language Pack API
**File**: `src/app/api/writing/language-pack/route.ts`
- Trả về vocabulary và structures theo level

#### Expand API
**File**: `src/app/api/writing/expand/route.ts`
- Gọi Gemini để expand sentences

---

### Gemini Integration

**File**: `src/lib/gemini.ts`

**Function**: `callGemini()` - Wrapper để gọi Gemini API

```typescript
export async function callGemini(
  prompt: string,
  options?: {
    maxTokens?: number;
    temperature?: number;
  }
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          maxOutputTokens: options?.maxTokens || 2048,
          temperature: options?.temperature || 0.7,
        },
      }),
    }
  );
  
  return extractTextFromResponse(response);
}
```

**Prompts**: `src/lib/prompts/writing.ts`
- `buildOutlinePrompt()` - Prompt cho outline
- `buildBrainstormPrompt()` - Prompt cho brainstorm
- `buildRephrasePrompt()` - Prompt cho rephrase
- `buildThesisPrompt()` - Prompt cho thesis
- `buildNextTaskPrompt()` - Prompt cho next task recommendation

---

## 3. 🧠 MODEL CHẤM ĐIỂM

### Model Files Location

#### a) Question-Aware BERT (Active)
**Location**: `ai-models/writing-scorer/bert_question_model/`
- **Files**: `model.keras`, `metadata.pkl`
- **Usage**: Đây là model duy nhất được deploy trong service hiện tại.
- **Notes**: Metadata lưu flag `use_question` để model biết có dùng prompt hay không.

#### b) Legacy Models (Archived)
- Đã di chuyển sang `ai-models/backup/` (ví dụ: `legacy-models/IELTS_Model/`, `bert_ielts_model/`, ...).
- Không còn nằm trong thư mục chính để tránh lộn xộn, nhưng vẫn có thể khôi phục khi cần.

#### c) Model Loader
**File**: `python-services/model_loader.py`
- **Function**: `load_all_models()` - Load tất cả models khi start service
- **Priority**: BERT PRO > BERT Multi > BERT > Traditional

---

### Model Architecture

#### Traditional Model
**File**: `ai-models/writing-scorer/ml_assess.py`

**Class**: `QuestionAssessor` (BERT + BiLSTM + Attention)

```python
class QuestionAssessor:
    """
    BERT-based model with BiLSTM and Attention layers
    Designed for IELTS assessment with optional question awareness
    """
    def __init__(self):
        # BERT encoder
        # BiLSTM layer
        # Attention mechanism
        # Output layers for 4 criteria
```

**Scoring Criteria**:
1. Task Response
2. Coherence & Cohesion
3. Lexical Resource
4. Grammatical Range

---

### Model Loading Process

**File**: `python-services/writing_scorer.py` (dòng 88-127)

```python
# Try to load all models using model_loader
if MODEL_LOADER_AVAILABLE:
    models_base_dir = PROJECT_ROOT / 'ai-models' / 'writing-scorer'
    all_models, model_loader = load_all_models(models_base_dir)
    
    # Select best available model
    if all_models.get('bert_pro', {}).get('loaded'):
        active_model = all_models['bert_pro']
        active_model_type = 'bert_pro'
    elif all_models.get('bert_multi', {}).get('loaded'):
        active_model = all_models['bert_multi']
        active_model_type = 'bert_multi'
    # ... fallback to traditional
```

**Khi service start**:
1. Load tất cả models từ `ai-models/writing-scorer/`
2. Chọn model tốt nhất có sẵn
3. Cache models trong memory để sử dụng nhanh

---

## 4. 📊 FLOW DIAGRAM

### Complete Flow: Submit → Score

```
┌─────────────────────────────────────────────────────────────┐
│ 1. USER CLICKS "SUBMIT FOR GRADING"                         │
│    File: src/app/english/writing/page.tsx                    │
│    Function: handleSubmit()                                   │
└───────────────────────┬─────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. FRONTEND SENDS REQUEST                                    │
│    POST http://localhost:5001/score-v2                      │
│    Body: { text, prompt, level, task_type }                 │
└───────────────────────┬─────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. PYTHON FLASK SERVICE RECEIVES                            │
│    File: python-services/writing_scorer.py                  │
│    Endpoint: /score-v2                                      │
└───────────────────────┬─────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. INTELLIGENT SCORER PROCESSES                            │
│    File: python-services/intelligent_scorer.py              │
│    Function: score_essay_intelligent()                      │
│                                                              │
│    Step 1: Prompt Analysis                                 │
│    ├─ File: prompt_analyzer.py                              │
│    └─ Uses: Gemini AI or rule-based                        │
│                                                              │
│    Step 2: Content Validation                               │
│    ├─ File: content_validator.py                           │
│    └─ Uses: Gemini AI for semantic check                   │
│                                                              │
│    Step 3: Quality Assessment                               │
│    ├─ File: quality_assessor.py                            │
│    └─ Uses: Gemini AI + rule-based metrics                │
│                                                              │
│    Step 4: Word Count Check                                 │
│    └─ Rule-based calculation                               │
│                                                              │
│    Step 5: Final Score                                      │
│    └─ Weighted average                                     │
└───────────────────────┬─────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. RETURN RESULT TO FRONTEND                                │
│    JSON: {                                                   │
│      overall_score: 7.5,                                     │
│      cefr_level: "B2",                                       │
│      detailed_scores: {...},                                │
│      word_count: 145,                                        │
│      ...                                                     │
│    }                                                         │
└───────────────────────┬─────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ 6. FRONTEND DISPLAYS RESULTS                                 │
│    File: src/app/english/writing/page.tsx                   │
│    - Overall score                                          │
│    - Detailed scores (Task Response, Vocabulary, etc.)      │
│    - Statistics (words, sentences, paragraphs)              │
│    - Feedback for each criterion                            │
└─────────────────────────────────────────────────────────────┘
```

---

### LLM Feature Flow

```
┌─────────────────────────────────────────────────────────────┐
│ USER CLICKS LLM FEATURE BUTTON                              │
│ (e.g., "Generate Outline")                                  │
│ File: src/app/english/writing/components/OutlineGenerator.tsx│
└───────────────────────┬─────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ FRONTEND CALLS API                                           │
│ POST /api/writing/outline                                    │
│ Body: { level, type, topic }                                 │
└───────────────────────┬─────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ NEXT.JS API ROUTE                                            │
│ File: src/app/api/writing/outline/route.ts                  │
│ - Build prompt using buildOutlinePrompt()                    │
│ - Call Gemini API via callGemini()                          │
└───────────────────────┬─────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ GEMINI API CALL                                              │
│ File: src/lib/gemini.ts                                      │
│ Function: callGemini()                                       │
│ - Sends request to Google Gemini API                         │
│ - Returns generated text                                    │
└───────────────────────┬─────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ RETURN RESULT TO FRONTEND                                    │
│ JSON: { outline: "...", sections: [...] }                   │
└───────────────────────┬─────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ FRONTEND DISPLAYS RESULT                                     │
│ - Shows outline in modal                                    │
│ - User can insert into textarea                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. 📁 FILE STRUCTURE SUMMARY

```
English101/
├── src/
│   ├── app/
│   │   ├── english/
│   │   │   └── writing/
│   │   │       ├── page.tsx                    ← Nút Submit (handleSubmit)
│   │   │       └── components/
│   │   │           ├── OutlineGenerator.tsx    ← LLM: Outline
│   │   │           ├── BrainstormPanel.tsx      ← LLM: Brainstorm
│   │   │           ├── ThesisGenerator.tsx      ← LLM: Thesis
│   │   │           ├── RephraseMenu.tsx         ← LLM: Rephrase
│   │   │           ├── SentenceExpander.tsx     ← LLM: Expand
│   │   │           └── LanguagePackPanel.tsx    ← LLM: Language Pack
│   │   └── api/
│   │       └── writing/
│   │           ├── outline/route.ts            ← API: Outline
│   │           ├── brainstorm/route.ts         ← API: Brainstorm
│   │           ├── rephrase/route.ts           ← API: Rephrase
│   │           └── ...
│   └── lib/
│       ├── gemini.ts                           ← Gemini API wrapper
│       └── prompts/
│           └── writing.ts                     ← Prompts cho LLM
│
├── python-services/
│   ├── writing_scorer.py                       ← Flask service, endpoint /score-v2
│   ├── intelligent_scorer.py                  ← Core scoring logic
│   ├── prompt_analyzer.py                     ← Prompt analysis
│   ├── content_validator.py                    ← Content validation
│   ├── quality_assessor.py                     ← Quality assessment
│   └── model_loader.py                         ← Model loading
│
└── ai-models/
    └── writing-scorer/
        ├── ml_assess.py                        ← QuestionAssessor definition
        └── bert_question_model/                ← Model weights + metadata
```

---

## 6. 🔑 KEY FUNCTIONS & ENDPOINTS

### Scoring Endpoints

| Endpoint | File | Description |
|----------|------|-------------|
| `/score-v2` | `writing_scorer.py:3001` | **NEW** Intelligent scoring system |
| `/score-ai` | `writing_scorer.py:2402` | Old AI scoring (BERT models) |
| `/score` | `writing_scorer.py:2402` | Traditional scoring (fallback) |

### LLM API Endpoints

| Endpoint | File | Component |
|----------|------|-----------|
| `/api/writing/outline` | `src/app/api/writing/outline/route.ts` | OutlineGenerator |
| `/api/writing/brainstorm` | `src/app/api/writing/brainstorm/route.ts` | BrainstormPanel |
| `/api/writing/thesis` | `src/app/api/writing/thesis/route.ts` | ThesisGenerator |
| `/api/writing/rephrase` | `src/app/api/writing/rephrase/route.ts` | RephraseMenu |
| `/api/writing/expand` | `src/app/api/writing/expand/route.ts` | SentenceExpander |
| `/api/writing/language-pack` | `src/app/api/writing/language-pack/route.ts` | LanguagePackPanel |

### Core Functions

| Function | File | Purpose |
|----------|------|---------|
| `handleSubmit()` | `page.tsx:174` | Frontend submit handler |
| `score_writing_v2()` | `writing_scorer.py:3001` | Backend scoring endpoint |
| `score_essay_intelligent()` | `intelligent_scorer.py:150` | Main scoring logic |
| `callGemini()` | `gemini.ts` | Gemini API wrapper |
| `load_all_models()` | `model_loader.py` | Load ML models |

---

## 7. 🚀 HOW TO DEBUG

### Debug Scoring Flow

1. **Check Frontend**:
   ```typescript
   // Add console.log in handleSubmit()
   console.log("Submitting:", { text, prompt, level });
   ```

2. **Check Python Service**:
   ```python
   # In writing_scorer.py
   print(f"[Score V2] Received: {data}")
   print(f"[Score V2] Result: {result}")
   ```

3. **Check Intelligent Scorer**:
   ```python
   # In intelligent_scorer.py
   print(f"[Intelligent Scorer] Step 1: Analyzing prompt...")
   print(f"[Intelligent Scorer] Step 2: Validating content...")
   ```

### Debug LLM Features

1. **Check API Route**:
   ```typescript
   // In route.ts
   console.log("Request:", { level, type, topic });
   ```

2. **Check Gemini Call**:
   ```typescript
   // In gemini.ts
   console.log("Gemini prompt:", prompt);
   console.log("Gemini response:", response);
   ```

---

## 📝 TÓM TẮT

1. **Nút Submit**: `src/app/english/writing/page.tsx` → `handleSubmit()`
2. **Chấm điểm**: `python-services/writing_scorer.py` → `/score-v2` → `intelligent_scorer.py`
3. **LLM Features**: `src/app/english/writing/components/*.tsx` → `src/app/api/writing/*/route.ts` → `src/lib/gemini.ts`
4. **Model**: `ai-models/writing-scorer/model.keras` + `ml_assess.py` (architecture)

---

**Lưu ý**: Hệ thống mới (`/score-v2`) không sử dụng model Keras trực tiếp, mà sử dụng Gemini AI để phân tích và đánh giá. Model Keras chỉ được dùng trong hệ thống cũ (`/score-ai` hoặc `/score`).

