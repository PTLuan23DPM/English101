import { NextRequest, NextResponse } from "next/server";
import { requireAuth, unauthorizedResponse } from "@/server/utils/auth";
import { goalsController } from "@/server/controllers/goalsController";

export async function PATCH(req: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await req.json();
    const { goalId, ...updateData } = body;

    if (!goalId) {
      return NextResponse.json(
        { error: "Goal ID is required" },
        { status: 400 }
      );
    }

    const result = await goalsController.updateGoal(
      session.user.id,
      goalId,
      updateData
    );

    return NextResponse.json(result.data, { status: result.status });
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return unauthorizedResponse();
    }

    console.error("Update goal error:", error);
    return NextResponse.json(
      { error: "Failed to update goal" },
      { status: 500 }
    );
  }
}

