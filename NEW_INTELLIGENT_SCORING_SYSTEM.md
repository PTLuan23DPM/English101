# Intelligent Scoring System v2

## Overview

Hệ thống chấm điểm mới **prompt-aware** và có khả năng mở rộng (scalable) cho bất kỳ đề writing nào mà không cần train lại model.

## Vấn đề của hệ thống cũ

1. **Phát hiện lạc đề không chính xác**: Bài lạc đề vẫn cho điểm cao
2. **Không hiểu yêu cầu đề bài**: Chỉ dựa vào keyword matching đơn giản
3. **Điểm không công bằng**: Viết đúng nội dung, đủ số chữ nhưng điểm vẫn thấp
4. **Không scalable**: Thêm đề mới cần retrain model hoặc update rules

## Giải pháp: Intelligent Scoring System

### Architecture (5 bước)

```
┌─────────────────────────────────────────────────────────────┐
│  1. PROMPT ANALYSIS                                          │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ • Task type (essay, email, sentence)                  │   │
│  │ • Main topic extraction                               │   │
│  │ • Required elements (what, where, when, why, who)     │   │
│  │ • Word count requirements                             │   │
│  │ • Grammatical focus                                   │   │
│  │ • Scoring emphasis weights                            │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│  2. CONTENT VALIDATION                                       │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ • Topic relevance (semantic understanding)            │   │
│  │ • Required elements check                             │   │
│  │ • Content quality assessment                          │   │
│  │ • Off-topic detection (with confidence)               │   │
│  │ → IF OFF-TOPIC: Return 0 immediately                  │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│  3. QUALITY ASSESSMENT                                       │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ • Vocabulary diversity & sophistication               │   │
│  │ • Grammar accuracy & sentence variety                 │   │
│  │ • Coherence & organization                            │   │
│  │ • Mechanics (spelling, punctuation)                   │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│  4. WORD COUNT CHECK                                         │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ • Compare actual vs target word count                 │   │
│  │ • Apply penalties if too short/long                   │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│  5. FINAL SCORE CALCULATION                                  │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Weighted average based on scoring emphasis:           │   │
│  │ • Task Response: 35%                                  │   │
│  │ • Vocabulary: 25%                                     │   │
│  │ • Grammar: 25%                                        │   │
│  │ • Coherence: 15%                                      │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Key Features

#### 1. Prompt Analysis (prompt_analyzer.py)
- **Uses Gemini LLM** để hiểu semantic của đề bài
- Trích xuất:
  - Task type (narrative, argumentative, descriptive, email, sentence)
  - Main topic và keywords
  - Required elements (what, where, when, why, who)
  - Target word count dựa vào task type và level
  - Grammatical focus
  - Scoring weights tùy theo task type
- **Fallback**: Rule-based analysis nếu Gemini không khả dụng

#### 2. Content Validation (content_validator.py)
- **Semantic understanding**: Hiểu rằng "vacation" = "trip" = "travel"
- **Strict off-topic detection**: 
  - Kiểm tra topic relevance (0-100%)
  - Kiểm tra required elements
  - Nếu relevance < 50% → Return 0 ngay lập tức
- **Detailed feedback**:
  - Addressed elements
  - Missing elements
  - Suggestions để improve

#### 3. Quality Assessment (quality_assessor.py)
- **Vocabulary metrics**:
  - Lexical diversity (unique words / total words)
  - Average word length
  - Sophisticated words ratio
  - Level-appropriate thresholds
- **Grammar metrics**:
  - Sentence length variety
  - Sentence complexity
  - Punctuation usage
- **Coherence metrics**:
  - Paragraph structure
  - Linking words count
  - Introduction/conclusion presence
- **Gemini enhancement**: Detailed error detection và suggestions

#### 4. Intelligent Scoring (intelligent_scorer.py)
- **Prompt-aware**: Chấm điểm dựa trên yêu cầu CỤ THỂ của đề
- **Fair scoring**: 
  - Word count penalties/bonuses
  - Level-appropriate expectations
  - Task-type specific criteria
- **Transparent**: Detailed breakdown của mỗi component score

## Usage

### Backend API

```bash
POST http://localhost:5001/score-v2
Content-Type: application/json

{
  "text": "Student's essay here...",
  "prompt": "Write about your daily routine. Use simple present tense and time expressions.",
  "level": "A2",
  "task_type": "descriptive"  // Optional
}
```

### Response Format

```json
{
  "overall_score": 7.5,
  "cefr_level": "B2",
  "band": "Good",
  "detailed_scores": {
    "task_response": {
      "score": 7.8,
      "feedback": [
        "✓ Topic Relevance: 85%",
        "✓ Required Elements: 4/5",
        "✓ Word Count: Good length: 145 words",
        "⚠️ Missing location information",
        "💡 Add more details about where this happened"
      ]
    },
    "vocabulary": {
      "score": 7.2,
      "feedback": [
        "Lexical diversity: 65%",
        "Unique words: 95/145",
        "💡 Use synonyms: 'extremely', 'particularly'"
      ]
    },
    "grammar": {
      "score": 7.0,
      "feedback": [
        "Avg sentence length: 12.3 words",
        "⚠️ Subject-verb agreement: 'people likes'",
        "💡 Review subject-verb agreement"
      ]
    },
    "coherence": {
      "score": 8.0,
      "feedback": [
        "Paragraphs: 3",
        "Linking words: 5",
        "💡 Add topic sentences to paragraphs"
      ]
    }
  },
  "word_count": 145,
  "target_word_count": {
    "minimum": 50,
    "maximum": 150,
    "target": 100
  },
  "prompt_analysis": {
    "task_type": "descriptive",
    "main_topic": "daily routine",
    "source": "gemini"
  },
  "content_validation": {
    "on_topic": true,
    "relevance": 85,
    "addressed_elements": ["what", "when", "why"],
    "missing_elements": ["where"]
  },
  "is_off_topic": false,
  "scoring_method": "intelligent_v2"
}
```

### Off-topic Response

```json
{
  "overall_score": 0.0,
  "cefr_level": "N/A",
  "band": "Off-topic",
  "detailed_scores": {
    "task_response": {
      "score": 0.0,
      "feedback": [
        "⚠️ Essay discusses work/office but prompt asks about vacation/travel"
      ]
    },
    "vocabulary": {
      "score": 0.0,
      "feedback": ["Response is off-topic"]
    },
    "grammar": {
      "score": 0.0,
      "feedback": ["Response is off-topic"]
    },
    "coherence": {
      "score": 0.0,
      "feedback": ["Response is off-topic"]
    }
  },
  "is_off_topic": true,
  "off_topic_reason": "Essay discusses completely different topic",
  "confidence": 0.95
}
```

## Advantages

### 1. Scalability ✅
- **Không cần train lại model** cho đề mới
- **Không cần update rules** cho từng đề cụ thể
- Chỉ cần prompt text → Gemini phân tích tự động

### 2. Accuracy ✅
- **Semantic understanding**: Hiểu synonyms và related concepts
- **Strict off-topic detection**: Không cho điểm cao với bài lạc đề
- **Fair scoring**: Điểm phản ánh đúng chất lượng

### 3. Transparency ✅
- **Detailed breakdown**: Giải thích rõ ràng từng component score
- **Actionable feedback**: Suggestions cụ thể để improve
- **Metrics visibility**: Show metrics như lexical diversity, sentence variety

### 4. Flexibility ✅
- **Level-appropriate**: Expectations adjust theo A1-C2
- **Task-type aware**: Different criteria cho essay vs email vs sentence
- **Customizable weights**: Scoring emphasis có thể adjust

## Testing

### Test Case 1: On-topic Essay

**Prompt**: "Write about your daily routine. Use simple present tense and time expressions."

**Essay**: "Every morning, I wake up at 6:00 AM. First, I brush my teeth and wash my face..."

**Expected**: 
- ✅ On-topic (daily routine activities)
- ✅ Uses simple present tense
- ✅ Includes time expressions
- Score: 7-8/10 (B1-B2)

### Test Case 2: Off-topic Essay

**Prompt**: "Write about your daily routine"

**Essay**: "Last summer, I went to Da Nang with my family. We visited many beautiful places..."

**Expected**:
- ❌ Off-topic (vacation trip, not daily routine)
- Past tense instead of present
- Score: 0/10

### Test Case 3: Partial Relevance

**Prompt**: "Describe your favorite vacation destination. Include where, when, what you did, and why it was special."

**Essay**: "I like traveling. Traveling is good for health and relaxation..." (không mention specific destination)

**Expected**:
- ⚠️ Weak topic relevance (talks about traveling generally, not specific destination)
- Missing required elements (where, when, what, why)
- Score: 3-4/10 (penalty applied)

## Frontend Integration

Update `src/app/english/writing/page.tsx`:

```typescript
// Option to choose scoring system
const [useScoringV2, setUseScoringV2] = useState(true);

// Update handleGradeSubmit
const endpoint = useScoringV2 ? 'score-v2' : 'score-ai';

const response = await fetch(`${baseUrl}/${endpoint}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    text: userText,
    prompt: selectedTask.prompt,
    level: selectedTask.level,
    task: {
      type: selectedTask.type,
      level: selectedTask.level,
      prompt: selectedTask.prompt,
    }
  })
});
```

## Migration Plan

### Phase 1: Soft Launch (Current)
- ✅ Tạo endpoint `/score-v2`
- ✅ Keep `/score` và `/score-ai` endpoint cũ
- Frontend có option toggle giữa old/new system

### Phase 2: Testing & Refinement
- Test với nhiều prompts khác nhau
- Thu thập feedback từ users
- Fine-tune thresholds và weights

### Phase 3: Full Rollout
- Make `/score-v2` thành default
- Deprecate `/score` và `/score-ai` sau 1-2 tháng

## Requirements

### Python Dependencies
- `requests` (Gemini API calls)
- Existing dependencies (flask, numpy, etc.)

### Environment
- `GEMINI_API_KEY` in `.env` (required for best results)
- Fallback to rule-based if Gemini unavailable

## Files Created

1. `python-services/prompt_analyzer.py` - Prompt analysis module
2. `python-services/content_validator.py` - Content validation module
3. `python-services/quality_assessor.py` - Quality assessment module
4. `python-services/intelligent_scorer.py` - Main scoring engine
5. `python-services/writing_scorer.py` - Updated with `/score-v2` endpoint

## Next Steps

1. ✅ Backend implementation complete
2. ⏳ Frontend integration (add toggle for v2)
3. ⏳ Testing with real prompts
4. ⏳ Collect user feedback
5. ⏳ Adjust thresholds based on feedback
6. ⏳ Full rollout

---

**Tóm lại**: Hệ thống mới này giải quyết tất cả các vấn đề:
- ✅ Phát hiện lạc đề chính xác
- ✅ Hiểu yêu cầu đề bài semantically
- ✅ Chấm điểm công bằng dựa trên nội dung và chất lượng
- ✅ Scalable cho bất kỳ đề mới nào mà không cần retrain

