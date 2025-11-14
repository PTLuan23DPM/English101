import { NextRequest, NextResponse } from "next/server";
import { requireAuth, unauthorizedResponse } from "@/server/utils/auth";
import { goalsController } from "@/server/controllers/goalsController";
import { createErrorResponse } from "@/server/utils/response";

/**
 * Get user goals
 * GET /api/goals
 */
export async function GET() {
    try {
        const session = await requireAuth();
        const userId = session.user.id;

        const result = await goalsController.getGoals(userId);

        return NextResponse.json(result.data);
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        
        if (errorMessage === "Unauthorized") {
            return unauthorizedResponse();
        }

        console.error("[Goals GET API] Error:", error);
        return createErrorResponse(errorMessage || "Failed to fetch goals", 500);
    }
}

/**
 * Create new goal
 * POST /api/goals
 */
export async function POST(req: NextRequest) {
    try {
        const session = await requireAuth();
        const userId = session.user.id;

        const data = await req.json();
        const { type, target, deadline, metadata } = data;

        const result = await goalsController.createGoal(userId, {
            type,
            target: parseInt(target),
            deadline: deadline ? new Date(deadline) : null,
            metadata,
        });

        return NextResponse.json(result.data, { status: 201 });
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        
        if (errorMessage === "Unauthorized") {
            return unauthorizedResponse();
        }

        if (errorMessage === "Missing required fields: type, target") {
            return createErrorResponse(errorMessage, 400);
        }

        console.error("[Goals POST API] Error:", error);
        return createErrorResponse(errorMessage || "Failed to create goal", 500);
    }
}

