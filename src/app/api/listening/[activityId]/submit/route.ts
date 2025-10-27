import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

interface AnswerSubmission {
  questionId: string;
  chosenIds: string[];
  answerText?: string;
}

/**
 * @swagger
 * /api/listening/{activityId}/submit:
 *   post:
 *     summary: Submit answers for listening activity and get grading
 *     tags: [Listening]
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
 *               answers:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     questionId:
 *                       type: string
 *                     chosenIds:
 *                       type: array
 *                       items:
 *                         type: string
 *                     answerText:
 *                       type: string
 *               startTime:
 *                 type: string
 *                 format: date-time
 *               listenCount:
 *                 type: number
 *                 description: Number of times audio was played
 *     responses:
 *       200:
 *         description: Graded results with feedback
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

    const { answers, startTime, listenCount = 1 } = await req.json() as {
      answers: AnswerSubmission[];
      startTime: string;
      listenCount?: number;
    };

    // Validate activity exists
    const activity = await prisma.activity.findUnique({
      where: { id: params.activityId },
      include: {
        questions: {
          include: {
            choices: true,
            answers: true,
          },
        },
      },
    });

    if (!activity) {
      return NextResponse.json({ error: "Activity not found" }, { status: 404 });
    }

    // Create attempt
    const attempt = await prisma.attempt.create({
      data: {
        userId: user.id,
        activityId: activity.id,
        startedAt: new Date(startTime),
        submittedAt: new Date(),
        status: 'submitted',
        meta: {
          listenCount, // Track how many times they listened
        },
      },
    });

    // Grade answers
    let totalScore = 0;
    const gradedAnswers = [];

    for (const answer of answers) {
      const question = activity.questions.find((q) => q.id === answer.questionId);
      if (!question) continue;

      // Get correct answers
      const correctAnswers = question.answers.map((a) => a.key);
      const correctChoices = question.choices
        .filter((c) => c.isCorrect)
        .map((c) => c.id);

      // Check if answer is correct
      let isCorrect = false;
      
      if (question.type === 'SINGLE_CHOICE' || question.type === 'TRUE_FALSE') {
        // Single choice: check if chosen answer matches correct answer
        const chosenChoice = question.choices.find((c) => c.id === answer.chosenIds[0]);
        isCorrect = chosenChoice?.isCorrect || false;
      } else if (question.type === 'MULTI_CHOICE') {
        // Multi choice: all correct answers must be selected, no wrong ones
        const chosenSet = new Set(answer.chosenIds);
        const correctSet = new Set(correctChoices);
        isCorrect =
          chosenSet.size === correctSet.size &&
          [...chosenSet].every((id) => correctSet.has(id));
      } else if (question.type === 'SHORT_TEXT' || question.type === 'GAP_FILL') {
        // Text answers: check against answer keys (case-insensitive)
        const userAnswer = answer.answerText?.toLowerCase().trim() || '';
        isCorrect = correctAnswers.some((key) =>
          key.toLowerCase().trim() === userAnswer
        );
      }

      const scoreEarned = isCorrect ? question.score : 0;
      totalScore += scoreEarned;

      // Create submission
      await prisma.submission.create({
        data: {
          attemptId: attempt.id,
          userId: user.id,
          questionId: question.id,
          chosenIds: answer.chosenIds,
          answerText: answer.answerText,
          isCorrect,
          score: scoreEarned,
        },
      });

      gradedAnswers.push({
        questionId: question.id,
        isCorrect,
        score: scoreEarned,
        maxScore: question.score,
        correctAnswer: question.type === 'SINGLE_CHOICE' || question.type === 'TRUE_FALSE'
          ? question.choices.find((c) => c.isCorrect)?.text
          : correctAnswers[0],
        explanation: question.explanation,
      });
    }

    // Update attempt with score and status
    await prisma.attempt.update({
      where: { id: attempt.id },
      data: {
        score: totalScore,
        status: 'graded',
      },
    });

    // Calculate percentage
    const percentage = activity.maxScore
      ? Math.round((totalScore / activity.maxScore) * 100)
      : 0;

    // Determine skill level based on performance
    let skillLevel = 'Beginner';
    if (percentage >= 90) skillLevel = 'Advanced';
    else if (percentage >= 75) skillLevel = 'Upper Intermediate';
    else if (percentage >= 60) skillLevel = 'Intermediate';
    else if (percentage >= 40) skillLevel = 'Elementary';

    return NextResponse.json({
      attemptId: attempt.id,
      totalScore,
      maxScore: activity.maxScore,
      percentage,
      skillLevel,
      listenCount,
      answers: gradedAnswers,
      feedback: {
        overall: percentage >= 70 
          ? 'Great job! Your listening comprehension is excellent.' 
          : percentage >= 50
          ? 'Good effort! Keep practicing to improve your listening skills.'
          : 'Keep working on your listening. Try to listen more actively and take notes.',
        suggestions: [
          listenCount === 1 && percentage < 60 
            ? 'Try listening to the audio multiple times to catch details you might have missed.'
            : null,
          percentage < 70
            ? 'Focus on understanding the main ideas first, then work on details.'
            : null,
          'Practice with different accents and speeds to improve comprehension.',
        ].filter(Boolean),
      },
    });
  } catch (error) {
    console.error("Error submitting listening activity:", error);
    return NextResponse.json(
      { error: "Failed to submit activity" },
      { status: 500 }
    );
  }
}

