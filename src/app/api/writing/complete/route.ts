import { NextRequest, NextResponse } from "next/server";
import { requireAuth, unauthorizedResponse, requireAuthByEmail } from "@/server/utils/auth";
import { writingController } from "@/server/controllers/writingController";

/**
 * Get userId from session (handles both id and email cases)
 */
async function getUserIdFromSession(fallbackUserId?: string) {
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
        
        if (fallbackUserId) {
            console.warn("[getUserIdFromSession] Falling back to provided userId due to auth error:", message);
            return fallbackUserId;
        }

        throw new Error(message);
    }
}

/**
 * Save writing task completion
 * POST /api/writing/complete
 */
export async function POST(req: NextRequest) {
    try {
        const data = await req.json();
        const { taskId, taskTitle, taskType, targetWords, score, level, duration, text, scoringDetails, userId: clientUserId } = data;
        const userId = await getUserIdFromSession(clientUserId);

        if (!userId) {
            return unauthorizedResponse();
        }

        const result = await writingController.saveCompletion(userId, {
            taskId,
            taskTitle,
            taskType,
            targetWords,
            score,
            level,
            duration,
            text,
            scoringDetails,
        });

        if (!result.success) {
            return NextResponse.json(
                { error: "Failed to save completion" },
                { status: 500 }
            );
        }

        return NextResponse.json(result.data, { status: 201 });
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        
        if (errorMessage === "Unauthorized" || errorMessage === "User not found" || errorMessage.includes("Unauthorized")) {
            console.error("[Writing Complete API] Auth error:", errorMessage);
            return unauthorizedResponse();
        }

        if (errorMessage === "Missing required fields: taskId, score") {
            return NextResponse.json(
                { error: errorMessage },
                { status: 400 }
            );
        }

        console.error("[Writing Complete API] Error:", error);
        return NextResponse.json(
            {
                error: errorMessage || "Failed to save task completion",
                details: errorMessage || "Unknown error",
            },
            { status: 500 }
        );
    }
}
