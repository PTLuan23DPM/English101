import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

/**
 * @swagger
 * /api/speaking/{activityId}/submit:
 *   post:
 *     summary: Submit audio recording for speaking activity
 *     tags: [Speaking]
 *     parameters:
 *       - in: path
 *         name: activityId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               questionId:
 *                 type: string
 *               audio:
 *                 type: string
 *                 format: binary
 *               duration:
 *                 type: number
 *     responses:
 *       200:
 *         description: Audio uploaded and analyzed
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Activity not found
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { activityId: string } }
) {
  try {
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

    const formData = await req.formData();
    const questionId = formData.get("questionId") as string;
    const audioFile = formData.get("audio") as File | null;
    const duration = parseInt(formData.get("duration") as string) || 0;
    const startTime = formData.get("startTime") as string;

    if (!audioFile) {
      return NextResponse.json({ error: "No audio file provided" }, { status: 400 });
    }

    // Validate activity and question
    const activity = await prisma.activity.findUnique({
      where: { id: params.activityId },
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

    // Save audio file
    const bytes = await audioFile.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    // Create recordings directory if it doesn't exist
    const recordingsDir = join(process.cwd(), "public", "recordings");
    if (!existsSync(recordingsDir)) {
      await mkdir(recordingsDir, { recursive: true });
    }
    
    const filename = `recording-${user.id}-${Date.now()}.webm`;
    const filepath = join(recordingsDir, filename);
    await writeFile(filepath, buffer);

    const audioUrl = `/recordings/${filename}`;

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

    // Save recording to database
    const recording = await prisma.recording.create({
      data: {
        userId: user.id,
        activityId: activity.id,
        url: audioUrl,
        durationS: duration,
        format: 'webm',
      },
    });

    // TODO: Integrate Speech-to-Text (OpenAI Whisper or other service)
    // For now, we'll use mock transcription
    const transcription = await mockTranscribe(audioUrl);

    // TODO: Integrate AI grading (pronunciation, fluency, grammar, vocabulary)
    // For now, we'll use mock grading
    const feedback = await mockGradeSpeaking(transcription, question.prompt, activity.level);

    // Save submission
    await prisma.submission.create({
      data: {
        attemptId: attempt.id,
        userId: user.id,
        questionId: question.id,
        answerText: transcription,
        score: feedback.score,
        feedback: JSON.stringify(feedback),
        recordingId: recording.id,
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
      recording: {
        id: recording.id,
        url: audioUrl,
        duration,
      },
      transcription,
      feedback,
    });
  } catch (error) {
    console.error("Error submitting speaking activity:", error);
    return NextResponse.json(
      { error: "Failed to submit activity" },
      { status: 500 }
    );
  }
}

// Mock transcription function
// TODO: Replace with real API call to OpenAI Whisper or similar
async function mockTranscribe(audioUrl: string): Promise<string> {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 1000));
  
  return "Hello, my name is John and I'm learning English. I enjoy reading books and watching movies in English to improve my language skills.";
}

// Mock grading function
// TODO: Replace with real AI grading (OpenAI, custom model, etc.)
async function mockGradeSpeaking(
  transcription: string,
  prompt: string,
  level: string
): Promise<{
  score: number;
  pronunciation: number;
  fluency: number;
  grammar: number;
  vocabulary: number;
  feedback: string;
  suggestions: string[];
}> {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 1500));

  const wordCount = transcription.split(" ").length;
  const hasGoodLength = wordCount >= 20 && wordCount <= 100;
  
  // Mock scores
  const pronunciation = Math.floor(Math.random() * 20) + 75; // 75-95
  const fluency = Math.floor(Math.random() * 20) + 70; // 70-90
  const grammar = Math.floor(Math.random() * 20) + 65; // 65-85
  const vocabulary = Math.floor(Math.random() * 20) + 70; // 70-90
  
  const totalScore = Math.round((pronunciation + fluency + grammar + vocabulary) / 4);

  return {
    score: Math.min(totalScore, 100),
    pronunciation,
    fluency,
    grammar,
    vocabulary,
    feedback: totalScore >= 80
      ? "Excellent work! Your speaking is clear and well-structured."
      : totalScore >= 70
      ? "Good job! Keep practicing to improve fluency."
      : "Keep working on your pronunciation and grammar.",
    suggestions: [
      pronunciation < 80 ? "Work on pronunciation of specific sounds" : null,
      fluency < 75 ? "Practice speaking more smoothly without long pauses" : null,
      grammar < 70 ? "Review grammar rules for this level" : null,
      vocabulary < 75 ? "Try to use more varied vocabulary" : null,
      !hasGoodLength ? "Try to speak for the recommended duration" : null,
    ].filter(Boolean) as string[],
  };
}

/**
 * INTEGRATION GUIDE FOR REAL AI:
 * 
 * 1. OpenAI Whisper (Speech-to-Text):
 * 
 * ```typescript
 * import OpenAI from 'openai';
 * const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
 * 
 * async function transcribeAudio(filepath: string) {
 *   const transcription = await openai.audio.transcriptions.create({
 *     file: fs.createReadStream(filepath),
 *     model: "whisper-1",
 *     language: "en",
 *   });
 *   return transcription.text;
 * }
 * ```
 * 
 * 2. OpenAI GPT-4 (Grading & Feedback):
 * 
 * ```typescript
 * async function gradeSpeaking(transcription: string, prompt: string, level: string) {
 *   const response = await openai.chat.completions.create({
 *     model: "gpt-4",
 *     messages: [{
 *       role: "system",
 *       content: `You are an English teacher grading a ${level} level student's speaking.
 *       Evaluate: pronunciation (inferred from text quality), fluency, grammar, vocabulary.
 *       Return JSON with scores (0-100) and feedback.`
 *     }, {
 *       role: "user",
 *       content: `Prompt: ${prompt}\n\nTranscription: ${transcription}\n\nGrade this response.`
 *     }],
 *     response_format: { type: "json_object" }
 *   });
 *   return JSON.parse(response.choices[0].message.content);
 * }
 * ```
 * 
 * 3. Local Model (If you have your own):
 * 
 * ```typescript
 * async function gradeWithLocalModel(audioUrl: string) {
 *   const response = await fetch('http://your-model-api:5000/grade-speaking', {
 *     method: 'POST',
 *     body: JSON.stringify({ audioUrl }),
 *   });
 *   return response.json();
 * }
 * ```
 */

