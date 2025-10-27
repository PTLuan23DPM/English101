import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

/**
 * @swagger
 * /api/listening/activities:
 *   get:
 *     summary: Get listening activities
 *     tags: [Listening]
 *     parameters:
 *       - in: query
 *         name: level
 *         schema:
 *           type: string
 *         description: CEFR level filter (A1, A2, B1, B2, C1, C2)
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *         description: Activity type filter
 *     responses:
 *       200:
 *         description: List of listening activities
 *       401:
 *         description: Unauthorized
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const level = searchParams.get("level");
    const type = searchParams.get("type");

    const activities = await prisma.activity.findMany({
      where: {
        skill: "LISTENING",
        ...(level && { level: level as any }),
        ...(type && { type: type as any }),
      },
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
            type: true,
            durationS: true,
            url: true,
          },
        },
        questions: {
          select: {
            id: true,
            order: true,
            type: true,
            score: true,
          },
        },
        _count: {
          select: {
            questions: true,
          },
        },
      },
      orderBy: [
        { level: 'asc' },
        { createdAt: 'desc' },
      ],
    });

    return NextResponse.json({
      activities: activities.map((activity) => ({
        id: activity.id,
        title: activity.title,
        instruction: activity.instruction,
        level: activity.level,
        type: activity.type,
        maxScore: activity.maxScore,
        timeLimitSec: activity.timeLimitSec,
        unitTitle: activity.unit.title,
        questionCount: activity._count.questions,
        audioDuration: activity.media[0]?.durationS || 0,
        hasAudio: activity.media.length > 0,
      })),
    });
  } catch (error) {
    console.error("Error fetching listening activities:", error);
    return NextResponse.json(
      { error: "Failed to fetch activities" },
      { status: 500 }
    );
  }
}

