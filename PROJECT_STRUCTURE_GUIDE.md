# 📂 HƯỚNG DẪN TẤ CH BE/FE & TỔ CHỨC DỰ ÁN

## 🤔 **TẠI SAO SIGN UP KHÔNG HOẠT ĐỘNG?**

### **Vấn đề**: Sign up không work
**Nguyên nhân**: Database chưa chạy hoặc chưa migrate

### ✅ **GIẢI PHÁP - CHẠY DATABASE**

```bash
# Bước 1: Start PostgreSQL database
docker compose up -d

# Bước 2: Chạy migrations
npx prisma migrate dev

# Bước 3: (Optional) Seed data mẫu
npm run db:seed

# Bước 4: Check database đã chạy chưa
npx prisma studio
# Sẽ mở browser tại http://localhost:5555
```

### **Kiểm tra lỗi**
```bash
# Xem logs của database
docker compose logs db

# Check connection
npx prisma db push
```

---

## 🏗️ **CẤU TRÚC DỰ ÁN HIỆN TẠI (MONOREPO)**

```
English101/
├── src/
│   ├── app/                          # Frontend (Next.js App Router)
│   │   ├── api/                      # Backend API Routes ⚠️ BE & FE chung folder
│   │   │   ├── auth/
│   │   │   │   ├── register/route.ts       # Register API
│   │   │   │   ├── [...nextauth]/route.ts # NextAuth config
│   │   │   │   ├── forgot-password/route.ts
│   │   │   │   ├── verify-otp/route.ts
│   │   │   │   └── reset-password/route.ts
│   │   │   ├── reading/
│   │   │   │   ├── activities/route.ts
│   │   │   │   └── [activityId]/
│   │   │   │       ├── route.ts
│   │   │   │       └── submit/route.ts
│   │   │   ├── listening/         # Listening API
│   │   │   ├── speaking/          # Speaking API
│   │   │   ├── writing/           # Writing API
│   │   │   ├── placement-test/    # Placement Test API
│   │   │   └── dashboard/         # Dashboard API
│   │   │
│   │   ├── english/              # Frontend Pages (Protected)
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── listening/page.tsx
│   │   │   ├── reading/page.tsx
│   │   │   ├── writing/page.tsx
│   │   │   ├── speaking/page.tsx
│   │   │   ├── grammar/page.tsx
│   │   │   ├── vocabulary/page.tsx
│   │   │   └── ...
│   │   │
│   │   ├── authentication/       # Auth Pages
│   │   │   ├── login/page.tsx
│   │   │   ├── register/page.tsx
│   │   │   └── forgot-password/page.tsx
│   │   │
│   │   ├── dashboard/_components/ # Shared Dashboard Components
│   │   │   ├── header.tsx
│   │   │   └── sidebar.tsx
│   │   │
│   │   └── page.tsx              # Landing page
│   │
│   ├── lib/                      # Shared Libraries
│   │   ├── prisma.ts            # Database client
│   │   └── swagger.ts           # API docs config
│   │
│   └── middleware.ts            # Auth middleware
│
├── prisma/
│   ├── schema.prisma           # Database schema
│   └── seed.ts                 # Seed data
│
├── public/                     # Static files
│   └── recordings/             # Audio recordings
│
└── docker-compose.yml          # Database setup
```

### ⚠️ **VẤN ĐỀ VỚI CẤU TRÚC HIỆN TẠI**

1. **BE & FE lẫn lộn**: API routes và UI components cùng folder `src/app/`
2. **Khó maintain**: Khi project lớn, rất khó tìm file
3. **Deploy phức tạp**: Không tách được FE deploy sang Vercel, BE sang Railway
4. **Không reusable**: API không dùng cho mobile app hay desktop

---

## ✅ **OPTION 1: TỔ CHỨC LẠI TRONG MONOREPO (ĐỀ XUẤT)**

### **Cấu trúc mới - Rõ ràng hơn**

```
English101/
├── src/
│   ├── app/                    # 🎨 FRONTEND ONLY
│   │   ├── (auth)/             # Auth layout group
│   │   │   ├── login/page.tsx
│   │   │   └── register/page.tsx
│   │   ├── (dashboard)/        # Dashboard layout group
│   │   │   ├── layout.tsx
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── listening/page.tsx
│   │   │   └── ...
│   │   ├── api/                # ⚙️ BACKEND API (giữ nguyên cho Next.js)
│   │   └── page.tsx
│   │
│   ├── server/                 # 🔧 BACKEND LOGIC (Tách riêng)
│   │   ├── controllers/        # Business logic
│   │   │   ├── authController.ts
│   │   │   ├── readingController.ts
│   │   │   ├── listeningController.ts
│   │   │   └── ...
│   │   ├── services/           # Database operations
│   │   │   ├── userService.ts
│   │   │   ├── activityService.ts
│   │   │   └── ...
│   │   ├── validators/         # Input validation
│   │   │   ├── authValidator.ts
│   │   │   └── ...
│   │   └── utils/              # Helper functions
│   │       ├── email.ts
│   │       ├── encryption.ts
│   │       └── ...
│   │
│   ├── types/                  # 📦 SHARED TYPES
│   │   ├── api.ts              # API request/response types
│   │   ├── exercise.ts         # Exercise types
│   │   ├── user.ts             # User types
│   │   └── ...
│   │
│   ├── exercises/              # 📚 BÀI TẬP (Định dạng riêng)
│   │   ├── reading/
│   │   │   ├── a1/
│   │   │   │   ├── exercise-001.json
│   │   │   │   └── exercise-002.json
│   │   │   ├── a2/
│   │   │   └── ...
│   │   ├── listening/
│   │   ├── writing/
│   │   └── speaking/
│   │
│   ├── lib/                    # Shared libraries
│   │   ├── prisma.ts
│   │   └── ...
│   │
│   └── middleware.ts
│
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
│
└── docker-compose.yml
```

### **Ví dụ Exercise JSON Format**

```json
// src/exercises/reading/a1/exercise-001.json
{
  "id": "reading-a1-001",
  "title": "At the Restaurant",
  "level": "A1",
  "type": "READ_MAIN_IDEA",
  "estimatedTime": 10,
  "content": {
    "text": "John goes to a restaurant. He is hungry...",
    "vocabulary": [
      { "word": "hungry", "definition": "wanting to eat food" }
    ]
  },
  "questions": [
    {
      "id": "q1",
      "type": "SINGLE_CHOICE",
      "prompt": "Where does John go?",
      "choices": [
        { "id": "a", "text": "Restaurant", "isCorrect": true },
        { "id": "b", "text": "School", "isCorrect": false }
      ],
      "score": 5
    }
  ],
  "maxScore": 20
}
```

### **Ví dụ Controller tách riêng**

```typescript
// src/server/controllers/readingController.ts
import { activityService } from '../services/activityService';
import { readingExercises } from '@/exercises/reading';

export class ReadingController {
  async getActivities(level?: string) {
    // Business logic
    const activities = await activityService.getBySkill('READING', level);
    return activities;
  }

  async getActivityDetail(activityId: string) {
    const activity = await activityService.getById(activityId);
    
    // Load exercise từ JSON
    const exercise = readingExercises.getById(activity.exerciseId);
    
    return {
      ...activity,
      content: exercise.content,
      questions: exercise.questions
    };
  }

  async submitActivity(activityId: string, answers: any) {
    // Grading logic
    // ...
  }
}
```

### **API Route gọi Controller**

```typescript
// src/app/api/reading/activities/route.ts
import { NextRequest, NextResponse } from "next/server";
import { ReadingController } from "@/server/controllers/readingController";

const controller = new ReadingController();

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const level = searchParams.get("level");
    
    const activities = await controller.getActivities(level);
    
    return NextResponse.json({ activities });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}
```

---

## 🚀 **OPTION 2: TÁCH HOÀN TOÀN BE & FE (Advanced)**

### **Cấu trúc 2 repos riêng biệt**

```
📁 english101-frontend/        # Frontend (Next.js)
├── src/
│   ├── app/
│   ├── components/
│   ├── hooks/
│   ├── lib/
│   └── types/
└── package.json

📁 english101-backend/         # Backend (Express.js hoặc Fastify)
├── src/
│   ├── routes/
│   ├── controllers/
│   ├── services/
│   ├── middleware/
│   └── exercises/
├── prisma/
└── package.json
```

### **Frontend gọi API**

```typescript
// Frontend: src/lib/api.ts
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export async function getReadingActivities(level?: string) {
  const params = level ? `?level=${level}` : '';
  const res = await fetch(`${API_URL}/api/reading/activities${params}`, {
    headers: {
      'Authorization': `Bearer ${getToken()}`,
    },
  });
  return res.json();
}
```

### **Backend standalone (Express)**

```typescript
// Backend: src/routes/reading.ts
import express from 'express';
import { ReadingController } from '../controllers/readingController';

const router = express.Router();
const controller = new ReadingController();

router.get('/activities', async (req, res) => {
  try {
    const activities = await controller.getActivities(req.query.level);
    res.json({ activities });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch' });
  }
});

export default router;
```

---

## 📋 **SO SÁNH CÁC OPTIONS**

| Tiêu chí | Monorepo (Option 1) | Tách riêng (Option 2) |
|----------|---------------------|----------------------|
| **Phù hợp** | Dự án nhỏ/vừa | Dự án lớn, team nhiều người |
| **Deploy** | 1 lần (Vercel) | 2 lần (Vercel + Railway) |
| **Độ phức tạp** | Đơn giản ⭐⭐ | Phức tạp ⭐⭐⭐⭐ |
| **Tốc độ dev** | Nhanh | Chậm hơn (setup CORS, auth) |
| **Scalability** | Trung bình | Cao |
| **Cost** | Thấp (1 server) | Cao (2 servers) |
| **Mobile/Desktop** | Khó | Dễ (API chung) |

---

## 🎯 **ĐỀ XUẤT CHO PROJECT NÀY**

### **✅ Nên dùng: OPTION 1 (Monorepo có tổ chức)**

**Lý do**:
1. Project hiện tại vừa phải, chưa cần tách hoàn toàn
2. Deploy đơn giản hơn (1 lần lên Vercel)
3. Development nhanh hơn
4. Chi phí thấp

**Làm ngay**:
1. Tạo folder `src/server/` cho backend logic
2. Tạo folder `src/exercises/` cho exercise data (JSON)
3. Tạo folder `src/types/` cho shared types
4. Refactor API routes để gọi controllers

---

## 🔧 **MIGRATION PLAN (Từng bước)**

### **Phase 1: Tạo structure mới** (1-2 giờ)
```bash
mkdir -p src/server/{controllers,services,validators,utils}
mkdir -p src/exercises/{reading,listening,writing,speaking}
mkdir -p src/types
```

### **Phase 2: Tách Backend Logic** (2-3 giờ)
- Di chuyển business logic từ API routes → Controllers
- Tạo Services cho database operations
- Tạo Validators cho input validation

### **Phase 3: Tạo Exercise JSON** (3-4 giờ)
- Convert bài tập từ database → JSON files
- Create JSON schema validation
- Update seed script để load từ JSON

### **Phase 4: Type Safety** (1-2 giờ)
- Define shared types
- Add Zod validation schemas
- Update API contracts

### **Phase 5: Testing** (2-3 giờ)
- Test tất cả API endpoints
- Test frontend integration
- Fix bugs

**Total: ~10-15 giờ**

---

## 📝 **CHECKLIST SIGN UP FIX**

- [ ] **Database đang chạy**: `docker compose up -d`
- [ ] **Migrations applied**: `npx prisma migrate dev`
- [ ] **Check schema**: `npx prisma studio`
- [ ] **Test API endpoint**: 
  ```bash
  curl -X POST http://localhost:3000/api/auth/register \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"test123","name":"Test"}'
  ```
- [ ] **Check logs**: Xem terminal có error gì không
- [ ] **Check .env**: `DATABASE_URL` có đúng không

---

**Bạn muốn tôi bắt đầu refactor theo Option 1 ngay không?** 🚀

