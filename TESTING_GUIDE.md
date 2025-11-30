# Testing Guide - Intelligent Scoring System v2

## Hướng dẫn test hệ thống chấm điểm mới

### Prerequisites

1. **Start Docker services**:
```bash
docker-compose up -d
```

2. **Check Gemini API key** in `.env`:
```env
GEMINI_API_KEY=your_gemini_api_key_here
```

3. **Start Next.js**:
```bash
npm run dev
```

4. **Access**: http://localhost:3000/english/writing

---

## Test Cases

### Test Case 1: ✅ On-topic, Good Quality

**Prompt**: "Write about your daily routine. Use simple present tense and include time expressions."

**Essay** (paste này vào textarea):
```
Every morning, I wake up at 6:00 AM. First, I brush my teeth and wash my face. Then, I have breakfast with my family at 6:30. 

After breakfast, I go to work at 7:30 AM. I usually take the bus to my office. My work starts at 8:00 AM and finishes at 5:00 PM.

In the evening, I come back home at around 6:00 PM. I have dinner with my family and watch TV for one hour. Finally, I go to bed at 10:00 PM.
```

**Expected Result**:
- ✅ Overall score: **7-8/10** (B1-B2)
- ✅ Task Response: High score (8-9/10) - addresses prompt perfectly
  - Uses simple present tense ✓
  - Includes time expressions ✓
  - Describes daily routine ✓
- ✅ Vocabulary: Good score (7-8/10)
- ✅ Grammar: Good score (7-8/10)
- ✅ Coherence: High score (8-9/10) - well organized
- ✅ NOT off-topic
- Word count: ~95 words (appropriate)

---

### Test Case 2: ❌ Off-topic (Vacation instead of Daily Routine)

**Prompt**: "Write about your daily routine. Use simple present tense and include time expressions."

**Essay**:
```
Last summer, I went to Da Nang with my family. We visited many beautiful places like Marble Mountains and My Khe Beach. The weather was very nice and sunny.

We stayed at a hotel near the beach. Every day, we swam in the sea and ate delicious seafood. We also took many photos to remember the trip.

It was one of the most memorable vacations I have ever had. I really enjoyed spending time with my family and exploring the city.
```

**Expected Result**:
- ❌ Overall score: **0.0/10**
- ❌ Band: "Off-topic"
- ❌ All detailed scores: 0.0
- ❌ Task Response feedback: "⚠️ Essay discusses vacation/travel but prompt asks about daily routine"
- Reason: Wrong topic (vacation vs daily routine), wrong tense (past vs present)
- Confidence: High (>0.9)

---

### Test Case 3: ❌ Off-topic (Work from home vs Online Shopping)

**Prompt**: "Discuss the advantages and disadvantages of online shopping."

**Essay**:
```
Working from home has become very popular nowadays. Many people prefer to work from home because it saves time and money on commuting.

One advantage of working from home is flexibility. People can choose their own working hours and take breaks whenever they want. They also don't need to spend time in traffic.

However, working from home can be isolating. People might feel lonely without colleagues around. It can also be difficult to separate work life from personal life.

In conclusion, working from home has both benefits and challenges. Each person needs to decide what works best for them.
```

**Expected Result**:
- ❌ Overall score: **0.0/10**
- ❌ Band: "Off-topic"
- ❌ All detailed scores: 0.0
- ❌ Off-topic reason: "Essay discusses work/office but prompt asks about online shopping"
- Confidence: Very high (>0.95)

---

### Test Case 4: ✅ Semantic Match (Trip = Vacation)

**Prompt**: "Write about a memorable trip you have taken."

**Essay**:
```
Last summer, I had one of the most memorable vacations of my life when I traveled to Da Nang with my family. We spent five wonderful days exploring this beautiful coastal city.

We visited many famous places such as the Marble Mountains, where we climbed to the top and enjoyed the stunning view. We also spent a lot of time at My Khe Beach, which has incredibly soft sand and clear blue water.

What made this vacation truly special was spending quality time with my family. We tried many delicious local dishes, especially fresh seafood. The weather was perfect, and the people were very friendly and welcoming.

I will never forget this amazing trip. It was a perfect combination of relaxation, adventure, and family bonding.
```

**Expected Result**:
- ✅ Overall score: **8-9/10** (B2-C1)
- ✅ Task Response: Very high (9-10/10)
  - Prompt says "trip", essay says "vacation" - system should understand these are SAME TOPIC ✓
  - Includes where (Da Nang) ✓
  - Includes what (activities) ✓
  - Includes why (special/memorable) ✓
- ✅ Vocabulary: High score (8-9/10) - good diversity
- ✅ Grammar: High score (8-9/10) - past tense used correctly
- ✅ Coherence: High score (9-10/10) - well structured
- ✅ NOT off-topic
- Word count: ~140 words (excellent)

---

### Test Case 5: ⚠️ Too Short

**Prompt**: "Write about your hobbies and why you enjoy them."

**Essay**:
```
I like reading books. It is interesting.
```

**Expected Result**:
- ⚠️ Overall score: **2-3/10** (A1)
- ⚠️ Task Response: Low score due to word count penalty
  - Feedback: "Too short: 8 words (minimum: 50)"
  - Penalty multiplier applied
- ⚠️ Other scores: Low due to lack of content
- Word count: 8 words (way below minimum)

---

### Test Case 6: ✅ Correct Grammar for A2 Level

**Prompt** (A2): "Write 5-7 sentences about what you did last weekend. Use simple past tense."

**Essay**:
```
Last weekend, I had a great time. On Saturday, I went to the park with my friends. We played football and had a picnic.

On Sunday, I stayed at home. I watched TV and helped my mother cook lunch. It was a relaxing weekend.
```

**Expected Result**:
- ✅ Overall score: **7-8/10** for A2 level
- ✅ Task Response: High score (8-9/10)
  - Correct task type (simple sentences) ✓
  - Uses past tense correctly ✓
  - Appropriate length for A2 ✓
- ✅ Grammar: High score for A2 level (7-8/10)
  - Simple past tense used correctly ✓
  - Basic sentence structures appropriate ✓
- Word count: ~50 words (perfect for A2)

---

### Test Case 7: ✅ Synonym Understanding

**Prompt**: "Describe your favorite vacation destination."

**Essay**: Uses "holiday" and "travel" instead of "vacation"

**Expected Result**:
- ✅ System should understand:
  - "vacation" = "holiday" = "travel" = "trip" (SAME CONCEPT)
  - NOT mark as off-topic
- ✅ High relevance score

---

### Test Case 8: ❌ Random/Gibberish Text

**Essay**:
```
ujwerhnrgu ioi ujwior ugo0iwh goiw08i hw89u ihrfio8eh oiwehf09w8hf w9hefg oj owehf9 w8ehf w8hefowe fwe9few few 9few9 few9 few9f ew9few 9few 9few9f ewf we9f ew9few 9few
```

**Expected Result**:
- ❌ Overall score: **0.0/10**
- ❌ Error message: "Your text doesn't look like valid English"
- ❌ Rejected before scoring (Validity Gate)

---

## How to Test

### 1. Manual Testing (Recommended)

1. Go to http://localhost:3000/english/writing
2. Select a writing task
3. Copy-paste one of the test essays above
4. Click "Submit for Grading"
5. Wait for results
6. Compare with expected results

### 2. Check Console Logs

In terminal running `docker-compose`, watch for:

```
[Intelligent Scorer] Step 1: Analyzing prompt...
[Intelligent Scorer] Prompt analysis: daily routine (descriptive)
[Intelligent Scorer] Step 2: Validating content...
[Intelligent Scorer] Content validation: On-topic=True, Relevance=85%
[Intelligent Scorer] Step 3: Assessing quality...
[Intelligent Scorer] Quality: Vocab=75, Grammar=80
[Intelligent Scorer] Step 4: Checking word count...
[Intelligent Scorer] Word count: 95 (score: 90)
[Intelligent Scorer] Step 5: Calculating final score...
[Intelligent Scorer] ✓ Final score: 7.8/10 (B2)
```

### 3. Check Response Format

Inspect Network tab in browser DevTools:

```json
{
  "overall_score": 7.8,
  "cefr_level": "B2",
  "band": "Good",
  "detailed_scores": {
    "task_response": {...},
    "vocabulary": {...},
    "grammar": {...},
    "coherence": {...}
  },
  "is_off_topic": false,
  "scoring_method": "intelligent_v2"
}
```

---

## Success Criteria

Hệ thống mới **PASS** nếu:

✅ **Test 1 (On-topic)**: Score 7-8/10, không bị đánh dấu off-topic  
✅ **Test 2 (Off-topic vacation)**: Score 0.0, bị đánh dấu off-topic  
✅ **Test 3 (Off-topic work)**: Score 0.0, bị đánh dấu off-topic  
✅ **Test 4 (Semantic match)**: Score 8-9/10, hiểu "trip" = "vacation"  
✅ **Test 5 (Too short)**: Score thấp với feedback về word count  
✅ **Test 6 (A2 level)**: Score phù hợp với level, không quá strict  
✅ **Test 7 (Synonyms)**: Không bị off-topic khi dùng synonyms  
✅ **Test 8 (Gibberish)**: Rejected ngay, score 0.0  

---

## Troubleshooting

### Issue 1: "Intelligent scorer not available"

**Solution**:
```bash
# Check if Python modules are imported correctly
docker-compose logs python-service | grep "Intelligent scorer"
# Should see: "[OK] Intelligent scorer available"
```

### Issue 2: "Failed to analyze prompt"

**Solution**:
- Check Gemini API key in `.env`
- Check Docker logs: `docker-compose logs python-service`
- System should fallback to rule-based analysis if Gemini fails

### Issue 3: All scores are 0 for on-topic essays

**Solution**:
- Check console logs for "OFF-TOPIC" detection
- If false positive, it's a bug - report with the exact prompt and essay

### Issue 4: Off-topic essays still get high scores

**Solution**:
- This is a bug - the NEW system should fix this
- Report with exact test case that failed

---

## Comparing Old vs New System

### Old System Issues:
1. ❌ "Daily routine" essay for "vacation" prompt → Score 5-6/10
2. ❌ "Work from home" essay for "online shopping" → Score 4-5/10
3. ❌ Correct A2 essay → Score too low (3-4/10)

### New System Expected:
1. ✅ "Daily routine" essay for "vacation" prompt → **0.0/10** (off-topic)
2. ✅ "Work from home" essay for "online shopping" → **0.0/10** (off-topic)
3. ✅ Correct A2 essay → **7-8/10** (fair score)

---

## Reporting Issues

If you find any issues, please report:

1. **Test case** (which one from above)
2. **Expected result** vs **Actual result**
3. **Console logs** from docker-compose
4. **Screenshot** of scoring result

---

**Note**: Hệ thống mới sử dụng Gemini AI để phân tích semantic, nên kết quả có thể vary slightly (~0.5 điểm) giữa các lần chạy. Điều này là bình thường và acceptable.

