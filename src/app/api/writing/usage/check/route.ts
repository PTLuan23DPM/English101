import { NextRequest, NextResponse } from "next/server";
import { requireAuth, unauthorizedResponse } from "@/server/utils/auth";
import { writingController } from "@/server/controllers/writingController";

/**
 * Get usage limits and current usage for a feature
 * GET /api/writing/usage/check?feature=outline&taskId=xxx
 */
export async function GET(req: NextRequest) {
    try {
        const session = await requireAuth();
        const userId = session.user.id;

        const { searchParams } = new URL(req.url);
        const taskId = searchParams.get("taskId") || undefined;
        const feature = searchParams.get("feature");

        if (!feature) {
            return NextResponse.json(
                { error: "Feature parameter is required" },
                { status: 400 }
            );
        }

        const result = await writingController.getUsage(userId, feature, taskId);

        return NextResponse.json(result.data);
    } catch (error: any) {
        if (error.message === "Unauthorized") {
            return unauthorizedResponse();
        }

        console.error("Usage check error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to check usage" },
            { status: 500 }
        );
    }
}

/**
 * Get all usage limits and current usage for a task
 * POST /api/writing/usage/check
 */
export async function POST(req: NextRequest) {
    try {
        const session = await requireAuth();
        const userId = session.user.id;

        const { taskId } = await req.json();

        const result = await writingController.getAllUsage(userId, taskId);

        return NextResponse.json(result.data);
    } catch (error: any) {
        if (error.message === "Unauthorized") {
            return unauthorizedResponse();
        }

        console.error("Usage check error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to check usage" },
            { status: 500 }
        );
    }
}
