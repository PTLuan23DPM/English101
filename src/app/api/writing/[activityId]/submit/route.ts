import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

/**
 * @swagger
 * /api/writing/{activityId}/submit:
 *   post:
 *     summary: Submit writing response for grading
 *     tags: [Writing]
 *     parameters:
 *       - in: path
 *         name: activityId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               questionId:
 *                 type: string
 *               text:
 *                 type: string
 *               startTime:
 *                 type: string
 *                 format: date-time
 *               timeTaken:
 *                 type: number
 *                 description: Time taken in seconds
 *     responses:
 *       200:
 *         description: Writing graded with detailed feedback
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Activity not found
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ activityId: string }> }
) {
  try {
    const { activityId } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { questionId, text, startTime } = await req.json();

    if (!text || text.trim().length === 0) {
      return NextResponse.json({ error: "No text provided" }, { status: 400 });
    }

    // Validate activity and question
    const activity = await prisma.activity.findUnique({
      where: { id: activityId },
      include: {
        questions: true,
      },
    });

    if (!activity) {
      return NextResponse.json({ error: "Activity not found" }, { status: 404 });
    }

    const question = activity.questions.find((q) => q.id === questionId);
    if (!question) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 });
    }

    // Create or find attempt
    let attempt = await prisma.attempt.findFirst({
      where: {
        userId: user.id,
        activityId: activity.id,
        status: { in: ['started', 'submitted'] },
      },
    });

    if (!attempt) {
      attempt = await prisma.attempt.create({
        data: {
          userId: user.id,
          activityId: activity.id,
          startedAt: startTime ? new Date(startTime) : new Date(),
          status: 'submitted',
        },
      });
    }

    // TODO: Integrate AI grading (OpenAI GPT-4, custom model, etc.)
    // For now, we'll use mock grading
    const feedback = await mockGradeWriting(text);

    // Save submission
    await prisma.submission.create({
      data: {
        attemptId: attempt.id,
        userId: user.id,
        questionId: question.id,
        answerText: text,
        score: feedback.score,
        feedback: JSON.stringify(feedback),
      },
    });

    // Update attempt
    const totalScore = await prisma.submission.aggregate({
      where: { attemptId: attempt.id },
      _sum: { score: true },
    });

    await prisma.attempt.update({
      where: { id: attempt.id },
      data: {
        score: totalScore._sum.score || 0,
        submittedAt: new Date(),
        status: 'graded',
      },
    });

    return NextResponse.json({
      success: true,
      feedback,
      attempt: {
        id: attempt.id,
        totalScore: totalScore._sum.score || 0,
        maxScore: activity.maxScore,
      },
    });
  } catch (error) {
    console.error("Error submitting writing activity:", error);
    return NextResponse.json(
      { error: "Failed to submit activity" },
      { status: 500 }
    );
  }
}

// Mock grading function
// TODO: Replace with real AI grading
async function mockGradeWriting(
  text: string
): Promise<{
  score: number;
  taskResponse: number;
  coherence: number;
  lexicalResource: number;
  grammaticalRange: number;
  overallFeedback: string;
  strengths: string[];
  weaknesses: string[];
  grammarErrors: Array<{ error: string; correction: string; explanation: string }>;
  vocabularySuggestions: Array<{ word: string; betterWord: string; context: string }>;
}> {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 2000));

  const wordCount = text.split(/\s+/).length;
  const sentenceCount = text.split(/[.!?]+/).filter(s => s.trim()).length;
  const avgWordsPerSentence = wordCount / Math.max(sentenceCount, 1);

  // Mock scoring based on basic metrics
  const hasGoodLength = wordCount >= 50 && wordCount <= 300;
  const hasGoodStructure = avgWordsPerSentence >= 8 && avgWordsPerSentence <= 25;

  const taskResponse = Math.floor(Math.random() * 20) + (hasGoodLength ? 75 : 60);
  const coherence = Math.floor(Math.random() * 20) + (hasGoodStructure ? 70 : 60);
  const lexicalResource = Math.floor(Math.random() * 20) + 70;
  const grammaticalRange = Math.floor(Math.random() * 20) + 65;

  const totalScore = Math.round((taskResponse + coherence + lexicalResource + grammaticalRange) / 4);

  return {
    score: Math.min(totalScore, 100),
    taskResponse,
    coherence,
    lexicalResource,
    grammaticalRange,
    overallFeedback: totalScore >= 80
      ? "Excellent writing! Your response is well-structured and addresses the prompt effectively."
      : totalScore >= 70
        ? "Good work! Your writing is clear, but there's room for improvement in vocabulary and grammar."
        : totalScore >= 60
          ? "Fair effort. Focus on task response and coherence. Practice writing more complex sentences."
          : "Keep practicing! Review grammar basics and try to organize your ideas more clearly.",
    strengths: [
      taskResponse >= 75 ? "Clear response to the prompt" : null,
      coherence >= 75 ? "Well-organized paragraphs" : null,
      lexicalResource >= 75 ? "Good vocabulary range" : null,
      grammaticalRange >= 75 ? "Varied sentence structures" : null,
      hasGoodLength ? "Appropriate word count" : null,
    ].filter(Boolean) as string[],
    weaknesses: [
      taskResponse < 70 ? "Doesn't fully address all parts of the prompt" : null,
      coherence < 70 ? "Ideas could be better connected" : null,
      lexicalResource < 70 ? "Limited vocabulary range" : null,
      grammaticalRange < 70 ? "Grammar errors affect clarity" : null,
      !hasGoodLength ? "Word count outside recommended range" : null,
      !hasGoodStructure ? "Sentences are too simple or too complex" : null,
    ].filter(Boolean) as string[],
    grammarErrors: [
      {
        error: "I am going to school yesterday",
        correction: "I went to school yesterday",
        explanation: "Use past simple tense for completed past actions",
      },
      {
        error: "There is many people",
        correction: "There are many people",
        explanation: "Use 'are' with plural nouns",
      },
    ],
    vocabularySuggestions: [
      {
        word: "good",
        betterWord: "excellent / beneficial / valuable",
        context: "Use more specific adjectives",
      },
      {
        word: "very",
        betterWord: "extremely / particularly / significantly",
        context: "Avoid overusing 'very'",
      },
    ],
  };
}

/**
 * INTEGRATION GUIDE FOR REAL AI GRADING:
 * 
 * 1. OpenAI GPT-4 (Recommended):
 * 
 * ```typescript
 * import OpenAI from 'openai';
 * const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
 * 
 * async function gradeWriting(text: string, prompt: string, level: string) {
 *   const response = await openai.chat.completions.create({
 *     model: "gpt-4",
 *     messages: [{
 *       role: "system",
 *       content: `You are an expert English teacher grading ${level} level student writing.
 *       
 *       Evaluate the writing on:
 *       1. Task Response (0-100): How well it addresses the prompt
 *       2. Coherence & Cohesion (0-100): Organization and logical flow
 *       3. Lexical Resource (0-100): Vocabulary range and accuracy
 *       4. Grammatical Range & Accuracy (0-100): Grammar correctness and variety
 *       
 *       Also provide:
 *       - Overall feedback (2-3 sentences)
 *       - 3-5 specific strengths
 *       - 3-5 specific weaknesses
 *       - Grammar errors with corrections and explanations
 *       - Vocabulary suggestions with better alternatives
 *       
 *       Return as JSON.`
 *     }, {
 *       role: "user",
 *       content: `Prompt: ${prompt}\n\nStudent's writing:\n${text}\n\nPlease grade this writing.`
 *     }],
 *     temperature: 0.3,
 *     response_format: { type: "json_object" }
 *   });
 *   
 *   return JSON.parse(response.choices[0].message.content);
 * }
 * ```
 * 
 * 2. Custom Model (If you have trained model):
 * 
 * ```typescript
 * async function gradeWithCustomModel(text: string, prompt: string) {
 *   const response = await fetch('http://your-ml-api:5000/grade-writing', {
 *     method: 'POST',
 *     headers: { 'Content-Type': 'application/json' },
 *     body: JSON.stringify({ text, prompt }),
 *   });
 *   return response.json();
 * }
 * ```
 * 
 * 3. Grammarly API (Commercial):
 * 
 * ```typescript
 * import { GrammarlyClient } from '@grammarly/api';
 * 
 * async function checkGrammar(text: string) {
 *   const client = new GrammarlyClient({ apiKey: process.env.GRAMMARLY_API_KEY });
 *   const results = await client.check(text);
 *   return results.alerts; // Grammar errors
 * }
 * ```
 * 
 * 4. Hybrid Approach (Combine multiple tools):
 * 
 * ```typescript
 * async function comprehensiveGrade(text: string, prompt: string, level: string) {
 *   // Use Grammarly for grammar checking
 *   const grammarErrors = await checkGrammar(text);
 *   
 *   // Use GPT-4 for overall feedback and scoring
 *   const aiGrade = await gradeWithGPT4(text, prompt, level);
 *   
 *   // Use language-tool for additional checks
 *   const languageErrors = await checkWithLanguageTool(text);
 *   
 *   return {
 *     ...aiGrade,
 *     grammarErrors: [...grammarErrors, ...languageErrors],
 *   };
 * }
 * ```
 */

