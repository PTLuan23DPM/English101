# QUY TRÌNH CHẤM BÀI VIẾT - CHI TIẾT

## Tổng quan

Khi user nhấn **Submit Task**, hệ thống sẽ xử lý bài viết qua nhiều bước để đưa ra điểm số và feedback chi tiết.

## QUY TRÌNH CHI TIẾT

### 1. NHẬN INPUT
- **Input**: 
  - `text`: Nội dung bài viết
  - `prompt`: Đề bài/câu hỏi
  - `level`: CEFR level (A1-C2)
  - `task_type`: Loại task (optional)

### 2. PHÂN TÍCH PROMPT (Prompt Analysis)
**Module**: `prompt_analyzer.py`

**Chức năng**:
- Phân tích đề bài để hiểu yêu cầu
- Xác định:
  - Task type (narrative, argumentative, descriptive, etc.)
  - Main topic
  - Required elements (what, where, when, why, who)
  - Word count requirements (minimum, target, maximum)
  - Content requirements

**Output**:
```python
{
    "task_type": "argumentative",
    "main_topic": "technology",
    "required_elements": {...},
    "word_count": {"minimum": 150, "target": 250, "maximum": 300},
    "content_requirements": [...]
}
```

### 3. BERT SEMANTIC SIMILARITY (Cross-validation)
**Module**: `hybrid_intelligent_scorer.py` → `calculate_semantic_similarity_bert()`

**Quy trình**:
1. **Vector hóa Essay**:
   - Sử dụng BERT encoder (sentence-transformers)
   - Input: Essay text (string)
   - Output: Embedding vector (shape: `(384,)` hoặc `(768,)` tùy encoder)
   - **Ví dụ**: Essay "Technology is important" → Vector `[0.123, -0.456, 0.789, ...]` (384 hoặc 768 số)

2. **Vector hóa Prompt**:
   - Tương tự, prompt được vector hóa thành embedding

3. **Tính Cosine Similarity**:
   - Công thức: `similarity = dot_product(essay_embedding, prompt_embedding) / (norm(essay) * norm(prompt))`
   - Range: -1 đến 1
   - Normalize về 0-1: `(similarity + 1) / 2`

**Log output**:
```
[HYBRID_SCORER] ========== BERT SEMANTIC SIMILARITY ==========
[HYBRID_SCORER] Essay embedding shape: (384,)
[HYBRID_SCORER] Essay embedding range: min=-0.1234, max=0.5678, mean=0.0123
[HYBRID_SCORER] Prompt embedding shape: (384,)
[HYBRID_SCORER] Cosine similarity: 0.7234
[HYBRID_SCORER] Normalized similarity (0-1): 0.8617
```

### 4. VALIDATE CONTENT (Gemini AI)
**Module**: `content_validator.py`

**Chức năng**:
- Sử dụng Gemini AI để kiểm tra:
  - Topic relevance (0-100): Bài viết có liên quan đến đề bài không?
  - Required elements (0-100): Có đủ các yếu tố yêu cầu không?
  - Content quality (0-100): Chất lượng nội dung
  - Semantic match (0-100): Hiểu synonyms và related concepts

**Output**:
```python
{
    "is_on_topic": True,
    "overall_relevance": 85,
    "required_elements_score": 80,
    "content_quality_score": 75,
    "semantic_match_score": 90,
    "confidence": 0.85
}
```

### 5. OFF-TOPIC DETECTION (Improved)
**Module**: `hybrid_intelligent_scorer.py` → `improved_off_topic_detection()`

**Quy trình**:
1. **Kết hợp Gemini + BERT**:
   - Gemini relevance: 85/100
   - BERT similarity: 0.72 → BERT relevance: 72/100
   - **Weighted average**: `85 * 0.7 + 72 * 0.3 = 81.1/100`

2. **Cross-validation**:
   - Nếu cả 2 model đều thấy off-topic → Chắc chắn off-topic
   - Nếu 1 trong 2 OK → Có thể chỉ thiếu phần

3. **Phân loại**:
   - `complete` (relevance < 30): Lạc đề hoàn toàn → 0 điểm
   - `partial` (30-50): Lạc đề một phần → Trừ điểm nặng
   - `incomplete` (50-70): Thiếu một số phần → Trừ điểm nhẹ
   - `none` (>= 70): On-topic → Không trừ điểm

**Log output**:
```
[HYBRID_SCORER] ========== OFF-TOPIC DETECTION ==========
[HYBRID_SCORER] Gemini relevance: 85/100
[HYBRID_SCORER] BERT relevance: 72/100
[HYBRID_SCORER] Combined relevance: 81.1/100
[HYBRID_SCORER] Classification: ON-TOPIC
```

### 6. WORD COUNT VALIDATION
**Module**: `hybrid_intelligent_scorer.py` → `calculate_word_count_score()`

**Quy trình**:
- Đếm số từ trong bài viết
- So sánh với yêu cầu:
  - Too short (< minimum): Score = `(word_count / minimum) * 70`, Penalty = 0.7
  - Too long (> maximum): Score = 85, Penalty = 0.95
  - Good (minimum-target): Score = `70 + ratio * 20`, Penalty = 1.0
  - Excellent (target-maximum): Score = `90 + bonus`, Penalty = 1.0

**Log output**:
```
[HYBRID_SCORER] ========== WORD COUNT VALIDATION ==========
[HYBRID_SCORER] Actual: 245 words
[HYBRID_SCORER] Target: 250 words
[HYBRID_SCORER] Status: EXCELLENT
[HYBRID_SCORER] Score: 95/100
```

### 7. QUALITY ASSESSMENT (Gemini AI)
**Module**: `quality_assessor.py`

**Chức năng**:
- Đánh giá chất lượng viết theo IELTS 4 criteria:
  1. **Vocabulary**:
     - Range (độ đa dạng từ vựng)
     - Accuracy (dùng từ đúng)
     - Collocations (cụm từ tự nhiên)
     - Sophistication (từ vựng nâng cao)
  
  2. **Grammar**:
     - Range (độ đa dạng cấu trúc câu)
     - Accuracy (đúng ngữ pháp)
     - Sentence variety (câu đơn, ghép, phức)
  
  3. **Coherence**:
     - Logical flow
     - Paragraph structure
     - Transitions
  
  4. **Mechanics**:
     - Punctuation
     - Spelling

**Output**:
```python
{
    "vocabulary": {
        "score": 75,
        "metrics": {
            "lexical_diversity": 0.68,
            "sophisticated_ratio": 0.18,
            "avg_word_length": 5.2
        },
        "feedback": {...}
    },
    "grammar": {...},
    "coherence": {...}
}
```

### 8. IELTS 4 CRITERIA SCORING

#### 8.1. Task Response (35% weight)
**Module**: `hybrid_intelligent_scorer.py` → `calculate_task_response_score_ielts()`

**Tính điểm**:
- Base score: Content validation relevance
- Apply word count penalty
- Consider off-topic level
- Final: 0-100

#### 8.2. Lexical Resource (25% weight)
**Module**: `hybrid_intelligent_scorer.py` → `calculate_lexical_resource_score_ielts()`

**Tính điểm**:
- Range score (0-40): Từ lexical diversity
- Sophistication score (0-30): Từ sophisticated words ratio
- Accuracy score (0-30): Từ Gemini assessment
- Final: `range + sophistication + accuracy` (0-100)

#### 8.3. Grammar (25% weight)
**Module**: `hybrid_intelligent_scorer.py` → `calculate_grammar_score_ielts()`

**Tính điểm**:
- Range score (0-50): Từ sentence variety
- Accuracy score (0-50): Từ Gemini assessment
- Final: `range + accuracy` (0-100)

#### 8.4. Coherence & Cohesion (15% weight)
**Module**: `hybrid_intelligent_scorer.py` → `calculate_coherence_score_ielts()`

**Tính điểm**:
- Từ quality assessment coherence metrics
- Final: 0-100

**Log output**:
```
[HYBRID_SCORER] ========== IELTS 4 CRITERIA SCORING ==========
[HYBRID_SCORER] Task Response: 85/100 (weight: 35%)
[HYBRID_SCORER] Lexical Resource: 78/100 (weight: 25%)
[HYBRID_SCORER] Grammar: 72/100 (weight: 25%)
[HYBRID_SCORER] Coherence: 80/100 (weight: 15%)
```

### 9. FINAL SCORE CALCULATION
**Module**: `hybrid_intelligent_scorer.py` → `calculate_final_score_ielts()`

**Công thức**:
```
Overall Score (100) = 
    Task Response * 0.35 +
    Lexical Resource * 0.25 +
    Grammar * 0.25 +
    Coherence * 0.15

Overall Score (10) = Overall Score (100) / 10
```

**CEFR Level mapping**:
- 9.0-10.0 → C2 (Excellent)
- 8.0-8.9 → C1 (Very Good)
- 7.0-7.9 → B2 (Good)
- 6.0-6.9 → B1 (Satisfactory)
- 5.0-5.9 → A2 (Fair)
- 3.0-4.9 → A1 (Basic)
- < 3.0 → Pre-A1 (Very Limited)

**Log output**:
```
[HYBRID_SCORER] ========== FINAL SCORE CALCULATION ==========
[HYBRID_SCORER] Final overall score: 7.8/10
[HYBRID_SCORER] Final score (100 scale): 78.5/100
[HYBRID_SCORER] CEFR Level: B2
[HYBRID_SCORER] Band: Good
```

### 10. BERT MODEL PREDICTION (Nếu sử dụng ml_assess.py)

**Quy trình** (nếu model BERT Question-Aware được load):

1. **Tokenization**:
   - Input: Essay text
   - Sử dụng BERT tokenizer (`bert-base-uncased`)
   - Output: Token IDs (shape: `(512,)`), Attention mask

2. **BERT Embedding Extraction**:
   - Input: Token IDs + Attention mask
   - Chạy qua BERT model
   - Output: Token embeddings (shape: `(sequence_length, 768)`)
     - Mỗi token → 768-dimensional vector
     - Ví dụ: "Technology" → `[0.123, -0.456, ..., 0.789]` (768 số)

3. **Question-Aware Features** (nếu có question):
   - Extract essay embeddings: `(seq_len, 768)`
   - Extract question embeddings: `(q_len, 768)`
   - Mean pool question: `(768,)`
   - Expand question to match essay length: `(seq_len, 768)`
   - Concatenate: `(seq_len, 1536)` = Essay (768) + Question (768)

4. **Padding/Truncation**:
   - Pad hoặc truncate để match model input shape
   - Final shape: `(batch=1, sequence_length, feature_dim)`

5. **Model Prediction**:
   - Input: Features `(1, seq_len, 768 hoặc 1536)`
   - Chạy qua BiLSTM + Attention + Dense layers
   - Output: Scaled score (0-1)
   - Unscale: `score = prediction * 9.0`

6. **Post-processing**:
   - Round to nearest 0.5
   - Apply word count penalty
   - Final: 0.0-9.0

**Log output**:
```
[ML_ASSESS] ========== BERT FEATURE EXTRACTION ==========
[ML_ASSESS] Tokenization:
  - Actual tokens: 245
  - Token IDs shape: (1, 512)
[ML_ASSESS] Embedding extraction:
  - Embedding shape: (245, 768)
  - Embedding range: min=-2.1234, max=2.5678, mean=0.0123
[ML_ASSESS] ========== PREDICTION PROCESS ==========
[ML_ASSESS] Model input shape: (1, 245, 768)
[ML_ASSESS] Raw prediction (scaled 0-1): 0.723456
[ML_ASSESS] Unscaled score (0-9): 6.5111
[ML_ASSESS] Rounded score: 6.5
[ML_ASSESS] Final score: 6.5/9.0
```

## TÓM TẮT CÁC CHỈ SỐ ĐƯỢC LOG

### Vector Embeddings:
- **BERT embeddings**: Shape, range (min/max/mean), std, sample values
- **Sentence transformer embeddings**: Shape, range, norm
- **Token embeddings**: Sequence length, feature dimension

### Scores:
- **Task Response**: 0-100
- **Lexical Resource**: 0-100 (range + sophistication + accuracy)
- **Grammar**: 0-100 (range + accuracy)
- **Coherence**: 0-100
- **Overall Score**: 0-10 và 0-100
- **CEFR Level**: A1-C2

### Metrics:
- **Word count**: Actual, target, ratio
- **Lexical diversity**: 0-1
- **Sophisticated words ratio**: 0-1
- **Sentence variety**: 0-1
- **Semantic similarity**: 0-1
- **Relevance scores**: 0-100

### Classifications:
- **Off-topic level**: none, incomplete, partial, complete
- **Band description**: Expert User, Very Good User, etc.

## XEM LOG

Tất cả các log được in ra console khi chạy service. Để xem:
1. Chạy service: `python writing_scorer.py`
2. Submit một bài viết
3. Xem log trong terminal/console

Log format:
- `[ML_ASSESS]`: Từ BERT model (ml_assess.py)
- `[HYBRID_SCORER]`: Từ hybrid scoring system
- `[Content Validator]`: Từ content validation
- `[Quality Assessor]`: Từ quality assessment

