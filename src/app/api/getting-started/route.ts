import { NextRequest, NextResponse } from "next/server";
import { requireAuth, unauthorizedResponse } from "@/server/utils/auth";
import { gettingStartedController } from "@/server/controllers/gettingStartedController";

/**
 * Get getting started tasks
 * GET /api/getting-started
 */
export async function GET() {
    try {
        const session = await requireAuth();
        const userId = session.user.id;

        const result = await gettingStartedController.getTasks(userId);

        if (result.status >= 400) {
            return NextResponse.json(
                { error: result.data?.error || "Failed to get tasks", details: result.data?.details },
                { status: result.status }
            );
        }

        return NextResponse.json(result.data, { status: result.status || 200 });
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        
        if (errorMessage === "Unauthorized") {
            return unauthorizedResponse();
        }

        console.error("[Getting Started API] Error:", error);
        return NextResponse.json(
            { error: "Failed to get getting started tasks", details: errorMessage },
            { status: 500 }
        );
    }
}

/**
 * Mark task as completed
 * POST /api/getting-started
 */
export async function POST(req: NextRequest) {
    try {
        const session = await requireAuth();
        const userId = session.user.id;

        const body = await req.json();
        const { taskType } = body;

        if (!taskType) {
            return NextResponse.json(
                { error: "taskType is required" },
                { status: 400 }
            );
        }

        const result = await gettingStartedController.markTaskCompleted(userId, taskType);

        if (result.status >= 400) {
            return NextResponse.json(
                { error: result.data?.error || "Failed to mark task as completed", details: result.data?.details },
                { status: result.status }
            );
        }

        return NextResponse.json(result.data, { status: result.status || 200 });
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        
        if (errorMessage === "Unauthorized") {
            return unauthorizedResponse();
        }

        console.error("[Getting Started API] Error:", error);
        return NextResponse.json(
            { error: "Failed to mark task as completed", details: errorMessage },
            { status: 500 }
        );
    }
}

