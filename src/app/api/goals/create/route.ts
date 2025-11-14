import { NextRequest, NextResponse } from "next/server";
import { requireAuth, unauthorizedResponse } from "@/server/utils/auth";
import { goalsController } from "@/server/controllers/goalsController";

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await req.json();
    const result = await goalsController.createGoal(session.user.id, body);

    return NextResponse.json(result.data, { status: result.success ? 201 : 500 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    if (errorMessage === "Unauthorized") {
      return unauthorizedResponse();
    }

    console.error("Create goal error:", error);
    return NextResponse.json(
      { error: "Failed to create goal" },
      { status: 500 }
    );
  }
}

