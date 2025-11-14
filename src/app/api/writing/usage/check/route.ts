import { NextRequest, NextResponse } from "next/server";
import { requireAuth, unauthorizedResponse, requireAuthByEmail } from "@/server/utils/auth";
import { writingController } from "@/server/controllers/writingController";

/**
 * Get userId from session (handles both id and email cases)
 */
async function getUserIdFromSession() {
    try {
        const session = await requireAuth();
        
        if (session?.user?.id) {
            return session.user.id;
        }
        
        if (session?.user?.email) {
            const user = await requireAuthByEmail(session.user.email);
            if (!user?.id) {
                throw new Error("User not found");
            }
            return user.id;
        }
        
        throw new Error("Unauthorized: No user ID or email in session");
    } catch (error: unknown) {
        console.error("[getUserIdFromSession] Error:", error);
        const message = error instanceof Error ? error.message : "Unauthorized";
        throw new Error(message);
    }
}

/**
 * Get usage limits and current usage for a feature
 * GET /api/writing/usage/check?feature=outline&taskId=xxx
 */
export async function GET(req: NextRequest) {
    try {
        const userId = await getUserIdFromSession();

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

        if (!result.success) {
            return NextResponse.json(
                { error: "Failed to get usage" },
                { status: 500 }
            );
        }

        return NextResponse.json(result.data);
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        
        if (errorMessage === "Unauthorized" || errorMessage === "User not found" || errorMessage.includes("Unauthorized")) {
            console.error("[Usage Check GET] Auth error:", errorMessage);
            return unauthorizedResponse();
        }

        console.error("[Usage Check GET] Error:", error);
        return NextResponse.json(
            { error: errorMessage || "Failed to check usage" },
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
        const userId = await getUserIdFromSession();

        const { taskId } = await req.json();

        const result = await writingController.getAllUsage(userId, taskId);

        if (!result.success) {
            return NextResponse.json(
                { error: "Failed to get usage" },
                { status: 500 }
            );
        }

        return NextResponse.json(result.data);
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        
        if (errorMessage === "Unauthorized" || errorMessage === "User not found" || errorMessage.includes("Unauthorized")) {
            console.error("[Usage Check POST] Auth error:", errorMessage);
            return unauthorizedResponse();
        }

        console.error("[Usage Check POST] Error:", error);
        return NextResponse.json(
            { error: errorMessage || "Failed to check usage" },
            { status: 500 }
        );
    }
}
