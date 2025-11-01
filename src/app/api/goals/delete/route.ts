import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const goalId = searchParams.get("goalId");

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

    // Delete goal
    await prisma.userGoal.delete({
      where: { id: goalId },
    });

    return NextResponse.json({
      success: true,
      message: "Goal deleted successfully",
    });
  } catch (error: any) {
    console.error("Delete goal error:", error);
    return NextResponse.json(
      { error: "Failed to delete goal", details: error.message },
      { status: 500 }
    );
  }
}

