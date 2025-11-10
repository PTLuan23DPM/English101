# Giải Thích Chi Tiết Hệ Thống Chấm Điểm Writing

## Tổng Quan

Hệ thống chấm điểm Writing sử dụng một pipeline phức tạp với nhiều bước để đánh giá bài viết của học sinh. Hệ thống được thiết kế để:
- Chấm điểm dựa trên CEFR levels (A1-C2), không chỉ IELTS
- Phát hiện và reject các bài lạc đề (off-topic)
- Phát hiện và reject các bài viết ngẫu nhiên/không phải tiếng Anh
- Điều chỉnh điểm số dựa trên task type (sentence, paragraph, essay)
- Cung cấp feedback chi tiết cho từng tiêu chí

---

## 1. Pipeline Chấm Điểm (Scoring Pipeline)

### **Bước 1: Gemini Off-topic Check (Pre-scoring Gate)**

#### **Mục đích**:
Phát hiện sớm các bài lạc đề TRƯỚC KHI chấm điểm để tiết kiệm thời gian và tài nguyên.

#### **Cách hoạt động chi tiết**:

1. **Input**: 
   - `text`: Essay text (truncated to 2000 chars nếu quá dài)
   - `prompt`: Writing prompt
   - `task_level`: CEFR level (A1-C2)

2. **Gemini API Call**:
   ```python
   api_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={gemini_api_key}"
   ```
   - Model: `gemini-1.5-flash`
   - Temperature: `0.1` (low for consistent results)
   - Max tokens: `500`
   - Response format: `JSON`

3. **Gemini Prompt**:
   - Yêu cầu Gemini kiểm tra xem essay có đúng chủ đề không
   - Có semantic understanding (hiểu synonyms: trip = vacation = travel)
   - Có examples về ON-TOPIC và OFF-TOPIC cases
   - Yêu cầu trả về JSON với `is_off_topic`, `confidence`, `reason`

4. **Decision Logic**:
   ```python
   if is_off_topic and confidence >= 0.9:
       return 0.0  # Return immediately, skip all scoring
   ```

5. **Fallback**:
   - Nếu Gemini API không available → Skip check, tiếp tục với fallback methods
   - Nếu API call fail → Skip check, tiếp tục với fallback methods

#### **Ví dụ**:
- **Prompt**: "Write about your daily routine"
- **Essay**: "Last summer, I had a memorable vacation in Da Nang..."
- **Gemini Result**: `is_off_topic = true`, `confidence = 0.95`, `reason = "Essay discusses vacation but prompt asks about daily routine"`
- **Action**: Return 0.0 immediately, không chấm tiếp

---

### **Bước 2: Validity Gate (Text Validation)**

#### **Mục đích**:
Kiểm tra text có phải tiếng Anh hợp lệ không, phát hiện random words/gibberish.

#### **Các kiểm tra chi tiết**:

##### **2.1. Length Check**:
```python
if len(text.strip()) < 10:
    return False, "Your text is too short. Please write at least 10 characters."
```

##### **2.2. Language Detection** (`check_language_confidence`):
- **Common English Words Check**:
  - Sử dụng 100 từ tiếng Anh phổ biến nhất
  - Tính tỷ lệ: `english_ratio = english_word_count / total_words`
  
- **Vowel Ratio Check**:
  - English thường có 30-40% vowels
  - Check: `0.25 <= vowel_ratio <= 0.50`
  
- **Confidence Calculation**:
  ```python
  confidence = (english_ratio * 0.6 + (1.0 if is_vowel_ratio_ok else 0.3) * 0.4)
  is_english = confidence >= 0.5
  ```

##### **2.3. Dictionary Coverage** (`calculate_dictionary_coverage`):
- **Common Words Check** (Fast):
  - Check 100+ common English words trước (không cần API)
  - Nếu word trong common words → count as valid
  
- **API Check** (Limited):
  - Chỉ check tối đa 15 words với Free Dictionary API
  - Timeout: 0.4s per word
  - Caching: Cache results để tránh repeated calls
  
- **Pattern Matching** (Fallback):
  - Nếu API unavailable, dùng pattern matching:
    - Vowel ratio: `0.25 <= vowel_ratio <= 0.50`
    - Word length: `<= 12 characters`
    - No long clusters: Không có 4+ consecutive consonants/vowels
    - Has vowels AND consonants
  
- **Coverage Thresholds**:
  ```python
  if task_level in ['A1', 'A2']:
      min_coverage = 0.60  # 60% valid words
  else:  # B1-C2
      min_coverage = 0.75  # 75% valid words
  ```

##### **2.4. Gibberish Detection** (`detect_gibberish_heuristics`):
- **Vowel Ratio**:
  - `vowel_ratio < 0.25` → Gibberish
  - `vowel_ratio > 0.60` → Gibberish
  
- **Invalid Bigrams**:
  - Check các bigrams không hợp lệ trong tiếng Anh: `xz`, `qg`, `hjg`, `jq`, `zx`, `qx`, `zj`, `qj`
  - Nếu có > 2 invalid bigrams → Gibberish
  
- **Repeated Character Runs**:
  - Check patterns như `aaaa`, `bbbb` (> 3 consecutive chars)
  - Nếu có > 1 repeated runs → Gibberish
  
- **Average Word Length**:
  - Nếu `avg_word_length < 3` → Gibberish (quá ngắn)

##### **2.5. Meaningless Text Detection** (`detect_meaningless_text`):
- **Valid Word Ratio Thresholds**:
  ```python
  if valid_word_ratio < 0.20 or number_word_ratio > 0.05:
      is_random_words = True
      penalty_multiplier = 0.0  # 0 score
  elif valid_word_ratio < 0.25:
      is_random_words = True
      penalty_multiplier = 0.0  # 0 score
  elif valid_word_ratio < 0.35:
      is_random_words = True
      penalty_multiplier = 0.0  # 0 score
  elif valid_word_ratio < 0.50:
      is_random_words = True
      penalty_multiplier = 0.0  # 0 score
  elif valid_word_ratio < 0.65:
      is_meaningless = True
      is_random_words = False
      penalty_multiplier = 0.3  # 30% of base score
  elif valid_word_ratio < 0.75:
      is_meaningless = True
      is_random_words = False
      penalty_multiplier = 0.5  # 50% of base score
  elif valid_word_ratio < 0.85:
      is_meaningless = False
      penalty_multiplier = 0.7  # 70% of base score
  else:
      penalty_multiplier = 1.0  # No penalty
  ```

- **Number Word Ratio**:
  - Nếu `number_word_ratio > 0.05` (5% words có numbers) → Random words
  - Ví dụ: "abc123 def456" → Random words

- **Unusual Ratio**:
  - Nếu `unusual_ratio > 0.6` và `valid_word_ratio < 0.60` → Gibberish

#### **Kết quả**:
- **Nếu `is_random_words = True`**: Return error, không chấm điểm
- **Nếu `is_meaningless = True`**: Apply penalty multiplier, tiếp tục chấm nhưng score sẽ thấp
- **Nếu valid**: Tiếp tục với scoring bình thường

### **Bước 3: Base Model Scoring**

#### **Mục đích**:
Lấy điểm cơ bản từ ML model (BERT-based) được train trên IELTS essays.

#### **Models được sử dụng** (theo thứ tự ưu tiên):

1. **BERT PRO** (Best):
   - Model path: `ai-models/writing-scorer/bert_pro_model.keras`
   - Accuracy: Highest
   - Supports question awareness (có thể sử dụng prompt trong scoring)

2. **BERT Multi** (Multi-task):
   - Model path: `ai-models/writing-scorer/bert_multi_model.keras`
   - Accuracy: High
   - Multi-task fine-tuned

3. **BERT** (Single task):
   - Model path: `ai-models/writing-scorer/bert_model.keras`
   - Accuracy: Good
   - Single task fine-tuned

4. **Traditional** (Fallback):
   - Model path: `ai-models/writing-scorer/model.keras`
   - Scaler: `ai-models/writing-scorer/scaler.pkl`
   - Vectorizer: `ai-models/writing-scorer/vectorizer.pkl`
   - Accuracy: Lower
   - Feature-based model (không dùng BERT)

#### **Scoring Process**:

1. **Feature Extraction**:
   - **BERT models**: Sử dụng BERT embeddings
   - **Traditional model**: Extract features manually:
     - Word count, sentence count, paragraph count
     - Average word length, sentence length
     - Lexical diversity (TTR)
     - Punctuation count
     - Capitalization patterns
     - Vocabulary features
     - Grammar features

2. **Model Prediction**:
   ```python
   ielts_score = model.predict(features)  # Output: 0-9 scale
   ```

3. **Scale Conversion**:
   ```python
   score_10 = (ielts_score / 9.0) * 10.0  # Convert to 0-10 scale
   ```

#### **Output**:
- `ielts_score`: 0-9 scale (từ model)
- `score_10`: 0-10 scale (converted)
- `model_type`: Loại model được sử dụng

### **Bước 4: CEFR Normalization**

#### **Mục đích**:
Điều chỉnh điểm số phù hợp với CEFR level. Model được train trên IELTS essays nên có bias - cần normalize để công bằng cho các level khác nhau.

#### **Cách hoạt động chi tiết**:

##### **4.1. Level Expectations**:
```python
level_expectations = {
    'A1': {'min': 5.0, 'good': 7.0, 'excellent': 8.5},  # Very lenient
    'A2': {'min': 5.5, 'good': 7.5, 'excellent': 9.0},  # Lenient
    'B1': {'min': 6.0, 'good': 7.5, 'excellent': 9.0},  # Moderate
    'B2': {'min': 6.5, 'good': 7.5, 'excellent': 9.0},  # Standard (IELTS-like)
    'C1': {'min': 7.0, 'good': 8.0, 'excellent': 9.5},  # Stricter
    'C2': {'min': 7.5, 'good': 8.5, 'excellent': 9.5},  # Very strict
}
```

##### **4.2. Normalization Rules**:

**A1-A2 (Very Lenient)**:
```python
if base_score >= expectations['good']:  # >= 7.0 (A1) or >= 7.5 (A2)
    score_10 = base_score + 0.3
elif base_score >= expectations['min']:  # >= 5.0 (A1) or >= 5.5 (A2)
    score_10 = base_score + 0.5
else:  # < min
    score_10 = base_score + 0.8
```
- **Lý do**: Model đánh giá thấp simple tasks, cần boost để công bằng
- **Ví dụ**: Base score = 6.0 (A2 level) → Normalized = 6.5

**B1 (Stricter than A2)**:
```python
if base_score >= expectations['good']:  # >= 7.5
    score_10 = base_score - 0.2  # Slight reduction
elif base_score >= expectations['min']:  # >= 6.0
    score_10 = base_score - 0.5  # Moderate reduction
else:  # < 6.0
    score_10 = base_score - 1.0  # Significant reduction
```
- **Lý do**: B1 cần chất lượng cao hơn A2, strict hơn
- **Ví dụ**: Base score = 6.5 (B1 level) → Normalized = 6.0

**B2 (Stricter than B1)**:
```python
if base_score >= expectations['good']:  # >= 7.5
    score_10 = base_score - 0.3  # Moderate reduction
elif base_score >= expectations['min']:  # >= 6.5
    score_10 = base_score - 0.8  # Significant reduction
else:  # < 6.5
    score_10 = base_score - 1.5  # Large reduction
```
- **Lý do**: B2 là standard level (IELTS-like), cần strict hơn
- **Ví dụ**: Base score = 7.0 (B2 level) → Normalized = 6.2

**C1 (Much Stricter than B2)**:
```python
if base_score >= expectations['good']:  # >= 8.0
    score_10 = base_score - 0.8  # Significant reduction
elif base_score >= expectations['min']:  # >= 7.0
    score_10 = base_score - 1.5  # Large reduction
else:  # < 7.0
    score_10 = base_score - 2.5  # Very large reduction
```
- **Lý do**: C1 cần chất lượng rất cao, strict rất nhiều
- **Ví dụ**: Base score = 7.5 (C1 level) → Normalized = 6.0

**C2 (Very Strict)**:
```python
if base_score >= expectations['good']:  # >= 8.5
    score_10 = base_score - 1.0  # Large reduction
elif base_score >= expectations['min']:  # >= 7.5
    score_10 = base_score - 2.0  # Very large reduction
else:  # < 7.5
    score_10 = base_score - 3.0  # Maximum reduction
```
- **Lý do**: C2 là level cao nhất, cần chất lượng cực kỳ cao
- **Ví dụ**: Base score = 8.0 (C2 level) → Normalized = 6.0

##### **4.3. Special Case**:
```python
if base_score >= 8.5:
    return min(10.0, base_score)  # Keep high scores high for any level
```
- **Lý do**: Nếu base score đã rất cao (>= 8.5), không cần normalize (đã excellent)

#### **Ví dụ cụ thể**:

**Example 1: A2 Simple Task**:
- Base score: 6.0
- Level: A2
- Normalization: +0.5 → 6.5
- **Kết quả**: Boost để công bằng với simple task

**Example 2: B2 Essay Task**:
- Base score: 7.0
- Level: B2
- Normalization: -0.3 → 6.7
- **Kết quả**: Giảm một chút vì B2 cần strict hơn

**Example 3: C1 Essay Task**:
- Base score: 7.5
- Level: C1
- Normalization: -1.5 → 6.0
- **Kết quả**: Giảm nhiều vì C1 cần strict rất nhiều

### **Bước 5: Task Type Boost**

#### **Mục đích**:
Boost điểm cho các task đơn giản (sentence/paragraph) vì model được train trên IELTS essays nên đánh giá thấp các task đơn giản.

#### **Boost Logic**:

##### **5.1. Task Type Detection**:
```python
is_simple_task = task_type and ('sentence' in task_type.lower() or 'paragraph' in task_type.lower())
is_lower_level = task_level.upper() in ['A1', 'A2']
```

##### **5.2. Boost Rules**:
```python
if is_simple_task and is_lower_level:
    # Simple task + Lower level (A1-A2): +2.0 points
    score_10 = min(10.0, score_10 + 2.0)
elif is_simple_task:
    # Simple task: +1.5 points
    score_10 = min(10.0, score_10 + 1.5)
elif is_lower_level:
    # Lower level: +1.0 points
    score_10 = min(10.0, score_10 + 1.0)
```

##### **5.3. Ví dụ cụ thể**:

**Example 1: A2 Sentence Task**:
- Base score (từ model): 5.8
- Task type boost: +2.0 → 7.8
- CEFR normalization: +0.5 → 8.3
- **Kết quả**: Boost đáng kể vì đây là simple task ở level thấp

**Example 2: B1 Paragraph Task**:
- Base score (từ model): 6.2
- Task type boost: +1.5 → 7.7
- CEFR normalization: -0.5 → 7.2
- **Kết quả**: Boost vừa phải vì đây là simple task nhưng level cao hơn

**Example 3: B2 Essay Task**:
- Base score (từ model): 7.0
- Task type boost: +0.0 (không boost)
- CEFR normalization: -0.3 → 6.7
- **Kết quả**: Không boost vì đây là essay task (không phải simple)

#### **Lý do cần boost**:
- Model được train trên IELTS essays (phức tạp, dài, formal)
- Simple tasks (sentence/paragraph) ngắn hơn, đơn giản hơn
- Model đánh giá thấp simple tasks → Cần boost để công bằng

---

## 2. Topic Gate (Off-topic Detection)

### **Mục đích**: 
Phát hiện và reject các bài lạc đề trước khi chấm điểm chi tiết. Đây là một gate quan trọng để đảm bảo bài viết đáp ứng yêu cầu cơ bản nhất.

### **Cách hoạt động chi tiết**:

#### **2.1. Keyword Extraction** (`extract_keywords_and_constraints`):

##### **Stop Words Removal**:
- Loại bỏ các từ không có ý nghĩa: `the`, `a`, `an`, `and`, `or`, `but`, `in`, `on`, `at`, `to`, `for`, etc.
- Loại bỏ các từ dài < 3 characters

##### **Keyword Extraction**:
```python
keywords = set([
    word for word in re.findall(r'\b\w+\b', prompt_lower)
    if len(word) > 3 and word not in stop_words
])
```

##### **Multi-word Phrases**:
- Extract các phrases quan trọng: `daily routine`, `every day`, `every morning`, `last summer`, `online shopping`, etc.
- Thêm các từ trong phrase vào keywords

##### **Required Elements Detection**:
- **WHERE**: `where`, `place`, `location`, `went`, `go`, `visit`, `travel`
- **WHAT**: `what`, `did`, `do`, `activity`, `activities`, `action`, `happen`
- **WHY**: `why`, `special`, `memorable`, `important`, `reason`, `because`
- **WHEN**: `when`, `time`, `during`, `while`, `after`, `before`
- **WHO**: `who`, `people`, `person`, `with`, `together`

#### **2.2. Keyword Coverage** (`calculate_keyword_coverage`):

##### **Synonym Matching**:
- Sử dụng `SYNONYM_GROUPS` để match synonyms:
  - Travel: `trip`, `vacation`, `holiday`, `travel`, `journey`, `tour`, `visit`
  - Memorable: `memorable`, `unforgettable`, `special`, `important`, `significant`
  - Shopping: `shopping`, `buying`, `purchase`, `buy`, `shop`
  - Education: `education`, `learning`, `study`, `school`, `university`, `college`

##### **Matching Process**:
1. **Exact Match**: Check xem keyword có trong essay không
2. **Synonym Match**: Check xem synonyms của keyword có trong essay không
3. **Stem Match**: Check xem có match với common suffixes không (`s`, `es`, `ed`, `ing`, `er`, `ly`)

##### **Coverage Calculation**:
```python
coverage = len(matched_keywords) / len(prompt_keywords)
```

##### **Thresholds**:
```python
if task_level in ['A1', 'A2']:
    keyword_threshold = 0.35  # 35% coverage required
elif task_level == 'B1':
    keyword_threshold = 0.40  # 40% coverage required
elif task_level == 'B2':
    keyword_threshold = 0.50  # 50% coverage required
elif task_level == 'C1':
    keyword_threshold = 0.60  # 60% coverage required
else:  # C2
    keyword_threshold = 0.70  # 70% coverage required
```

#### **2.3. Contradiction Detection** (`detect_topic_contradiction`):

##### **Contradiction Rules**:

**Rule 1: Weekend vs Daily/Weekday**:
```python
prompt_indicators = ['weekend', 'saturday', 'sunday', 'weekend activities', 'leisure time']
essay_indicators = ['every morning', 'every day', 'daily', 'work', 'office', 'monday', 'tuesday', ...]
```
- Nếu prompt có `weekend` và essay có 2+ indicators của `daily/work` → Contradiction

**Rule 2: Past/Memory vs Present/Future**:
```python
prompt_indicators = ['remember', 'past', 'last', 'ago', 'used to', 'previous', 'memory', 'memorable']
essay_indicators = ['every', 'usually', 'always', 'often', 'sometimes', 'normally', 'typically', 'will', 'going to', 'plan to', 'future']
```
- **Special handling**: Chỉ flag nếu essay có 3+ present/habitual indicators VÀ không có past indicators
- Nếu essay có past indicators (`last`, `ago`, `was`, `were`, `did`, `visited`, `went`, `had`) → OK

**Rule 3: Vacation/Holiday vs Work/School**:
```python
prompt_indicators = ['vacation', 'holiday', 'trip', 'travel', 'tour', 'relaxing', 'leisure']
essay_indicators = ['work', 'office', 'meeting', 'deadline', 'project', 'school', 'class', 'homework', 'exam', 'assignment', ...]
```
- Nếu prompt có `vacation` và essay có 2+ indicators của `work/school` → Contradiction

**Rule 4: Daily Routine vs Vacation/Trip** (NEW):
```python
prompt_indicators = ['daily', 'routine', 'every day', 'every morning', 'usually', 'always', 'often', 'normally', 'typically', 'habit', 'habits', 'regular', 'regularly', 'weekday', 'weekdays']
essay_indicators = ['vacation', 'holiday', 'trip', 'travel', 'travelled', 'traveled', 'journey', 'tour', 'beach', 'hotel', 'visited', 'explored', 'sightseeing', 'tourist', 'memorable', 'special', 'last summer', 'last year', 'last month']
```
- Nếu prompt có `daily routine` và essay có 2+ indicators của `vacation/trip` → Contradiction

##### **Contradiction Detection Logic**:
```python
if prompt_has_indicator:
    essay_has_contradiction = sum(1 for indicator in essay_indicators if indicator in essay_lower)
    if essay_has_contradiction >= 2:  # Or 3 for past/memory
        has_contradiction = True
        contradictions.append(contradiction_check['message'])
```

#### **2.4. Task Fulfillment** (`check_task_fulfillment_rubric`):

##### **WHERE Check**:
- Indicators: `where`, `went`, `go`, `visit`, `travel`, `place`, `location`, `there`, `here`
- Nếu có 1+ indicators → WHERE answered

##### **WHAT Check**:
- Indicators: `did`, `do`, `activity`, `activities`, `action`, `happened`, `visited`, `saw`, `enjoyed`
- Nếu có 1+ indicators → WHAT answered

##### **WHY Check**:
- Indicators: `because`, `why`, `special`, `memorable`, `important`, `reason`, `loved`, `enjoyed`, `amazing`, `wonderful`
- Nếu có 1+ indicators → WHY answered

##### **WHEN Check**:
- Indicators: `when`, `time`, `during`, `while`, `after`, `before`, `at`, `every`, `then`, `first`, `next`, `finally`
- Nếu có 1+ indicators → WHEN answered

##### **Fulfillment Score**:
```python
fulfillment_score = (answered_count / required_count) * 10.0
```

#### **2.5. Off-topic Decision** (`analyze_off_topic_detection`):

##### **Decision Logic**:
```python
# Step 1: Check contradiction
if has_contradiction:
    is_off_topic = True
    confidence = 0.98  # Very high confidence
    reasons.extend(contradiction_reasons)

# Step 2: Check keyword coverage
if keyword_coverage < 0.25:  # Very low coverage
    is_off_topic = True
    confidence = 0.95
    reasons.append(f"Very low keyword coverage ({keyword_coverage:.0%})")
elif keyword_coverage < keyword_threshold:
    is_off_topic = True
    confidence += 0.5
    reasons.append(f"Low keyword coverage ({keyword_coverage:.0%} < {keyword_threshold:.0%})")

# Step 3: Check fulfillment
if fulfillment_score < fulfillment_threshold:
    is_off_topic = True
    confidence += 0.4
    reasons.append(f"Low fulfillment score ({fulfillment_score:.1f} < {fulfillment_threshold:.1f})")

# Step 4: Both checks fail
if keyword_coverage < keyword_threshold and fulfillment_score < fulfillment_threshold:
    confidence = min(1.0, confidence + 0.3)  # Very high confidence
```

##### **Confidence Levels**:
- **0.98**: Contradiction detected (rất chắc chắn)
- **0.95**: Very low keyword coverage (< 25%)
- **0.5-0.9**: Low keyword coverage hoặc low fulfillment
- **1.0**: Cả keyword coverage và fulfillment đều fail

#### **2.6. Topic Multiplier Application**:

##### **Topic Gate Rules**:
```python
if topic_score < 0.55:
    # Reject: off-topic
    topic_multiplier = 0.0
elif topic_score < 0.70:
    # Weak-topic: apply penalty
    topic_multiplier = 0.7
else:
    # On-topic: normal scoring
    topic_multiplier = 1.0
```

##### **Off-topic Detection Integration**:
```python
# Only set topic_multiplier = 0.0 if VERY HIGH confidence
is_very_off_topic = (
    off_topic_result['is_off_topic'] and 
    (
        (off_topic_result['confidence'] >= 0.95) or  # Contradiction or very high confidence
        (off_topic_result['confidence'] >= 0.9 and off_topic_result['keyword_coverage'] < 0.2)  # High confidence + very low coverage
    )
)

if is_very_off_topic:
    topic_multiplier = 0.0
    off_topic_penalty = 999.0  # Lock score
else:
    # Apply penalty instead of 0.0
    off_topic_penalty = min(100, off_topic_result['confidence'] * 50)
```

### **Kết quả**:
- **Nếu off-topic** (confidence >= 0.95 hoặc contradiction):
  - `topic_multiplier = 0.0`
  - `task_response_score_10 = 0.0`
  - `off_topic_penalty = 999.0` (lock score)
  - **Tất cả criteria scores = 0.0** (coherence, lexical, grammar)
- **Nếu weak-topic** (confidence < 0.95 nhưng vẫn off-topic):
  - `topic_multiplier = 0.7` (penalty)
  - Apply penalty thay vì 0.0
  - Scores sẽ bị giảm nhưng không phải 0.0

---

## 3. Detailed Scoring (4 Criteria)

### **3.1. Task Response (30% weight)**

#### **Mục đích**: 
Đánh giá xem essay có trả lời đúng prompt không, có đáp ứng các yêu cầu cụ thể không.

#### **Base Score Calculation**:

##### **Initial Base Score**:
```python
if is_simple_task and is_lower_level:
    task_response_score_10 = min(10.0, score_10 + 1.5)  # Significant boost
elif is_simple_task:
    task_response_score_10 = min(10.0, score_10 + 1.0)  # Moderate boost
elif is_lower_level:
    task_response_score_10 = min(10.0, score_10 + 0.8)  # Small boost
else:
    task_response_score_10 = score_10  # Start with base score from model
```

##### **Ví dụ**:
- Base score từ model: 6.0
- Task type: Simple sentence (A2 level)
- Boost: +1.5 → 7.5
- **Initial task_response_score_10 = 7.5**

#### **Task Compliance Checks**:

##### **3.1.1. Sentence Count Requirement**:

**Extraction**:
```python
sentence_count_match = re.search(r'(\d+)\s*[-–—]\s*(\d+)\s*sentences?', prompt_lower)
min_sentences_req = int(sentence_count_match.group(1))
max_sentences_req = int(sentence_count_match.group(2))
```

**Scoring**:
```python
if min_sentences_req <= sentence_count <= max_sentences_req:
    task_response_feedback.append(f"Excellent! You wrote {sentence_count} sentences, perfectly within the required range ({min_sentences_req}-{max_sentences_req} sentences).")
    task_compliance_bonus += 0.8  # Significant bonus
elif sentence_count < min_sentences_req:
    task_response_feedback.append(f"Try to write more sentences. Requirement: {min_sentences_req}-{max_sentences_req} sentences. You wrote {sentence_count} sentences.")
    task_compliance_penalty += 0.5  # Moderate penalty
elif sentence_count > max_sentences_req:
    task_response_feedback.append(f"You wrote {sentence_count} sentences, slightly more than required ({min_sentences_req}-{max_sentences_req}). That's okay, but try to stay within the range.")
    # No penalty for slightly over
```

**Ví dụ**:
- Prompt: "Write 5-7 sentences about your daily routine"
- Essay: 6 sentences
- **Result**: Bonus +0.8

##### **3.1.2. Tense Requirement**:

**Detection**:
```python
if 'simple present' in prompt_lower or 'present simple' in prompt_lower:
    present_indicators = re.findall(r'\b(wake|wakes|get|gets|brush|brushes|wash|washes|have|has|go|goes|leave|leaves|help|helps|start|starts|check|checks)\b', text.lower())
    past_indicators = re.findall(r'\b(woke|got|brushed|washed|had|went|left|helped|started|checked|was|were)\b', text.lower())
```

**Scoring**:
```python
if len(present_indicators) > len(past_indicators) * 2:
    task_response_feedback.append("✓ Good use of simple present tense")
    task_compliance_bonus += 0.5
elif len(past_indicators) > len(present_indicators):
    task_response_feedback.append("The prompt asks for simple present tense, but you used past tense in some places. Try to use present tense (e.g., 'I wake up' instead of 'I woke up').")
    task_compliance_penalty += 0.3
```

**Ví dụ**:
- Prompt: "Write in simple present tense"
- Essay: "I wake up at 6:00. I brush my teeth. I have breakfast."
- Present indicators: 3 (wake, brush, have)
- Past indicators: 0
- **Result**: Bonus +0.5

##### **3.1.3. Time Expressions Requirement**:

**Detection**:
```python
time_expressions = re.findall(r'\b(at\s+\d+|every\s+\w+|in\s+the\s+\w+|after\s+\w+|before\s+\w+|around\s+\d+|usually|always|sometimes|often|never|then|next|first|finally)\b', text.lower())
```

**Scoring**:
```python
if len(time_expressions) >= 3:
    task_response_feedback.append(f"✓ Excellent use of time expressions ({len(time_expressions)} found: {', '.join(time_expressions[:3])})")
    task_compliance_bonus += 0.5
elif len(time_expressions) >= 2:
    task_response_feedback.append(f"✓ Good use of time expressions ({len(time_expressions)} found)")
    task_compliance_bonus += 0.3
elif len(time_expressions) >= 1:
    task_response_feedback.append("You used some time expressions. Try to use more (e.g., 'at 6:00', 'every morning', 'after breakfast', 'then').")
    # No penalty, just suggestion
else:
    task_response_feedback.append("The prompt asks for time expressions. Try adding phrases like 'at 6:00', 'every morning', 'after breakfast', 'then', 'usually'.")
    task_compliance_penalty += 0.2
```

**Ví dụ**:
- Prompt: "Use time expressions"
- Essay: "I wake up at 6:00. Every morning, I brush my teeth. After breakfast, I go to school."
- Time expressions: 3 (at 6:00, every morning, after breakfast)
- **Result**: Bonus +0.5

#### **Semantic Analysis** (`analyze_task_response_semantic`):

##### **Gemini API Call** (Primary):
- **Model**: `gemini-1.5-flash`
- **Temperature**: `0.1` (low for consistent results)
- **Max tokens**: `2000`
- **Response format**: `JSON`

##### **Gemini Prompt**:
- Yêu cầu Gemini phân tích:
  - `relevance_score` (0-10): Mức độ liên quan đến prompt
  - `coverage_score` (0-10): Mức độ cover các khía cạnh của prompt
  - `strengths`: List of strengths
  - `weaknesses`: List of weaknesses
  - `feedback`: List of feedback points

##### **Relevance Score Interpretation**:
```python
if relevance_score < 3.0:
    # Very off-topic - set ALL scores to 0.0
    task_response_score_10 = 0.0
    topic_multiplier = 0.0
    off_topic_penalty = 999.0
elif relevance_score < 5.0:
    # Off-topic but not very certain - apply penalty
    off_topic_penalty = min(100, (5.0 - relevance_score) * 20)
    # Penalty: (5.0 - 4.0) * 20 = 20 points
```

##### **Coverage Score**:
- Đánh giá xem essay có cover tất cả các phần của prompt không
- Ví dụ: Prompt yêu cầu WHERE, WHAT, WHY → Check xem essay có đủ 3 phần không

##### **Score Combination**:
```python
semantic_task_score = (relevance_score * 0.6 + coverage_score * 0.4)
```

##### **Score Adjustment**:
```python
score_diff = semantic_task_score - task_response_score_10

if abs(score_diff) > 1.5:
    # Significant difference - trust semantic analysis more
    if semantic_task_score < task_response_score_10:
        # Semantic says lower - use weighted average
        task_response_score_10 = semantic_task_score * 0.4 + task_response_score_10 * 0.6
    else:
        # Semantic says higher - trust it more
        task_response_score_10 = semantic_task_score * 0.7 + task_response_score_10 * 0.3
elif abs(score_diff) > 0.5:
    # Moderate difference - use balanced average
    task_response_score_10 = semantic_task_score * 0.6 + task_response_score_10 * 0.4
else:
    # Similar scores - use weighted average favoring semantic
    task_response_score_10 = semantic_task_score * 0.55 + task_response_score_10 * 0.45
```

##### **Rule-based Fallback** (Nếu Gemini không available):
- Sử dụng keyword matching
- Tính keyword overlap
- Apply penalties dựa trên overlap

#### **Off-topic Penalty Application**:

##### **Penalty Calculation**:
```python
if off_topic_penalty > 0 and off_topic_penalty < 100:
    task_response_score_10 = max(0.0, task_response_score_10 - off_topic_penalty * 0.5)
```

##### **Lock Score**:
```python
if off_topic_penalty >= 100 or topic_multiplier == 0.0:
    task_response_score_10 = 0.0  # Lock at 0.0, no adjustments allowed
```

#### **Final Score Calculation**:
```python
# Apply compliance adjustments
if not is_random_words and off_topic_penalty < 100 and topic_multiplier > 0.0:
    task_response_score_10 = task_response_score_10 + task_compliance_bonus - task_compliance_penalty
    task_response_score_10 = max(0.0, min(10.0, task_response_score_10))
elif off_topic_penalty >= 100 or topic_multiplier == 0.0:
    task_response_score_10 = 0.0  # Lock at 0.0
else:
    task_response_score_10 = 0.0  # Random words

# Apply topic multiplier (Topic Gate)
task_response_score_10 = task_response_score_10 * topic_multiplier
task_response_score_10 = max(0.0, min(10.0, task_response_score_10))
```

#### **Ví dụ cụ thể**:

**Example 1: Perfect Compliance**:
- Base score: 7.0
- Sentence count: 6/5-7 ✅ → Bonus +0.8
- Tense: Present simple ✅ → Bonus +0.5
- Time expressions: 3+ ✅ → Bonus +0.5
- **Final**: 7.0 + 0.8 + 0.5 + 0.5 = **8.8**

**Example 2: Off-topic**:
- Base score: 7.0
- Off-topic detected: `topic_multiplier = 0.0`
- **Final**: 7.0 * 0.0 = **0.0**

**Example 3: Weak Compliance**:
- Base score: 7.0
- Sentence count: 4/5-7 ❌ → Penalty -0.5
- Tense: Present simple ✅ → Bonus +0.5
- Time expressions: 1 ❌ → Penalty -0.2
- **Final**: 7.0 - 0.5 + 0.5 - 0.2 = **6.8**

### **3.2. Coherence & Cohesion (25% weight)**
- **Mục đích**: Đánh giá tính mạch lạc và kết nối của bài viết

#### **Base Score**:
- Bắt đầu từ `score_10` (từ model)
- Boost cho simple tasks:
  - Simple + Lower level: +1.2
  - Simple: +0.8
  - Lower level: +0.6

#### **Evidence-bound Scoring** (nếu có prompt):
- Phân tích coherence dựa trên prompt structure
- Ví dụ: Prompt yêu cầu WHERE → WHAT → WHY
- Check xem essay có follow structure này không

#### **Coherence Checks**:
1. **Sentence Count**: Kiểm tra số câu
   - Thresholds theo level:
     - A1-A2: 4-8 sentences
     - B1: 6-12 sentences
     - B2: 10-16 sentences
     - C1-C2: 12-20 sentences
   - Bonus: +0.3 nếu đủ
   - Penalty: -0.5 đến -1.0 nếu thiếu

2. **Linking Words**: Kiểm tra linking words
   - Thresholds theo level:
     - A1-A2: 1 linking word
     - B1: 2 linking words
     - B2: 3 linking words
     - C1-C2: 4+ linking words
   - Bonus: +0.2 đến +0.3
   - Penalty: -0.2 đến -0.5

3. **Paragraph Structure**: Kiểm tra cấu trúc đoạn văn
   - Bonus: +0.2 nếu có paragraph breaks
   - Penalty: -0.3 nếu không có

#### **Final Score**:
```python
coherence_score_10 = base_score + coherence_bonus - coherence_penalty
coherence_score_10 = coherence_score_10 * topic_multiplier  # Apply topic gate
```

### **3.3. Lexical Resource (25% weight)**
- **Mục đích**: Đánh giá từ vựng và cách sử dụng từ

#### **Base Score**:
- Bắt đầu từ `score_10` (từ model)
- Boost cho simple tasks:
  - Simple + Lower level: +1.0
  - Simple: +0.8
  - Lower level: +0.6

#### **Evidence-bound Scoring** (nếu có prompt):
- Phân tích lexical resource dựa trên topic lexicon
- Check xem essay có sử dụng từ vựng phù hợp với topic không

#### **Lexical Checks**:
1. **Lexical Diversity (TTR)**: Type-Token Ratio
   - Thresholds theo level:
     - A1-A2: 25% (lenient)
     - B1: 30%
     - B2: 45%
     - C1-C2: 50%+
   - Bonus: +0.3 đến +0.4
   - Penalty: -0.3 đến -1.0

2. **Advanced Vocabulary**: Kiểm tra từ vựng nâng cao
   - Expected theo level:
     - B2: 3 advanced words
     - C1: 4 advanced words
     - C2: 5+ advanced words
   - Bonus: +0.3 đến +0.4

3. **Topic-specific Vocabulary**: Kiểm tra từ vựng liên quan đến topic
   - Bonus: +0.2 nếu có

#### **Final Score**:
```python
lexical_score_10 = base_score + lexical_bonus - lexical_penalty
lexical_score_10 = lexical_score_10 * topic_multiplier  # Apply topic gate
```

### **3.4. Grammatical Range & Accuracy (20% weight)**
- **Mục đích**: Đánh giá ngữ pháp và độ chính xác

#### **Base Score**:
- Bắt đầu từ `score_10` (từ model)
- Boost cho simple tasks:
  - Simple + Lower level: +1.2
  - Simple: +0.8
  - Lower level: +0.6

#### **Evidence-bound Scoring** (nếu có prompt):
- Phân tích grammar dựa trên required structures
- Ví dụ: Prompt yêu cầu "simple present" → check present tense usage

#### **Grammar Checks**:
1. **Sentence Length**: Kiểm tra độ dài câu
   - Thresholds theo level:
     - A1-A2: 8-12 words (simple tasks)
     - B1: 12-16 words
     - B2: 14-18 words
     - C1-C2: 16-22 words
   - Bonus: +0.1 đến +0.3
   - Penalty: -0.3 đến -0.8

2. **Complex Structures**: Kiểm tra cấu trúc phức tạp
   - Thresholds theo level:
     - A1-A2: Optional (không bắt buộc)
     - B1: 2-3 complex structures
     - B2: 3-4 complex structures
     - C1-C2: 4-6+ complex structures
   - Bonus: +0.2 đến +0.3
   - Penalty: -0.3 đến -0.6

3. **Grammar Errors**: (Nếu có grammar checker)
   - Penalty dựa trên số lỗi

#### **Final Score**:
```python
grammar_score_10 = base_score + grammar_bonus - grammar_penalty
grammar_score_10 = grammar_score_10 * topic_multiplier  # Apply topic gate
```

---

## 4. Overall Score Calculation

### **Weighted Average**:
```python
overall_score = (
    task_response_score * 0.30 +  # 30% - Most important
    coherence_score * 0.25 +       # 25%
    lexical_score * 0.25 +         # 25%
    grammar_score * 0.20           # 20%
)
```

### **Special Cases**:
1. **Nếu off-topic** (`task_response_score = 0.0` và `topic_multiplier = 0.0`):
   - `overall_score = 0.0` (không tính weighted average)

2. **Nếu random words** (tất cả scores = 0.0):
   - `overall_score = 0.0`

3. **Nếu không off-topic**:
   - Tính weighted average bình thường
   - Clamp về 0.0-10.0

### **CEFR Level Conversion**:
```python
if overall_score >= 9.4:  # ~8.5 IELTS
    cefr_level = 'C2'
elif overall_score >= 7.8:  # ~7.0 IELTS
    cefr_level = 'C1'
elif overall_score >= 6.1:  # ~5.5 IELTS
    cefr_level = 'B2'
elif overall_score >= 4.4:  # ~4.0 IELTS
    cefr_level = 'B1'
elif overall_score >= 3.3:  # ~3.0 IELTS
    cefr_level = 'A2'
else:
    cefr_level = 'A1'
```

---

## 5. Special Handling

### **5.1. Random Words Detection**
- **Mục đích**: Phát hiện text ngẫu nhiên/không phải tiếng Anh
- **Cách hoạt động**:
  1. Dictionary coverage check (< 60% for A1-A2, < 75% for B1-C2)
  2. Gibberish heuristics (vowel ratio, character patterns)
  3. Language detection
- **Kết quả**: Nếu detect → TẤT CẢ scores = 0.0

### **5.2. Meaningless Text Detection**
- **Mục đích**: Phát hiện text có nhiều từ không hợp lệ
- **Cách hoạt động**: Dictionary coverage check
- **Kết quả**: Nếu detect → Apply penalty (30% của base score), không phải 0.0

### **5.3. Simple Task Handling**
- **Mục đích**: Điều chỉnh điểm cho các task đơn giản (sentence/paragraph)
- **Cách hoạt động**:
  - Boost base score (+1.0 đến +2.0)
  - Lenient expectations (ít sentences, ít linking words)
  - Không penalty cho simple sentences

### **5.4. Lower Level Handling**
- **Mục đích**: Điều chỉnh điểm cho các level thấp (A1-A2)
- **Cách hoạt động**:
  - Boost base score (+0.6 đến +1.0)
  - Lenient expectations (ít sentences, ít complex structures)
  - Không penalty cho missing advanced features

---

## 6. Feedback Generation

### **Task Response Feedback**:
- Strengths: "✓ Good use of simple present tense"
- Weaknesses: "⚠️ Your response does not address the prompt topic"
- Suggestions: "Try to write more sentences. Requirement: 5-7 sentences."

### **Coherence Feedback**:
- Strengths: "✓ Excellent use of linking words!"
- Weaknesses: "Try to use more linking words"
- Suggestions: "For B2 level, aim for at least 3 linking words"

### **Lexical Feedback**:
- Strengths: "✓ Excellent vocabulary diversity!"
- Weaknesses: "Vocabulary could be more diverse"
- Suggestions: "For B2 level, aim for 45% diversity"

### **Grammar Feedback**:
- Strengths: "✓ Good use of complex structures"
- Weaknesses: "Try to use more complex grammatical structures"
- Suggestions: "For B2 level, aim for at least 4 complex structures"

---

## 7. Example Flow

### **Example 1: Simple Task (A2 level)**
1. **Input**: "Write 5-7 sentences about your daily routine in simple present tense"
2. **Text**: "I wake up at 6:00. I brush my teeth. I have breakfast. I go to school. I study English."
3. **Scoring**:
   - Base score: 5.8 (từ model)
   - Task type boost: +2.0 → 7.8
   - CEFR normalization: +0.5 → 8.3
   - Task compliance: +0.8 (đúng số câu, đúng tense) → 9.1
   - Coherence: +1.2 (simple task boost) → 9.1
   - Lexical: +1.0 (simple task boost) → 9.1
   - Grammar: +1.2 (simple task boost) → 9.1
   - Overall: (9.1 * 0.30) + (9.1 * 0.25) + (9.1 * 0.25) + (9.1 * 0.20) = **9.1**

### **Example 2: Off-topic Essay**
1. **Input**: "Write about your daily routine"
2. **Text**: "Last summer, I had a memorable vacation in Da Nang. We visited beautiful beaches..."
3. **Scoring**:
   - Gemini check: Off-topic (confidence = 0.95) → **Return 0.0 immediately**
   - Hoặc nếu Gemini không có:
     - Contradiction detection: "Daily routine" vs "Vacation" → contradiction
     - `topic_multiplier = 0.0`
     - `task_response_score_10 = 0.0`
     - `overall_score = 0.0`

### **Example 3: B2 Essay Task**
1. **Input**: "Discuss the impact of climate change"
2. **Text**: "Climate change is one of the most pressing issues facing humanity today. It affects..."
3. **Scoring**:
   - Base score: 6.5 (từ model)
   - CEFR normalization: -0.3 (B2 level) → 6.2
   - Task response: 6.2 + semantic analysis adjustments
   - Coherence: 6.2 + coherence checks
   - Lexical: 6.2 + lexical diversity checks
   - Grammar: 6.2 + grammar checks
   - Overall: Weighted average của 4 criteria

---

## 8. Key Features

### **8.1. CEFR-based Scoring**
- Điểm số được điều chỉnh dựa trên CEFR level
- Lenient hơn cho level thấp, strict hơn cho level cao
- Expectations khác nhau cho mỗi level

### **8.2. Task Type Awareness**
- Nhận biết task type (sentence, paragraph, essay)
- Boost điểm cho simple tasks
- Lenient expectations cho simple tasks

### **8.3. Off-topic Detection**
- Multi-layer detection (Gemini, keyword, contradiction)
- Reject ngay lập tức nếu off-topic
- Lock scores để không bị override

### **8.4. Evidence-bound Scoring**
- Phân tích dựa trên prompt requirements
- Check compliance với task requirements
- Semantic analysis để hiểu context

### **8.5. Comprehensive Feedback**
- Feedback chi tiết cho từng criteria
- Strengths và weaknesses
- Suggestions để cải thiện

---

## 9. Limitations & Future Improvements

### **Current Limitations**:
1. Model được train trên IELTS essays, nên có bias
2. Off-topic detection có thể có false positives
3. Semantic analysis phụ thuộc vào Gemini API
4. Grammar error detection chưa hoàn chỉnh

### **Future Improvements**:
1. Fine-tune model trên CEFR-based data
2. Improve off-topic detection accuracy
3. Add more grammar error detection
4. Add mechanics scoring (spelling, punctuation)
5. Add more task types support

---

## 10. Summary

### **10.1. Pipeline Overview**

Hệ thống chấm điểm Writing là một pipeline phức tạp với nhiều bước:

1. **Pre-scoring Gates**:
   - **Gemini Off-topic Check**: Phát hiện sớm các bài lạc đề (confidence >= 0.9) → Return 0.0 ngay lập tức
   - **Validity Gate**: Kiểm tra text có phải tiếng Anh hợp lệ không (language detection, dictionary coverage, gibberish detection)

2. **Base Scoring**:
   - **ML Model**: BERT-based models (BERT PRO > BERT Multi > BERT > Traditional)
   - **Output**: IELTS score (0-9) → Convert to 10-point scale (0-10)

3. **Normalization**:
   - **CEFR Normalization**: Điều chỉnh điểm số phù hợp với CEFR level (A1-A2: lenient, B1-C2: strict)
   - **Task Type Boost**: Boost điểm cho simple tasks (sentence/paragraph)

4. **Detailed Scoring**:
   - **4 Criteria**: Task Response (30%), Coherence (25%), Lexical (25%), Grammar (20%)
   - **Evidence-bound Analysis**: Phân tích dựa trên prompt requirements
   - **Semantic Analysis**: Sử dụng Gemini để phân tích semantic relevance
   - **Compliance Checks**: Kiểm tra sentence count, tense, time expressions, etc.

5. **Topic Gate**:
   - **Off-topic Detection**: Multi-layer detection (keyword coverage, contradiction detection, task fulfillment)
   - **Penalty Application**: Apply `topic_multiplier` (0.0 for off-topic, 0.7 for weak-topic, 1.0 for on-topic)

6. **Overall Score Calculation**:
   - **Weighted Average**: `overall_score = task_response * 0.30 + coherence * 0.25 + lexical * 0.25 + grammar * 0.20`
   - **Special Cases**: Off-topic → 0.0, Random words → 0.0

7. **Feedback Generation**:
   - **Comprehensive Feedback**: Feedback chi tiết cho từng criteria
   - **Strengths & Weaknesses**: List of strengths and weaknesses
   - **Suggestions**: Suggestions để cải thiện

### **10.2. Key Features**

#### **CEFR-based Scoring**:
- Điểm số được điều chỉnh dựa trên CEFR level
- Lenient hơn cho level thấp (A1-A2: +0.3 to +0.8)
- Strict hơn cho level cao (B1: -0.2 to -1.0, B2: -0.3 to -1.5, C1: -0.8 to -2.5, C2: -1.0 to -3.0)
- Expectations khác nhau cho mỗi level (sentence count, linking words, lexical diversity, etc.)

#### **Task Type Awareness**:
- Nhận biết task type (sentence, paragraph, essay)
- Boost điểm cho simple tasks (sentence/paragraph: +1.5 to +2.0)
- Lenient expectations cho simple tasks (ít sentences, ít linking words, simple sentences OK)

#### **Off-topic Detection**:
- **Multi-layer Detection**:
  1. Gemini pre-scoring check (semantic understanding)
  2. Keyword coverage (synonym matching, thresholds by level)
  3. Contradiction detection (weekend vs daily, past vs present, vacation vs work, etc.)
  4. Task fulfillment (WHERE, WHAT, WHY, WHEN, WHO)
- **Strict Penalties**: Off-topic → `topic_multiplier = 0.0` → All scores = 0.0
- **Lock Score**: `off_topic_penalty = 999.0` to prevent adjustments

#### **Evidence-bound Scoring**:
- Phân tích coherence dựa trên prompt structure (WHERE → WHAT → WHY)
- Phân tích lexical resource dựa trên topic lexicon
- Phân tích grammar dựa trên required structures
- Check compliance với task requirements (sentence count, tense, time expressions)

#### **Comprehensive Feedback**:
- Feedback chi tiết cho từng criteria
- Strengths và weaknesses
- Suggestions để cải thiện
- Task-specific feedback (sentence count, tense, time expressions)

### **10.3. Scoring Flow Diagram**

```
Input: Text + Prompt + Task Info
    ↓
[Step 1] Gemini Off-topic Check
    ├─ Off-topic (confidence >= 0.9)? → Return 0.0
    └─ On-topic? → Continue
    ↓
[Step 2] Validity Gate
    ├─ Random words? → Return 0.0
    ├─ Meaningless text? → Apply penalty multiplier
    └─ Valid text? → Continue
    ↓
[Step 3] Base Model Scoring
    ├─ BERT PRO → IELTS score (0-9)
    ├─ BERT Multi → IELTS score (0-9)
    ├─ BERT → IELTS score (0-9)
    └─ Traditional → IELTS score (0-9)
    ↓
[Step 4] Scale Conversion
    └─ Convert to 10-point scale: (ielts_score / 9.0) * 10.0
    ↓
[Step 5] CEFR Normalization
    ├─ A1-A2: +0.3 to +0.8 (lenient)
    ├─ B1: -0.2 to -1.0 (strict)
    ├─ B2: -0.3 to -1.5 (strict)
    ├─ C1: -0.8 to -2.5 (very strict)
    └─ C2: -1.0 to -3.0 (very strict)
    ↓
[Step 6] Task Type Boost
    ├─ Simple task + Lower level: +2.0
    ├─ Simple task: +1.5
    └─ Lower level: +1.0
    ↓
[Step 7] Topic Gate
    ├─ Off-topic (confidence >= 0.95)? → topic_multiplier = 0.0
    ├─ Weak-topic? → topic_multiplier = 0.7
    └─ On-topic? → topic_multiplier = 1.0
    ↓
[Step 8] Detailed Scoring (4 Criteria)
    ├─ Task Response (30%)
    │   ├─ Base score + compliance bonus/penalty
    │   ├─ Semantic analysis (Gemini)
    │   └─ Apply topic_multiplier
    ├─ Coherence (25%)
    │   ├─ Base score + coherence bonus/penalty
    │   ├─ Evidence-bound analysis
    │   └─ Apply topic_multiplier
    ├─ Lexical (25%)
    │   ├─ Base score + lexical bonus/penalty
    │   ├─ Evidence-bound analysis
    │   └─ Apply topic_multiplier
    └─ Grammar (20%)
        ├─ Base score + grammar bonus/penalty
        ├─ Evidence-bound analysis
        └─ Apply topic_multiplier
    ↓
[Step 9] Overall Score Calculation
    └─ Weighted average: task_response * 0.30 + coherence * 0.25 + lexical * 0.25 + grammar * 0.20
    ↓
[Step 10] CEFR Level Conversion
    ├─ >= 9.4 → C2
    ├─ >= 7.8 → C1
    ├─ >= 6.1 → B2
    ├─ >= 4.4 → B1
    ├─ >= 3.3 → A2
    └─ < 3.3 → A1
    ↓
Output: Overall Score + Detailed Scores + Feedback + CEFR Level
```

### **10.4. Important Thresholds**

#### **Validity Gate**:
- **Dictionary Coverage**:
  - A1-A2: 60% valid words
  - B1-C2: 75% valid words
- **Valid Word Ratio**:
  - < 20%: Random words → 0.0
  - < 65%: Meaningless → penalty_multiplier = 0.3
  - < 75%: Poor → penalty_multiplier = 0.5
  - < 85%: Questionable → penalty_multiplier = 0.7

#### **Off-topic Detection**:
- **Keyword Coverage Thresholds**:
  - A1-A2: 35%
  - B1: 40%
  - B2: 50%
  - C1: 60%
  - C2: 70%
- **Confidence Levels**:
  - 0.98: Contradiction detected
  - 0.95: Very low keyword coverage (< 25%)
  - 0.9: High confidence + very low coverage (< 20%)

#### **CEFR Normalization**:
- **A1-A2**: +0.3 to +0.8 (lenient)
- **B1**: -0.2 to -1.0 (strict)
- **B2**: -0.3 to -1.5 (strict)
- **C1**: -0.8 to -2.5 (very strict)
- **C2**: -1.0 to -3.0 (very strict)

#### **Task Type Boost**:
- **Simple task + Lower level**: +2.0
- **Simple task**: +1.5
- **Lower level**: +1.0

### **10.5. Limitations & Future Improvements**

#### **Current Limitations**:
1. Model được train trên IELTS essays, nên có bias với simple tasks
2. Off-topic detection có thể có false positives (đã giảm thiểu với semantic awareness)
3. Semantic analysis phụ thuộc vào Gemini API (có fallback)
4. Grammar error detection chưa hoàn chỉnh (chỉ check patterns, chưa có grammar checker)

#### **Future Improvements**:
1. Fine-tune model trên CEFR-based data để giảm bias
2. Improve off-topic detection accuracy với better semantic understanding
3. Add more grammar error detection (sử dụng grammar checker API)
4. Add mechanics scoring (spelling, punctuation, capitalization) với CEFR rubric
5. Add more task types support (email, letter, report, etc.)
6. Improve feedback quality với more specific suggestions
7. Add real-time scoring feedback trong quá trình viết

### **10.6. Conclusion**

Hệ thống chấm điểm Writing là một hệ thống phức tạp và toàn diện, được thiết kế để:
- **Chấm điểm công bằng và chính xác**: Điều chỉnh điểm số phù hợp với CEFR level và task type
- **Phát hiện và reject các bài lạc đề**: Multi-layer detection với Gemini, keyword coverage, contradiction detection
- **Phát hiện và reject các bài viết ngẫu nhiên**: Validity gate với language detection, dictionary coverage, gibberish detection
- **Cung cấp feedback hữu ích**: Comprehensive feedback cho từng criteria với strengths, weaknesses, và suggestions
- **Điều chỉnh điểm số phù hợp**: CEFR normalization, task type boost, evidence-bound scoring

Hệ thống được thiết kế để đảm bảo tính công bằng, chính xác, và hữu ích cho học sinh ở mọi CEFR level và task type.

