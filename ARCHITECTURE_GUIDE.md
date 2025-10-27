# 🏗️ ARCHITECTURE & NAMING CONVENTIONS

## 📂 **PROJECT STRUCTURE (NEW)**

```
English101/
├── src/
│   ├── app/                          # 🎨 FRONTEND (Next.js)
│   │   ├── (auth)/                   # Auth pages group
│   │   ├── (dashboard)/              # Dashboard pages group
│   │   ├── api/                      # API Routes (thin wrappers)
│   │   └── ...
│   │
│   ├── middleware.ts                 # Auth middleware
│   └── ...
│
├── server/                           # 🔧 BACKEND LOGIC (Separated)
│   ├── controllers/                  # Business logic controllers
│   │   ├── readingController.ts     # Reading exercises controller
│   │   ├── listeningController.ts   # Listening exercises controller
│   │   ├── writingController.ts     # Writing exercises controller
│   │   └── speakingController.ts    # Speaking exercises controller
│   │
│   ├── services/                     # Data layer services
│   │   ├── readingService.ts        # Reading data operations
│   │   ├── gradingService.ts        # Auto-grading logic
│   │   ├── userService.ts           # User operations
│   │   └── ...
│   │
│   └── utils/                        # Helper functions
│       ├── emailSender.ts           # Email utilities
│       ├── tokenGenerator.ts        # Token generation
│       └── validators.ts            # Input validation
│
├── exercises/                        # 📚 EXERCISE DATA (JSON)
│   ├── reading/
│   │   ├── a1/
│   │   │   ├── at-the-restaurant.json      ✅
│   │   │   ├── daily-routine.json
│   │   │   └── family-description.json
│   │   ├── a2/
│   │   ├── b1/
│   │   ├── b2/
│   │   ├── c1/
│   │   └── c2/
│   │
│   ├── listening/
│   │   ├── a1/
│   │   │   ├── basic-conversation.json
│   │   │   └── simple-directions.json
│   │   └── ...
│   │
│   ├── writing/
│   │   ├── a1/
│   │   │   ├── write-introduction.json
│   │   │   └── describe-picture.json
│   │   └── ...
│   │
│   └── speaking/
│       ├── a1/
│       │   ├── self-introduction.json
│       │   └── daily-activities.json
│       └── ...
│
├── types/                            # 📦 SHARED TYPES
│   ├── exerciseTypes.ts             # Exercise type definitions    ✅
│   ├── apiTypes.ts                  # API request/response types
│   ├── userTypes.ts                 # User-related types
│   └── ...
│
├── prisma/                           # 🗄️ DATABASE
│   ├── schema.prisma
│   └── seed.ts
│
└── public/                           # 🌐 STATIC FILES
    ├── recordings/                   # Audio recordings
    └── ...
```

---

## 🎯 **NAMING CONVENTIONS**

### **1. Files & Folders**

| Type | Convention | Example |
|------|------------|---------|
| **Folders** | lowercase | `controllers`, `services`, `exercises` |
| **TypeScript files** | camelCase | `readingController.ts`, `userService.ts` |
| **JSON files** | kebab-case | `at-the-restaurant.json`, `daily-routine.json` |
| **React components** | PascalCase | `Dashboard.tsx`, `LoginForm.tsx` |

### **2. Code Elements**

| Element | Convention | Example |
|---------|------------|---------|
| **Classes** | PascalCase | `ReadingController`, `GradingService` |
| **Interfaces** | PascalCase | `Exercise`, `Question`, `SubmissionRequest` |
| **Types** | PascalCase | `SkillType`, `CEFRLevel` |
| **Functions** | camelCase | `getExercises()`, `gradeSubmission()` |
| **Variables** | camelCase | `userId`, `totalScore` |
| **Constants** | UPPER_SNAKE_CASE | `MAX_ATTEMPTS`, `DEFAULT_PAGE_SIZE` |
| **Private methods** | camelCase with prefix | `_sanitizeExercise()`, `_validateInput()` |

### **3. Database (Prisma)**

| Element | Convention | Example |
|---------|------------|---------|
| **Models** | PascalCase | `User`, `Activity`, `Attempt` |
| **Fields** | camelCase | `userId`, `activityId`, `createdAt` |
| **Enums** | PascalCase | `CEFRLevel`, `Skill`, `QuestionType` |

---

## 🔄 **DATA FLOW**

### **Request Flow (Reading Example)**

```
1. CLIENT REQUEST
   Frontend → GET /api/reading/activities?level=A1

2. API ROUTE (Thin wrapper)
   src/app/api/reading/activities/route.ts
   ↓
   - Validate session
   - Call controller
   
3. CONTROLLER
   server/controllers/readingController.ts
   ↓
   - Business logic
   - Call service
   
4. SERVICE
   server/services/readingService.ts
   ↓
   - Load from JSON (exercises/reading/a1/*.json)
   - Or fetch from database (Prisma)
   
5. RESPONSE
   JSON data → Controller → API Route → Client
```

### **Submission Flow**

```
1. CLIENT SUBMITS
   Frontend → POST /api/reading/[id]/submit
   {
     exerciseId: "reading-a1-001",
     answers: [...],
     startTime: "...",
     endTime: "..."
   }

2. API ROUTE
   src/app/api/reading/[id]/submit/route.ts
   ↓
   
3. CONTROLLER
   readingController.submitExercise()
   ↓
   
4. SERVICES
   - readingService.findById() → Load exercise
   - gradingService.gradeSubmission() → Auto-grade
   - readingService.saveAttempt() → Save to DB
   
5. RESPONSE
   {
     totalScore: 15,
     maxScore: 20,
     percentage: 75,
     passed: true,
     results: [...],
     feedback: {...}
   }
```

---

## 📝 **EXERCISE JSON SCHEMA**

### **File Naming**
```
exercises/{skill}/{level}/{slug}.json

Examples:
✅ exercises/reading/a1/at-the-restaurant.json
✅ exercises/listening/b1/job-interview.json
✅ exercises/writing/a2/email-to-friend.json
```

### **JSON Structure**
```json
{
  "id": "skill-level-number",           // e.g., "reading-a1-001"
  "title": "Human readable title",
  "skill": "READING | LISTENING | WRITING | SPEAKING",
  "level": "A1 | A2 | B1 | B2 | C1 | C2",
  "type": "Activity type constant",
  "estimatedTimeMinutes": 10,
  "metadata": {
    "topics": ["Food", "Daily Life"],
    "vocabulary": ["word1", "word2"],
    "grammar": ["Present Simple"],
    "difficulty": 1                      // 1-5
  },
  "content": {
    "text": "The exercise content...",
    "imageUrl": "optional",
    "audioUrl": "optional"
  },
  "questions": [
    {
      "id": "q1",
      "order": 1,
      "type": "SINGLE_CHOICE | MULTI_CHOICE | TRUE_FALSE | SHORT_TEXT",
      "prompt": "Question text",
      "points": 5,
      "choices": [                       // For choice questions
        {
          "id": "a",
          "text": "Option A",
          "isCorrect": true
        }
      ],
      "correctAnswer": "...",            // For true/false, short text
      "correctAnswers": ["..."],         // For multiple acceptable answers
      "explanation": "Why this is correct"
    }
  ],
  "totalPoints": 20,
  "passingScore": 12,
  "vocabulary": [                        // Optional
    {
      "word": "hungry",
      "definition": "wanting to eat",
      "example": "He is hungry."
    }
  ]
}
```

---

## 🚀 **HOW TO ADD NEW EXERCISES**

### **Method 1: Manual JSON Creation**

```bash
# 1. Create JSON file in appropriate folder
touch exercises/reading/a1/my-new-exercise.json

# 2. Follow the JSON schema above
# 3. Restart server to load new exercises
npm run dev
```

### **Method 2: Use Admin UI** (To be built)

```
/admin/exercises/create
- Form with all fields
- Preview
- Validate
- Save as JSON
```

---

## 🔧 **HOW TO USE BACKEND SERVICES**

### **In API Routes**

```typescript
// src/app/api/reading/activities/route.ts
import { readingController } from '@/server/controllers/readingController';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const level = searchParams.get('level');
  
  const result = await readingController.getExercises({ level });
  
  return NextResponse.json(result);
}
```

### **In Server Components**

```typescript
// src/app/reading/[id]/page.tsx
import { readingService } from '@/server/services/readingService';

export default async function ReadingPage({ params }: { params: { id: string } }) {
  const exercise = await readingService.findById(params.id);
  
  return <ExerciseView exercise={exercise} />;
}
```

---

## 📊 **FOLDER SIZE LIMITS**

| Folder | Max Size | Reason |
|--------|----------|--------|
| `exercises/` | ~100MB | JSON files only |
| `public/recordings/` | ~1GB | Audio files |
| `server/` | ~50MB | Code only |
| `types/` | ~10MB | Type definitions |

---

## ✅ **CHECKLIST FOR NEW FEATURES**

- [ ] Create TypeScript types in `types/`
- [ ] Create service in `server/services/`
- [ ] Create controller in `server/controllers/`
- [ ] Create API route in `src/app/api/`
- [ ] Add exercises JSON if needed
- [ ] Update Prisma schema if needed
- [ ] Test with sample data
- [ ] Document in README

---

## 🎓 **EXAMPLES**

### ✅ **Good Naming**
```
✅ exercises/reading/a1/at-the-restaurant.json
✅ server/controllers/readingController.ts
✅ types/exerciseTypes.ts
✅ function getUserById()
✅ const MAX_RETRIES = 3
```

### ❌ **Bad Naming**
```
❌ exercises/Reading/A1/At_The_Restaurant.JSON
❌ server/Controllers/Reading-Controller.ts
❌ types/Exercise_Types.ts
❌ function GetUserById()
❌ const max_retries = 3
```

---

**Tạo bởi: English101 Team** 🚀

