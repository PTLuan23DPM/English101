import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { goalId, current, completed, metadata } = body;

    if (!goalId) {
      return NextResponse.json(
        { error: "Goal ID is required" },
        { status: 400 }
      );
    }

    // Check if goal exists and belongs to user
    const existingGoal = await prisma.userGoal.findFirst({
      where: {
        id: goalId,
        userId: session.user.id,
      },
    });

    if (!existingGoal) {
      return NextResponse.json(
        { error: "Goal not found" },
        { status: 404 }
      );
    }

    // Prepare update data
    const updateData: any = {};

    if (current !== undefined) {
      updateData.current = current;
      // Auto-complete if target reached
      if (current >= existingGoal.target) {
        updateData.completed = true;
      }
    }

    if (completed !== undefined) {
      updateData.completed = completed;
    }

    if (metadata !== undefined) {
      updateData.metadata = metadata;
    }

    // Update goal
    const updatedGoal = await prisma.userGoal.update({
      where: { id: goalId },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      goal: {
        id: updatedGoal.id,
        type: updatedGoal.type,
        target: updatedGoal.target,
        current: updatedGoal.current,
        deadline: updatedGoal.deadline?.toISOString() || null,
        completed: updatedGoal.completed,
        metadata: updatedGoal.metadata,
      },
    });
  } catch (error: any) {
    console.error("Update goal error:", error);
    return NextResponse.json(
      { error: "Failed to update goal", details: error.message },
      { status: 500 }
    );
  }
}

