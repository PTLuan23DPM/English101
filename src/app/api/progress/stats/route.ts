import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { updateStreakAfterActivity } from "@/lib/streak";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user info
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get CEFR level from placement test result
    const placementTest = await prisma.placementTestResult.findFirst({
      where: { userId: session.user.id },
      orderBy: { completedAt: "desc" },
      select: { cefrLevel: true },
    });

    // Get all completed attempts
    const attempts = await prisma.attempt.findMany({
      where: {
        userId: session.user.id,
        submittedAt: { not: null },
      },
      include: {
        activity: {
          select: {
            skill: true,
            type: true,
          },
        },
      },
      orderBy: { submittedAt: "desc" },
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

    attempts.forEach((attempt) => {
      const skill = attempt.activity.skill.toLowerCase();
      if (skill in skillBreakdown) {
        skillBreakdown[skill]++;
      }
    });

    // Calculate streak from attempts
    const { calculateStreakFromActivities } = await import("@/lib/streak");
    const { streak, longestStreak } = await calculateStreakFromActivities(session.user.id);

    // Format recent activities
    const recentActivities = attempts.slice(0, 10).map((attempt) => ({
      date: attempt.submittedAt?.toISOString() || new Date().toISOString(),
      skill: attempt.activity.skill,
      activityType: attempt.activity.type,
      score: attempt.score ? attempt.score / 10 : null, // Convert back to 0-10 scale
    }));

    return NextResponse.json({
      cefrLevel: placementTest?.cefrLevel || "A1",
      totalActivities: attempts.length,
      completedActivities: attempts.length,
      streak: streak,
      longestStreak: longestStreak,
      skillBreakdown,
      recentActivities,
    });
  } catch (error) {
    console.error("Get progress stats error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to get progress stats", details: errorMessage },
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

    // Get or create activity
    let activityId: string;
    try {
      const existing = await prisma.activity.findFirst({
        where: {
          skill: skill.toUpperCase() as any,
          title: `${skill} Practice`,
        },
        select: { id: true },
      });

      if (existing) {
        activityId = existing.id;
      } else {
        // Find a unit for this skill
        const unit = await prisma.unit.findFirst({
          where: {
            skill: skill.toUpperCase() as any,
          },
          select: { id: true },
        });

        if (!unit) {
          throw new Error(`No ${skill} unit found in database`);
        }

        // Map activityType to ActivityType enum
        const getActivityType = (skill: string, activityType: string): string => {
          const skillUpper = skill.toUpperCase();
          const typeUpper = activityType.toUpperCase();
          
          // Try to match activityType directly
          const activityTypes = [
            "LECTURE", "LISTEN_FIND_ERROR", "LISTEN_DETAIL", "LISTEN_GIST",
            "READ_MAIN_IDEA", "READ_INFER", "READ_SKIMMING",
            "WRITE_SENTENCE", "WRITE_PARAGRAPH", "WRITE_EMAIL", "WRITE_SHORT_ESSAY",
            "SPEAK_TOPIC", "SPEAK_ROLE_PLAY", "SPEAK_DESCRIPTION",
            "GRAMMAR_FILL_BLANK", "GRAMMAR_TRANSFORMATION",
            "VOCAB_MATCHING", "VOCAB_CLZE"
          ];
          
          if (activityTypes.includes(typeUpper)) {
            return typeUpper;
          }
          
          // Default types by skill
          if (skillUpper === "WRITING") return "WRITE_PARAGRAPH";
          if (skillUpper === "SPEAKING") return "SPEAK_TOPIC";
          if (skillUpper === "READING") return "READ_MAIN_IDEA";
          if (skillUpper === "LISTENING") return "LISTEN_DETAIL";
          return "LECTURE";
        };

        const activity = await prisma.activity.create({
          data: {
            unitId: unit.id,
            type: getActivityType(skill, activityType) as any,
            title: `${skill} Practice`,
            level: "B1",
            skill: skill.toUpperCase() as any,
          },
        });
        activityId = activity.id;
      }
    } catch (activityError) {
      console.error("Error getting/creating activity:", activityError);
      throw activityError;
    }

    // Create attempt
    const attempt = await prisma.attempt.create({
      data: {
        userId: session.user.id,
        activityId,
        submittedAt: completed ? new Date() : null,
        score: score ? Math.round(score * 10) : null, // Convert to 0-100 scale
        status: completed ? "completed" : "in_progress",
        meta: {
          activityType,
          duration: duration || null,
          ...(metadata || {}),
        },
      },
    });

    // Update streak only if activity is completed
    let streakResult = null;
    if (completed === true) {
      try {
        streakResult = await updateStreakAfterActivity(session.user.id);
      } catch (streakError) {
        console.error("Streak update error:", streakError);
        // Continue even if streak update fails
      }
    }

    return NextResponse.json({
      success: true,
      activity: attempt,
      streak: streakResult?.streak || null,
      longestStreak: streakResult?.longestStreak || null,
      isNewDay: streakResult?.isNewDay || false,
    });
  } catch (error) {
    console.error("Record activity error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to record activity", details: errorMessage },
      { status: 500 }
    );
  }
}
