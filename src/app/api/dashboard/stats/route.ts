import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        progress: {
          include: {
            unit: {
              select: {
                title: true,
                skill: true,
                level: true,
              },
            },
          },
          orderBy: {
            lastSeen: "desc",
          },
          take: 5,
        },
        attempts: {
          where: {
            status: "graded",
          },
          orderBy: {
            submittedAt: "desc",
          },
          take: 10,
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
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Calculate stats
    const totalAttempts = user.attempts.length;
    const completedUnits = user.progress.filter((p) => p.status === "completed").length;
    const inProgressUnits = user.progress.filter((p) => p.status === "in_progress").length;

    // Calculate average score
    const attemptsWithScore = user.attempts.filter((a) => a.score !== null);
    const avgScore = attemptsWithScore.length > 0
      ? Math.round(
          attemptsWithScore.reduce((sum, a) => sum + (a.score || 0), 0) /
            attemptsWithScore.length
        )
      : 0;

    // Calculate streak (simplified - count consecutive days with activity)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let streak = 0;
    let checkDate = new Date(today);

    // Get all activity dates
    const activityDates = user.attempts
      .filter((a) => a.submittedAt)
      .map((a) => {
        const d = new Date(a.submittedAt!);
        d.setHours(0, 0, 0, 0);
        return d.getTime();
      })
      .filter((v, i, a) => a.indexOf(v) === i) // unique dates
      .sort((a, b) => b - a); // descending

    // Count streak
    for (const activityDate of activityDates) {
      if (activityDate === checkDate.getTime()) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else if (activityDate < checkDate.getTime()) {
        break;
      }
    }

    // Skills breakdown
    const skillsBreakdown = user.attempts.reduce(
      (acc, attempt) => {
        const skill = attempt.activity.skill;
        if (!acc[skill]) {
          acc[skill] = { completed: 0, avgScore: 0, scores: [] };
        }
        acc[skill].completed++;
        if (attempt.score !== null) {
          acc[skill].scores.push(attempt.score);
        }
        return acc;
      },
      {} as Record<
        string,
        { completed: number; avgScore: number; scores: number[] }
      >
    );

    // Calculate average for each skill
    Object.keys(skillsBreakdown).forEach((skill) => {
      const scores = skillsBreakdown[skill].scores;
      if (scores.length > 0) {
        skillsBreakdown[skill].avgScore = Math.round(
          scores.reduce((a, b) => a + b, 0) / scores.length
        );
      }
    });

    return NextResponse.json({
      user: {
        name: user.name,
        email: user.email,
        image: user.image,
      },
      stats: {
        streak,
        completedUnits,
        inProgressUnits,
        totalAttempts,
        avgScore,
      },
      skillsBreakdown: Object.entries(skillsBreakdown).map(([skill, data]) => ({
        skill,
        completed: data.completed,
        avgScore: data.avgScore,
      })),
      recentProgress: user.progress.map((p) => ({
        id: p.id,
        unitTitle: p.unit.title,
        skill: p.unit.skill,
        level: p.unit.level,
        status: p.status,
        lastSeen: p.lastSeen,
      })),
      recentAttempts: user.attempts.map((a) => ({
        id: a.id,
        activityTitle: a.activity.title,
        skill: a.activity.skill,
        level: a.activity.level,
        score: a.score,
        maxScore: a.activity.maxScore,
        submittedAt: a.submittedAt,
      })),
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

