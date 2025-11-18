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
 * Record usage of a writing LLM feature
 * POST /api/writing/usage/record
 */
export async function POST(req: NextRequest) {
    try {
        const userId = await getUserIdFromSession();

        const { feature, taskId } = await req.json();

        if (!feature) {
            return NextResponse.json(
                { error: "Feature parameter is required" },
                { status: 400 }
            );
        }

        const result = await writingController.recordUsage(userId, feature, taskId);

        if (!result.success) {
            return NextResponse.json(
                { error: "Failed to record usage" },
                { status: 500 }
            );
        }

        return NextResponse.json(result, { status: 201 });
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        
        if (errorMessage === "Unauthorized" || errorMessage === "User not found" || errorMessage.includes("Unauthorized")) {
            console.error("[Usage Record] Auth error:", errorMessage);
            return unauthorizedResponse();
        }

        console.error("[Usage Record] Error:", error);
        return NextResponse.json(
            { error: errorMessage || "Failed to record usage" },
            { status: 500 }
        );
    }
}
