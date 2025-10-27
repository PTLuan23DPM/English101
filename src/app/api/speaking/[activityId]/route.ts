import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

/**
 * @swagger
 * /api/speaking/{activityId}:
 *   get:
 *     summary: Get speaking activity detail with prompts
 *     tags: [Speaking]
 *     parameters:
 *       - in: path
 *         name: activityId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Activity details with speaking prompts
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
        questions: {
          include: {
            media: {
              select: {
                id: true,
                url: true,
                type: true,
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

    // Format questions for speaking
    const prompts = activity.questions.map((q) => ({
      id: q.id,
      order: q.order,
      type: q.type,
      prompt: q.prompt,
      score: q.score,
      preparationTime: 30, // seconds to prepare
      recordingTime: 60, // seconds to record
      sampleAudio: q.media?.[0]?.url, // Optional sample answer
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
      },
      prompts,
    });
  } catch (error) {
    console.error("Error fetching speaking activity:", error);
    return NextResponse.json(
      { error: "Failed to fetch activity" },
      { status: 500 }
    );
  }
}

