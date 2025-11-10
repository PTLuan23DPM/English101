import { NextRequest, NextResponse } from "next/server";
import { requireAuth, unauthorizedResponse } from "@/server/utils/auth";
import { goalsController } from "@/server/controllers/goalsController";

export async function GET() {
  try {
    const session = await requireAuth();
    const result = await goalsController.getGoals(session.user.id);

    return NextResponse.json(result.data, { status: result.status });
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return unauthorizedResponse();
    }

    console.error("Get goals error:", error);
    return NextResponse.json(
      { error: "Failed to get goals" },
      { status: 500 }
    );
  }
}
