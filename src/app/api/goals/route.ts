import { NextRequest, NextResponse } from "next/server";
import { requireAuth, unauthorizedResponse, createResponse } from "@/server/utils/auth";
import { goalsController } from "@/server/controllers/goalsController";
import { createErrorResponse } from "@/server/utils/response";

/**
 * Get user goals
 * GET /api/goals
 */
export async function GET(req: NextRequest) {
    try {
        const session = await requireAuth();
        const userId = session.user.id;

        const result = await goalsController.getGoals(userId);

        return createResponse(result.data);
    } catch (error: any) {
        if (error.message === "Unauthorized") {
            return unauthorizedResponse();
        }

        console.error("[Goals GET API] Error:", error);
        return createErrorResponse(error.message || "Failed to fetch goals", 500);
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

        return createResponse(result.data, 201);
    } catch (error: any) {
        if (error.message === "Unauthorized") {
            return unauthorizedResponse();
        }

        if (error.message === "Missing required fields: type, target") {
            return createErrorResponse(error.message, 400);
        }

        console.error("[Goals POST API] Error:", error);
        return createErrorResponse(error.message || "Failed to create goal", 500);
    }
}

