import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

/**
 * @swagger
 * /api/listening/{activityId}:
 *   get:
 *     summary: Get listening activity detail with audio and questions
 *     tags: [Listening]
 *     parameters:
 *       - in: path
 *         name: activityId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Activity details with audio URL and questions
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Activity not found
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { activityId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const activity = await prisma.activity.findUnique({
      where: { id: params.activityId },
      include: {
        unit: {
          select: {
            title: true,
            level: true,
          },
        },
        media: {
          select: {
            id: true,
            url: true,
            type: true,
            durationS: true,
            meta: true,
          },
        },
        questions: {
          include: {
            choices: {
              orderBy: { order: 'asc' },
              select: {
                id: true,
                order: true,
                text: true,
                value: true,
                // Don't send isCorrect to client
              },
            },
            media: {
              select: {
                id: true,
                url: true,
                type: true,
                durationS: true,
              },
            },
          },
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!activity) {
      return NextResponse.json({ error: "Activity not found" }, { status: 404 });
    }

    // Sanitize questions - don't send correct answers
    const sanitizedQuestions = activity.questions.map((q) => ({
      id: q.id,
      order: q.order,
      type: q.type,
      prompt: q.prompt,
      score: q.score,
      audioUrl: q.media?.[0]?.url, // Audio specific to this question
      audioDuration: q.media?.[0]?.durationS,
      choices: q.choices,
    }));

    return NextResponse.json({
      activity: {
        id: activity.id,
        title: activity.title,
        instruction: activity.instruction,
        level: activity.level,
        type: activity.type,
        maxScore: activity.maxScore,
        timeLimitSec: activity.timeLimitSec,
        unitTitle: activity.unit.title,
        // Main audio for the activity
        audioUrl: activity.media[0]?.url,
        audioDuration: activity.media[0]?.durationS,
        audioMeta: activity.media[0]?.meta,
      },
      questions: sanitizedQuestions,
    });
  } catch (error) {
    console.error("Error fetching listening activity:", error);
    return NextResponse.json(
      { error: "Failed to fetch activity" },
      { status: 500 }
    );
  }
}

