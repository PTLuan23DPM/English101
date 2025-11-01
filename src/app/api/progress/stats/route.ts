import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user info
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        cefrLevel: true,
        streak: true,
        longestStreak: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get all activities
    const activities = await prisma.userActivity.findMany({
      where: { userId: session.user.id },
      orderBy: { date: "desc" },
      take: 50,
    });

    // Calculate skill breakdown
    const skillBreakdown: Record<string, number> = {
      reading: 0,
      writing: 0,
      listening: 0,
      speaking: 0,
      grammar: 0,
      vocabulary: 0,
    };

    activities.forEach((activity) => {
      const skill = activity.skill.toLowerCase();
      if (skill in skillBreakdown) {
        skillBreakdown[skill]++;
      }
    });

    // Get completed activities count
    const completedActivities = activities.filter(
      (a) => a.completed
    ).length;

    // Format recent activities
    const recentActivities = activities.slice(0, 10).map((activity) => ({
      date: activity.date.toISOString(),
      skill: activity.skill,
      activityType: activity.activityType,
      score: activity.score,
    }));

    return NextResponse.json({
      cefrLevel: user.cefrLevel || "A1",
      totalActivities: activities.length,
      completedActivities,
      streak: user.streak || 0,
      longestStreak: user.longestStreak || 0,
      skillBreakdown,
      recentActivities,
    });
  } catch (error: any) {
    console.error("Get progress stats error:", error);
    return NextResponse.json(
      { error: "Failed to get progress stats", details: error.message },
      { status: 500 }
    );
  }
}

// POST endpoint to record activity
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { skill, activityType, duration, score, completed, metadata } = body;

    if (!skill || !activityType) {
      return NextResponse.json(
        { error: "Skill and activity type are required" },
        { status: 400 }
      );
    }

    // Create activity
    const activity = await prisma.userActivity.create({
      data: {
        userId: session.user.id,
        skill,
        activityType,
        duration: duration || null,
        score: score || null,
        completed: completed !== undefined ? completed : false,
        metadata: metadata || null,
      },
    });

    // Update user's lastActive and streak
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { lastActive: true, streak: true, longestStreak: true },
    });

    const now = new Date();
    const lastActive = user?.lastActive;
    let newStreak = user?.streak || 0;
    let newLongestStreak = user?.longestStreak || 0;

    if (lastActive) {
      const daysSinceLastActive = Math.floor(
        (now.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysSinceLastActive === 1) {
        // Consecutive day
        newStreak += 1;
      } else if (daysSinceLastActive === 0) {
        // Same day, keep streak
        newStreak = user?.streak || 0;
      } else {
        // Streak broken
        newStreak = 1;
      }
    } else {
      // First activity
      newStreak = 1;
    }

    if (newStreak > newLongestStreak) {
      newLongestStreak = newStreak;
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        lastActive: now,
        streak: newStreak,
        longestStreak: newLongestStreak,
      },
    });

    return NextResponse.json({
      success: true,
      activity,
      streak: newStreak,
    });
  } catch (error: any) {
    console.error("Record activity error:", error);
    return NextResponse.json(
      { error: "Failed to record activity", details: error.message },
      { status: 500 }
    );
  }
}
