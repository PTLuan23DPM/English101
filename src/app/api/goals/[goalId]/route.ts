import { NextRequest, NextResponse } from "next/server";
import { requireAuth, unauthorizedResponse } from "@/server/utils/auth";
import { goalsController } from "@/server/controllers/goalsController";
import { createErrorResponse } from "@/server/utils/response";

/**
 * Get goal by ID
 * GET /api/goals/[goalId]
 */
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ goalId: string }> }
) {
    try {
        const session = await requireAuth();
        const userId = session.user.id;
        const { goalId } = await params;

        const result = await goalsController.getGoalById(goalId, userId);

        return NextResponse.json(result.data);
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        
        if (errorMessage === "Unauthorized") {
            return unauthorizedResponse();
        }

        if (errorMessage === "Goal not found") {
            return createErrorResponse(errorMessage, 404);
        }

        console.error("[Goals GET API] Error:", error);
        return createErrorResponse(errorMessage || "Failed to fetch goal", 500);
    }
}

/**
 * Update goal
 * PUT /api/goals/[goalId]
 */
export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ goalId: string }> }
) {
    try {
        const session = await requireAuth();
        const userId = session.user.id;
        const { goalId } = await params;

        const data = await req.json();
        const { type, target, current, deadline, completed, metadata } = data;

        const result = await goalsController.updateGoal(goalId, userId, {
            type,
            target: target ? parseInt(target) : undefined,
            current: current ? parseInt(current) : undefined,
            deadline: deadline ? new Date(deadline) : deadline,
            completed,
            metadata,
        });

        return NextResponse.json(result.data);
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        
        if (errorMessage === "Unauthorized") {
            return unauthorizedResponse();
        }

        if (errorMessage === "Goal not found") {
            return createErrorResponse(errorMessage, 404);
        }

        console.error("[Goals PUT API] Error:", error);
        return createErrorResponse(errorMessage || "Failed to update goal", 500);
    }
}

/**
 * Delete goal
 * DELETE /api/goals/[goalId]
 */
export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ goalId: string }> }
) {
    try {
        const session = await requireAuth();
        const userId = session.user.id;
        const { goalId } = await params;

        const result = await goalsController.deleteGoal(goalId, userId);

        return NextResponse.json(result, { status: 200 });
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        
        if (errorMessage === "Unauthorized") {
            return unauthorizedResponse();
        }

        if (errorMessage === "Goal not found") {
            return createErrorResponse(errorMessage, 404);
        }

        console.error("[Goals DELETE API] Error:", error);
        return createErrorResponse(errorMessage || "Failed to delete goal", 500);
    }
}
