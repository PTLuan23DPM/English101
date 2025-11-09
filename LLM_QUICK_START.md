# 🚀 LLM Features - Quick Start

## ✅ Đã hoàn thành (Backend)

Tất cả 12 chức năng AI đã được implement backend:

1. ✅ **Outline Generator** - Gợi ý dàn ý essay
2. ✅ **Brainstorm** - Sinh ý tưởng & ví dụ
3. ✅ **Language Pack** - Từ vựng & cấu trúc theo level
4. ✅ **Rephrase** - Viết lại câu theo style
5. ✅ **Grammar Hints** - Gợi ý grammar (không sửa)
6. ✅ **Thesis Generator** - Sinh thesis statement
7. ✅ **Sentence Expander** - Mở rộng câu
8. ✅ **Self-Review** - Tóm tắt & kiểm tra on-topic
9. ⚠️ **Timer/Counter/Auto-save** - Cần implement frontend
10. ✅ **Scoring** - Đã có từ trước
11. ⚠️ **Anti-Plagiarism** - Cần implement logic
12. ✅ **Adaptive Next Task** - Gợi ý bài tiếp theo

## 📋 Cần làm gì tiếp theo?

### Bước 1: Setup Gemini API Key

```bash
# 1. Lấy API key tại: https://makersuite.google.com/app/apikey

# 2. Tạo file .env.local
cp .env.example .env.local

# 3. Thêm API key vào .env.local
GEMINI_API_KEY=your-actual-api-key-here

# 4. Restart server
npm run dev
```

### Bước 2: Test API Endpoints

Mở browser console và test:

```javascript
// Test Outline Generator
fetch('/api/writing/outline', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    level: 'B2',
    type: 'Opinion',
    topic: 'Should university be free?'
  })
}).then(r => r.json()).then(console.log);

// Test Brainstorm
fetch('/api/writing/brainstorm', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    level: 'B1',
    type: 'Discussion',
    topic: 'Working from home'
  })
}).then(r => r.json()).then(console.log);
```

### Bước 3: Tích hợp vào UI

Các file cần sửa:
- `src/app/english/writing/page.tsx` - Thêm UI cho các chức năng AI
- `src/app/english/writing/components/` - Tạo components mới

## 📁 Cấu trúc files đã tạo

```
src/
├── lib/
│   ├── gemini.ts                    # Gemini API wrapper
│   └── prompts/
│       └── writing.ts               # Prompt templates
│
├── app/api/writing/
│   ├── outline/route.ts             # ✅ Outline generator
│   ├── brainstorm/route.ts          # ✅ Brainstorm ideas
│   ├── language-pack/route.ts       # ✅ Vocabulary & phrases
│   ├── rephrase/route.ts            # ✅ Paraphrase tool
│   ├── hints/route.ts               # ✅ Grammar hints
│   ├── thesis/route.ts              # ✅ Thesis generator
│   ├── expand/route.ts              # ✅ Sentence expander
│   ├── summarize/route.ts           # ✅ Self-review
│   └── next-task/route.ts           # ✅ Adaptive tasks
│
.env.example                         # Template cho API key
GEMINI_SETUP.md                      # Hướng dẫn setup chi tiết
LLM_FEATURES_GUIDE.md                # Hướng dẫn tích hợp đầy đủ
```

## 🎨 UI Implementation Examples

### 1. Outline Button

Thêm vào `src/app/english/writing/page.tsx`:

```typescript
const [outline, setOutline] = useState(null);
const [loadingOutline, setLoadingOutline] = useState(false);

const generateOutline = async () => {
  if (!selectedTask) return;
  
  setLoadingOutline(true);
  try {
    const res = await fetch('/api/writing/outline', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        level: selectedTask.level,
        type: selectedTask.type,
        topic: selectedTask.prompt
      })
    });
    
    const data = await res.json();
    setOutline(data);
    toast.success('Outline generated!');
  } catch (error) {
    toast.error('Failed to generate outline');
  } finally {
    setLoadingOutline(false);
  }
};

// In JSX:
<button onClick={generateOutline} disabled={loadingOutline}>
  {loadingOutline ? '⏳ Generating...' : '📝 Generate Outline'}
</button>
```

### 2. Brainstorm Panel

```typescript
const [ideas, setIdeas] = useState([]);

const brainstormIdeas = async () => {
  const res = await fetch('/api/writing/brainstorm', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      level: selectedTask.level,
      type: selectedTask.type,
      topic: selectedTask.prompt
    })
  });
  
  const data = await res.json();
  setIdeas(data.ideas);
};

// In JSX:
<aside className="brainstorm-sidebar">
  <button onClick={brainstormIdeas}>💡 Brainstorm</button>
  {ideas.map(idea => (
    <div key={idea.point} className="idea-card">
      <h4>{idea.point}</h4>
      <p>{idea.explanation}</p>
    </div>
  ))}
</aside>
```

### 3. Grammar Hints

```typescript
const [hints, setHints] = useState(null);

const checkGrammar = async () => {
  const res = await fetch('/api/writing/hints', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      text: text,
      level: selectedTask.level
    })
  });
  
  const data = await res.json();
  setHints(data);
};

// Display hints:
{hints?.grammarHints.map(hint => (
  <div className="hint-card" key={hint.location}>
    <strong>{hint.issue}</strong>
    <p>{hint.hint}</p>
    <small>{hint.explanation}</small>
  </div>
))}
```

## 📊 API Response Examples

### Outline Response
```json
{
  "outline": [
    {
      "section": "Introduction",
      "points": [
        "Hook: Rising costs of education",
        "Background: Current state of tuition",
        "Thesis: Free education benefits society"
      ]
    },
    {
      "section": "Body 1",
      "points": [
        "Topic: Equal access to education",
        "Support: Statistics on enrollment",
        "Example: Nordic countries model"
      ]
    }
  ],
  "thesisOptions": [
    "University education should be free because...",
    "While free education has benefits, it also...",
    "The government should subsidize education for..."
  ]
}
```

### Brainstorm Response
```json
{
  "ideas": [
    {
      "point": "Economic benefits",
      "explanation": "More educated workforce drives economy"
    },
    {
      "point": "Social equality",
      "explanation": "Removes financial barriers to education"
    }
  ],
  "examples": [
    {
      "idea": "Economic benefits",
      "example": "Germany's free university system produces skilled engineers"
    }
  ],
  "counterpoints": [
    "May increase tax burden on citizens",
    "Could lower university quality"
  ]
}
```

## ⚠️ Important Notes

1. **API Key Security**
   - ✅ API key chỉ dùng ở server-side (API routes)
   - ✅ Không bao giờ expose ra client
   - ✅ Đã có trong .gitignore

2. **Cost Management**
   - Free tier: 60 requests/minute
   - Monitor usage: https://makersuite.google.com/
   - Mỗi feature = 1 API call

3. **Error Handling**
   - Luôn có try-catch
   - Show user-friendly errors
   - Fallback nếu API fail

## 🔗 Useful Links

- **Gemini API Key**: https://makersuite.google.com/app/apikey
- **Gemini Docs**: https://ai.google.dev/docs
- **Pricing**: https://ai.google.dev/pricing

## 📞 Support

Nếu gặp lỗi:
1. Check `.env.local` có đúng format không
2. Restart dev server
3. Check console logs
4. Xem `GEMINI_SETUP.md` troubleshooting section

---

**Ready to go!** 🎉

Follow bước 1-3 ở trên, test API, rồi từ từ tích hợp UI theo thứ tự priority của bạn.

