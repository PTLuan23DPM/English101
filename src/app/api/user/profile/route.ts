import { NextRequest, NextResponse } from "next/server";
import { requireAuth, unauthorizedResponse } from "@/server/utils/auth";
import { userController } from "@/server/controllers/userController";
import { createErrorResponse } from "@/server/utils/response";

/**
 * Update user profile
 * PUT /api/user/profile
 */
export async function PUT(req: NextRequest) {
    try {
        const session = await requireAuth();
        const userId = session.user.id;
        const data = await req.json();

        const result = await userController.updateProfile(
            userId,
            data,
            {
                name: session.user.name,
                email: session.user.email,
            }
        );

        return NextResponse.json(result.data || result, { status: result.success ? 200 : 500 });
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        
        if (errorMessage === "Unauthorized") {
            return unauthorizedResponse();
        }

        if (errorMessage === "User not found") {
            return createErrorResponse(errorMessage, 404);
        }

        if (
            errorMessage === "Email already in use" ||
            errorMessage === "Current password is required to set a new password" ||
            errorMessage === "Cannot update password for OAuth accounts" ||
            errorMessage === "Current password is incorrect"
        ) {
            return createErrorResponse(errorMessage, 400);
        }

        console.error("[Profile Update API] Error:", error);
        return createErrorResponse(errorMessage || "Failed to update profile", 500);
    }
}

/**
 * Get user profile
 * GET /api/user/profile
 */
export async function GET() {
    try {
        const session = await requireAuth();
        const userId = session.user.id;

        const result = await userController.getProfile(userId);

        return NextResponse.json(result.data || result, { status: result.success ? 200 : 500 });
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        
        if (errorMessage === "Unauthorized") {
            return unauthorizedResponse();
        }

        if (errorMessage === "User not found") {
            return createErrorResponse(errorMessage, 404);
        }

        console.error("[Profile Get API] Error:", error);
        return createErrorResponse(errorMessage || "Failed to fetch profile", 500);
    }
}
