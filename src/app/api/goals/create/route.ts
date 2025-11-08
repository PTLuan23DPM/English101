import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { type, target, deadline, metadata } = body;

    // Validation
    if (!type || typeof type !== "string") {
      return NextResponse.json(
        { error: "Goal type is required" },
        { status: 400 }
      );
    }

    if (!target || typeof target !== "number" || target <= 0) {
      return NextResponse.json(
        { error: "Target must be a positive number" },
        { status: 400 }
      );
    }

    // Valid goal types
    const validTypes = [
      "daily_exercises",
      "weekly_hours",
      "target_level",
      "skill_improvement",
      "vocabulary_words",
      "reading_articles",
      "writing_essays",
      "speaking_practice",
      "listening_hours",
    ];

    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: "Invalid goal type" },
        { status: 400 }
      );
    }

    // Create goal
    const goal = await prisma.userGoal.create({
      data: {
        userId: session.user.id,
        type,
        target,
        current: 0,
        deadline: deadline ? new Date(deadline) : null,
        completed: false,
        metadata: metadata || null,
      },
    });

    return NextResponse.json({
      success: true,
      goal: {
        id: goal.id,
        type: goal.type,
        target: goal.target,
        current: goal.current,
        deadline: goal.deadline?.toISOString() || null,
        completed: goal.completed,
        metadata: goal.metadata,
      },
    });
  } catch (error) {
    console.error("Create goal error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to create goal", details: errorMessage },
      { status: 500 }
    );
  }
}

