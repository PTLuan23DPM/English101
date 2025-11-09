import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { handleError } from "@/lib/error-handler";

// GET: Lấy tiến trình học của user
export async function GET(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    const admin = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { role: true },
    });

    if (!admin || admin.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get user progress
    const progress = await prisma.userProgress.findMany({
      where: { userId: params.userId },
      include: {
        unit: {
          include: {
            module: {
              select: {
                title: true,
                type: true,
              },
            },
          },
        },
      },
      orderBy: { lastSeen: "desc" },
    });

    // Get recent attempts
    const recentAttempts = await prisma.attempt.findMany({
      where: { userId: params.userId },
      include: {
        activity: {
          select: {
            title: true,
            skill: true,
            level: true,
            maxScore: true,
          },
        },
      },
      orderBy: { submittedAt: "desc" },
      take: 10,
    });

    // Get statistics
    const stats = await prisma.userProgress.aggregate({
      where: { userId: params.userId },
      _count: true,
      _sum: {
        scoreSum: true,
      },
    });

    const completedCount = await prisma.userProgress.count({
      where: {
        userId: params.userId,
        status: "completed",
      },
    });

    const inProgressCount = await prisma.userProgress.count({
      where: {
        userId: params.userId,
        status: "in_progress",
      },
    });

    return NextResponse.json({
      success: true,
      progress: progress.map((p) => ({
        id: p.id,
        unitTitle: p.unit.title,
        moduleTitle: p.unit.module.title,
        moduleType: p.unit.module.type,
        skill: p.unit.skill,
        level: p.unit.level,
        status: p.status,
        scoreSum: p.scoreSum,
        lastSeen: p.lastSeen,
      })),
      recentAttempts: recentAttempts.map((a) => ({
        id: a.id,
        activityTitle: a.activity.title,
        skill: a.activity.skill,
        level: a.activity.level,
        score: a.score,
        maxScore: a.activity.maxScore,
        submittedAt: a.submittedAt,
      })),
      stats: {
        totalUnits: stats._count,
        completedUnits: completedCount,
        inProgressUnits: inProgressCount,
        totalScore: stats._sum.scoreSum || 0,
      },
    });
  } catch (error) {
    return handleError(error);
  }
}

