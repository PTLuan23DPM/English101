import { NextResponse } from "next/server";
import { requireAuth, unauthorizedResponse } from "@/server/utils/auth";
import { goalsController } from "@/server/controllers/goalsController";

export async function GET() {
  try {
    const session = await requireAuth();
    const result = await goalsController.getGoals(session.user.id);

    return NextResponse.json(result.data, { status: result.success ? 200 : 500 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    if (errorMessage === "Unauthorized") {
      return unauthorizedResponse();
    }

    console.error("Get goals error:", error);
    return NextResponse.json(
      { error: "Failed to get goals" },
      { status: 500 }
    );
  }
}
