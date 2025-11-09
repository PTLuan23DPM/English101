# Gemini API Setup Guide

This project uses Google's Gemini AI to power advanced writing assistance features.

## Features Enabled by Gemini

1. **Outline Generator** - AI-generated essay structures
2. **Brainstorming** - Ideas, examples, and counterpoints
3. **Language Pack** - Level-appropriate vocabulary and phrases
4. **Paraphrase Tool** - Rephrase text with different styles
5. **Grammar Hints** - Intelligent writing suggestions
6. **Thesis Generator** - Strong thesis statement options
7. **Sentence Expander** - Develop ideas with reasons/examples
8. **Self-Review** - Summarize and check if on-topic
9. **Adaptive Tasks** - Personalized next task recommendations

## Setup Instructions

### 1. Get Your Gemini API Key

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the generated key

### 2. Configure Your Environment

1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. Open `.env.local` and add your API key:
   ```env
   GEMINI_API_KEY=your-actual-api-key-here
   ```

3. Save the file

### 3. Restart Your Development Server

```bash
npm run dev
```

## Usage

Once configured, all LLM features will be available in the Writing section:

- Click **"AI Assistant"** button for grammar hints
- Click **"Outline"** for essay structure generation
- Click **"Brainstorm"** for idea generation
- Select text and click **"Rephrase"** for alternative phrasings
- And more!

## API Endpoints

All endpoints are available at `/api/writing/*`:

- `POST /api/writing/outline` - Generate essay outline
- `POST /api/writing/brainstorm` - Brainstorm ideas
- `GET /api/writing/language-pack` - Get language resources
- `POST /api/writing/rephrase` - Rephrase text
- `POST /api/writing/hints` - Grammar and coherence hints
- `POST /api/writing/thesis` - Generate thesis statements
- `POST /api/writing/expand` - Expand sentences
- `POST /api/writing/summarize` - Summarize and review
- `POST /api/writing/next-task` - Get next recommended task

## Troubleshooting

### "Gemini API is not configured" Error

- Make sure you've created `.env.local` (not `.env`)
- Verify your API key is correct (no extra spaces)
- Restart your development server

### API Rate Limits

Gemini API has rate limits. If you hit them:
- Wait a few minutes and try again
- Consider upgrading your API plan
- Implement caching in production

### Response Parsing Errors

If you see JSON parsing errors:
- The AI response format might have changed
- Check the console for the raw response
- Adjust prompts in `src/lib/prompts/writing.ts` if needed

## Security Notes

- **Never commit `.env.local`** to version control
- The API key gives access to your Gemini account
- Keep it secret and rotate it if exposed
- In production, use environment variables from your hosting platform

## Cost Considerations

- Gemini API has a free tier with generous limits
- Monitor your usage in [Google AI Studio](https://makersuite.google.com/)
- Each feature makes 1 API call per use
- Average cost per student session: very low (< $0.01)

## Further Reading

- [Gemini API Documentation](https://ai.google.dev/docs)
- [Pricing Information](https://ai.google.dev/pricing)
- [Best Practices](https://ai.google.dev/docs/best_practices)

