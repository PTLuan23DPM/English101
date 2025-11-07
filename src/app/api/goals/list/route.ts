import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all goals for user
    const goals = await prisma.userGoal.findMany({
      where: { userId: session.user.id },
      orderBy: [{ completed: "asc" }, { createdAt: "desc" }],
    });

    return NextResponse.json({
      success: true,
      goals: goals.map((goal) => ({
        id: goal.id,
        type: goal.type,
        target: goal.target,
        current: goal.current,
        deadline: goal.deadline?.toISOString() || null,
        completed: goal.completed,
        metadata: goal.metadata,
        createdAt: goal.createdAt.toISOString(),
        updatedAt: goal.updatedAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("Get goals error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to get goals", details: errorMessage },
      { status: 500 }
    );
  }
}
