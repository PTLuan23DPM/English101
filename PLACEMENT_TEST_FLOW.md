# 🎯 PLACEMENT TEST FLOW

## 📋 **OVERVIEW**

Placement Test giúp xác định trình độ English của user (A1-C2) để:
- Load bài tập phù hợp với level
- Personalize learning path
- Track progress from starting point

---

## 🔄 **USER FLOW**

### **1. New User Signup**
```
User visits homepage → Click "Sign Up"
  ↓
Register with email/password
  ↓
Login successful → Redirect to Dashboard
  ↓
Check: Has user taken placement test?
  ├─ NO  → Redirect to /english/placement-test (FORCE)
  └─ YES → Show Dashboard normally
```

### **2. Placement Test Page**
```
/english/placement-test

UI Components:
┌────────────────────────────────────────┐
│  🎓 Placement Test                     │
│                                        │
│  Discover your English level!         │
│  • 20 questions                       │
│  • 15 minutes                         │
│  • All skills tested                  │
│                                        │
│  [Start Test]                         │
└────────────────────────────────────────┘
```

### **3. During Test**
```
Question 1/20       ⏱️ 12:34 remaining

[Question content]

A) Option A
B) Option B
C) Option C
D) Option D

[Previous]  [Next]  [Submit]
```

**Features**:
- ✅ Timer (15 minutes)
- ✅ Progress bar (1/20)
- ✅ Can go back to previous questions
- ✅ Auto-submit when time ends
- ✅ Warning before submit

### **4. Scoring Algorithm**

```typescript
// Questions cover A1 → C2
const questions = [
  { level: 'A1', questions: [q1, q2, q3, q4] },  // 4 questions
  { level: 'A2', questions: [q5, q6, q7, q8] },  // 4 questions
  { level: 'B1', questions: [q9, q10, q11, q12] }, // 4 questions
  { level: 'B2', questions: [q13, q14, q15, q16] }, // 4 questions
  { level: 'C1', questions: [q17, q18, q19, q20] } // 4 questions
];

// Calculate level based on accuracy per level
function calculateLevel(answers) {
  const accuracy = {
    'A1': calculateAccuracy(answers, 'A1'), // e.g., 100%
    'A2': calculateAccuracy(answers, 'A2'), // e.g., 75%
    'B1': calculateAccuracy(answers, 'B1'), // e.g., 50%
    'B2': calculateAccuracy(answers, 'B2'), // e.g., 25%
    'C1': calculateAccuracy(answers, 'C1'), // e.g., 0%
  };
  
  // Find highest level with >= 60% accuracy
  if (accuracy.C1 >= 60) return 'C2';
  if (accuracy.B2 >= 60) return 'C1';
  if (accuracy.B1 >= 60) return 'B2';
  if (accuracy.A2 >= 60) return 'B1';
  if (accuracy.A1 >= 60) return 'A2';
  return 'A1';
}
```

### **5. Results Page**
```
/english/placement-test/result

┌────────────────────────────────────────┐
│  🎉 Test Complete!                     │
│                                        │
│  Your English Level:                  │
│       [B1] INTERMEDIATE               │
│                                        │
│  Score Breakdown:                     │
│  ▓▓▓▓▓▓░░░░ A1: 100% ✓                │
│  ▓▓▓▓▓░░░░░ A2:  80% ✓                │
│  ▓▓▓░░░░░░░ B1:  60% ✓  ← Your Level │
│  ▓░░░░░░░░░ B2:  20%                  │
│  ░░░░░░░░░░ C1:   0%                  │
│                                        │
│  Recommendations:                     │
│  • Focus on B1 exercises              │
│  • Practice listening comprehension   │
│  • Build vocabulary for daily topics  │
│                                        │
│  [Start Learning]                     │
└────────────────────────────────────────┘
```

### **6. Save to Database**
```typescript
await prisma.user.update({
  where: { id: userId },
  data: {
    cefrLevel: 'B1',
    placementTestTaken: true,
    placementTestDate: new Date(),
    placementTestScore: {
      A1: 100,
      A2: 80,
      B1: 60,
      B2: 20,
      C1: 0,
    },
  },
});
```

---

## 🛠️ **IMPLEMENTATION STEPS**

### **Step 1: Update User Schema**
```prisma
// prisma/schema.prisma
model User {
  id                   String    @id @default(cuid())
  email                String    @unique
  name                 String?
  password             String?
  
  // Placement Test fields
  cefrLevel            CEFRLevel? // Current level
  placementTestTaken   Boolean    @default(false)
  placementTestDate    DateTime?
  placementTestScore   Json?      // Store breakdown
  
  createdAt            DateTime   @default(now())
  updatedAt            DateTime   @updatedAt
}
```

### **Step 2: Middleware Check**
```typescript
// src/middleware.ts
export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request });
  
  if (token && isProtectedRoute) {
    // Check if placement test taken
    const user = await prisma.user.findUnique({
      where: { id: token.sub },
      select: { placementTestTaken: true },
    });
    
    if (!user?.placementTestTaken) {
      // Force redirect to placement test
      if (!pathname.startsWith('/english/placement-test')) {
        return NextResponse.redirect(
          new URL('/english/placement-test', request.url)
        );
      }
    }
  }
  
  return NextResponse.next();
}
```

### **Step 3: Create Placement Test JSON**
```json
// exercises/placement-test/placement-test.json
{
  "id": "placement-test-001",
  "title": "English Placement Test",
  "type": "PLACEMENT_TEST",
  "timeLimitMinutes": 15,
  "questions": [
    {
      "id": "q1",
      "level": "A1",
      "skill": "GRAMMAR",
      "prompt": "I ___ a student.",
      "choices": [
        { "id": "a", "text": "am", "isCorrect": true },
        { "id": "b", "text": "is", "isCorrect": false },
        { "id": "c", "text": "are", "isCorrect": false }
      ]
    },
    // ... 19 more questions
  ]
}
```

### **Step 4: Create API Endpoint**
```typescript
// src/app/api/placement-test/submit/route.ts
export async function POST(req: NextRequest) {
  const { answers, startTime, endTime } = await req.json();
  const user = await getUser();
  
  // Calculate level
  const result = calculatePlacementLevel(answers);
  
  // Save to database
  await prisma.user.update({
    where: { id: user.id },
    data: {
      cefrLevel: result.level,
      placementTestTaken: true,
      placementTestDate: new Date(),
      placementTestScore: result.breakdown,
    },
  });
  
  return NextResponse.json(result);
}
```

### **Step 5: Load Appropriate Exercises**
```typescript
// server/services/exerciseService.ts
export async function getExercisesForUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { cefrLevel: true },
  });
  
  // Load exercises matching user's level
  const exercises = await loadExercises({
    level: user.cefrLevel || 'A1',
  });
  
  return exercises;
}
```

---

## 📊 **QUESTION DISTRIBUTION**

### **By Level**
```
A1: 4 questions (20%)
A2: 4 questions (20%)
B1: 4 questions (20%)
B2: 4 questions (20%)
C1: 4 questions (20%)
Total: 20 questions
```

### **By Skill**
```
Grammar:      6 questions (30%)
Vocabulary:   5 questions (25%)
Reading:      4 questions (20%)
Listening:    3 questions (15%)
Writing:      2 questions (10%)
Total: 20 questions
```

### **Question Types**
```
Single Choice:  14 questions
Gap Fill:        4 questions
Short Answer:    2 questions
```

---

## 🎯 **LEVEL DETERMINATION LOGIC**

### **Algorithm**
```typescript
function determineCEFRLevel(answers: Answer[]): CEFRLevel {
  const levelScores = {
    A1: 0, A2: 0, B1: 0, B2: 0, C1: 0, C2: 0
  };
  
  // Calculate correct per level
  for (const answer of answers) {
    const question = getQuestion(answer.questionId);
    if (answer.isCorrect) {
      levelScores[question.level]++;
    }
  }
  
  // Calculate percentage per level
  const percentages = {
    A1: (levelScores.A1 / 4) * 100,
    A2: (levelScores.A2 / 4) * 100,
    B1: (levelScores.B1 / 4) * 100,
    B2: (levelScores.B2 / 4) * 100,
    C1: (levelScores.C1 / 4) * 100,
  };
  
  // Find highest level with >= 60% accuracy
  if (percentages.C1 >= 60) return 'C2';
  if (percentages.B2 >= 60) return 'C1';
  if (percentages.B1 >= 60) return 'B2';
  if (percentages.A2 >= 60) return 'B1';
  if (percentages.A1 >= 60) return 'A2';
  return 'A1';
}
```

### **Edge Cases**
```typescript
// If user gets 100% on all levels
if (allLevelsAbove80()) return 'C2';

// If user fails all levels
if (allLevelsBelow40()) return 'A1';

// If user skips many questions
if (answeredCount < 15) return 'A1'; // Minimum level
```

---

## 🚀 **QUICK START**

### **1. Run Migrations**
```bash
npx prisma migrate dev --name add-placement-test-fields
```

### **2. Create Placement Test JSON**
```bash
mkdir exercises/placement-test
touch exercises/placement-test/placement-test.json
# Fill with 20 questions
```

### **3. Update Middleware**
```typescript
// Add placement test check
if (!user.placementTestTaken) {
  redirect('/english/placement-test');
}
```

### **4. Create UI Pages**
```bash
mkdir src/app/english/placement-test
touch src/app/english/placement-test/page.tsx
touch src/app/english/placement-test/result/page.tsx
```

### **5. Test**
```bash
# Sign up new account
# Should auto-redirect to placement test
# Complete test
# Check level saved in database
```

---

## 📝 **EXAMPLE QUESTIONS**

### **A1 Level**
```
Q1: I ___ happy.
A) am ✓
B) is
C) are

Q2: She ___ from Japan.
A) am
B) is ✓
C) are
```

### **B1 Level**
```
Q9: If I ___ time, I would help you.
A) have
B) had ✓
C) will have

Q10: The book ___ on the table.
A) is lying ✓
B) lies
C) is laying
```

### **C1 Level**
```
Q17: Had I known about the meeting, I ___ attended.
A) would have ✓
B) will have
C) would

Q18: The phenomenon ___ by several researchers.
A) has been studied ✓
B) studied
C) was studying
```

---

**Ready to implement!** 🎉

