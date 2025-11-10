import { NextRequest, NextResponse } from "next/server";
import { requireAuth, unauthorizedResponse } from "@/server/utils/auth";
import { writingController } from "@/server/controllers/writingController";

/**
 * Record usage of a writing LLM feature
 * POST /api/writing/usage/record
 */
export async function POST(req: NextRequest) {
    try {
        const session = await requireAuth();
        const userId = session.user.id;

        const { feature, taskId } = await req.json();

        if (!feature) {
            return NextResponse.json(
                { error: "Feature parameter is required" },
                { status: 400 }
            );
        }

        const result = await writingController.recordUsage(userId, feature, taskId);

        return NextResponse.json(result, { status: 201 });
    } catch (error: any) {
        if (error.message === "Unauthorized") {
            return unauthorizedResponse();
        }

        console.error("Usage record error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to record usage" },
            { status: 500 }
        );
    }
}
