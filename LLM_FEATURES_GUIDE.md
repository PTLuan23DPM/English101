# LLM Features Integration Guide

## Quick Start

1. **Get Gemini API Key**: https://makersuite.google.com/app/apikey
2. **Create `.env.local`**: Copy from `.env.example`
3. **Add your key**: `GEMINI_API_KEY=your-key-here`
4. **Restart server**: `npm run dev`

## Features Overview

### ✅ Already Implemented (Backend)

All API endpoints are ready to use:

| Feature | Endpoint | Method | Description |
|---------|----------|--------|-------------|
| Outline Generator | `/api/writing/outline` | POST | Generate essay structure |
| Brainstorm | `/api/writing/brainstorm` | POST | Ideas & examples |
| Language Pack | `/api/writing/language-pack` | GET | Vocabulary & phrases |
| Rephrase | `/api/writing/rephrase` | POST | Rewrite with different style |
| Grammar Hints | `/api/writing/hints` | POST | Grammar & coherence tips |
| Thesis Generator | `/api/writing/thesis` | POST | Thesis statement options |
| Sentence Expander | `/api/writing/expand` | POST | Expand ideas |
| Self-Review | `/api/writing/summarize` | POST | Summary & on-topic check |
| Next Task | `/api/writing/next-task` | POST | Adaptive recommendation |

### 🔧 Need Frontend Implementation

These features need UI components in `src/app/english/writing/page.tsx`:

- [ ] Outline panel with drag-drop
- [ ] Brainstorm sidebar
- [ ] Language pack floating panel
- [ ] Rephrase context menu
- [ ] Hints inline markers
- [ ] Thesis selection dialog
- [ ] Expander button on selection
- [ ] Review modal after submission
- [ ] Next task recommendation card

## API Usage Examples

### 1. Outline Generator

```typescript
const response = await fetch('/api/writing/outline', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    level: 'B2',
    type: 'Opinion Essay',
    topic: 'Should university education be free?'
  })
});

const data = await response.json();
// data.outline: Array of sections with points
// data.thesisOptions: Array of thesis statements
```

### 2. Brainstorm

```typescript
const response = await fetch('/api/writing/brainstorm', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    level: 'B1',
    type: 'Discussion',
    topic: 'Working from home vs office'
  })
});

const data = await response.json();
// data.ideas: [{point, explanation}, ...]
// data.examples: [{idea, example}, ...]
// data.counterpoints: [...]
```

### 3. Language Pack

```typescript
const response = await fetch(
  '/api/writing/language-pack?level=B2&type=Argumentative'
);

const data = await response.json();
// data.phrases: [...]
// data.discourseMarkers: {contrast, addition, cause, example}
// data.collocations: [...]
// data.sentenceStarters: [...]
```

### 4. Rephrase

```typescript
const response = await fetch('/api/writing/rephrase', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    text: 'The government should provide free education.',
    style: 'academic', // or 'simple', 'formal'
    targetLevel: 'B2'
  })
});

const data = await response.json();
// data.options: [{text, notes}, {text, notes}, {text, notes}]
```

### 5. Grammar Hints

```typescript
const response = await fetch('/api/writing/hints', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    text: 'I am agree with this opinion because it have many benefits.',
    level: 'B1'
  })
});

const data = await response.json();
// data.grammarHints: [{location, issue, hint, explanation}, ...]
// data.coherenceHints: [{location, issue, suggestion, example}, ...]
```

### 6. Thesis Generator

```typescript
const response = await fetch('/api/writing/thesis', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    level: 'B2',
    type: 'Opinion',
    topic: 'Should governments ban single-use plastics?',
    stance: 'agree' // optional
  })
});

const data = await response.json();
// data.options: [{thesis, mainPoints, approach}, ...]
```

### 7. Sentence Expander

```typescript
const response = await fetch('/api/writing/expand', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    sentence: 'Climate change is a serious problem.',
    mode: 'reason' // or 'example', 'contrast'
  })
});

const data = await response.json();
// data.expansions: [{text, explanation}, ...]
```

### 8. Self-Review

```typescript
const response = await fetch('/api/writing/summarize', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    text: userWriting,
    topic: 'Original essay prompt'
  })
});

const data = await response.json();
// data.summary: string
// data.mainPoints: [...]
// data.onTopicScore: number (0-10)
// data.onTopicExplanation: string
// data.feedback: string
```

### 9. Next Task Recommendation

```typescript
const response = await fetch('/api/writing/next-task', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: session.user.id,
    level: 'B1',
    lastScore: 6.5,
    errorProfile: {
      taskResponse: 7.0,
      coherence: 6.0,
      lexical: 6.5,
      grammar: 7.0
    }
  })
});

const data = await response.json();
// data.recommendedTask: {type, level, focusAreas, reasoning}
// data.specificSuggestions: [...]
```

## Frontend Integration Checklist

### Phase 1: Basic Integration
- [ ] Add Gemini API key to `.env.local`
- [ ] Test all API endpoints
- [ ] Add "AI Features" button to writing page
- [ ] Implement outline generator UI
- [ ] Implement brainstorm panel

### Phase 2: Advanced Features
- [ ] Language pack floating toolbar
- [ ] Text selection → Rephrase menu
- [ ] Inline grammar hints with tooltips
- [ ] Thesis generator modal
- [ ] Sentence expander on selection

### Phase 3: Polish
- [ ] Self-review modal after submit
- [ ] Next task recommendation card
- [ ] Loading states for all AI features
- [ ] Error handling and retry logic
- [ ] Rate limiting UI feedback

### Phase 4: Enhancement
- [ ] Save generated outlines to database
- [ ] Track which AI features users use most
- [ ] A/B test different prompts
- [ ] Add user feedback buttons ("helpful/not helpful")

## UI Component Suggestions

### Outline Generator
```typescript
<button onClick={async () => {
  const data = await generateOutline(task.level, task.type, task.prompt);
  setOutline(data.outline);
  setShowOutlineModal(true);
}}>
  📝 Generate Outline
</button>
```

### Brainstorm Panel
```typescript
<aside className="brainstorm-panel">
  <h3>💡 Ideas</h3>
  {ideas.map(idea => (
    <div key={idea.point} className="idea-card">
      <strong>{idea.point}</strong>
      <p>{idea.explanation}</p>
      <button onClick={() => insertIdea(idea)}>Add to essay</button>
    </div>
  ))}
</aside>
```

### Rephrase Menu
```typescript
{selectedText && (
  <div className="rephrase-popup" style={{top, left}}>
    <button onClick={() => rephrase(selectedText, 'simple')}>
      Simplify
    </button>
    <button onClick={() => rephrase(selectedText, 'academic')}>
      Make Academic
    </button>
    <button onClick={() => rephrase(selectedText, 'formal')}>
      Make Formal
    </button>
  </div>
)}
```

## Best Practices

1. **Loading States**: Always show loading indicator during API calls
2. **Error Handling**: Gracefully handle API failures
3. **Caching**: Cache language packs and outlines locally
4. **Rate Limiting**: Implement client-side rate limiting
5. **User Feedback**: Let users rate AI suggestions
6. **Progressive Enhancement**: Features work without AI if API fails

## Performance Tips

- Use `React.memo()` for AI feature components
- Debounce grammar hint calls (500ms after typing stops)
- Cache language pack for current level/type
- Lazy load AI features (code splitting)
- Show skeleton loaders during generation

## Security Considerations

- ✅ API key is server-side only (in API routes)
- ✅ No direct client-to-Gemini calls
- ✅ Rate limiting on API routes (implement if needed)
- ✅ Input validation and sanitization
- ⚠️ Consider implementing usage quotas per user

## Cost Optimization

- Cache frequently requested data (language packs)
- Implement local grammar check before calling AI
- Batch multiple requests when possible
- Set reasonable max token limits
- Monitor usage in Google AI Studio

## Next Steps

1. Follow `GEMINI_SETUP.md` to configure API key
2. Test each endpoint using the examples above
3. Implement UI components one by one
4. Test with real users and iterate
5. Monitor costs and usage patterns

