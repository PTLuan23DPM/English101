import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { CEFRLevel, ActivityType } from "@prisma/client";

/**
 * @swagger
 * /api/reading/activities:
 *   get:
 *     summary: Get reading activities
 *     tags: [Reading]
 *     parameters:
 *       - in: query
 *         name: level
 *         schema:
 *           type: string
 *         description: CEFR level filter
 *     responses:
 *       200:
 *         description: List of reading activities
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
        skill: "READING",
        ...(level && { level: level as CEFRLevel }),
        ...(type && { type: type as ActivityType }),
      },
      include: {
        unit: {
          select: {
            title: true,
            level: true,
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
      })),
    });
  } catch (error) {
    console.error("Error fetching reading activities:", error);
    return NextResponse.json(
      { error: "Failed to fetch activities" },
      { status: 500 }
    );
  }
}

