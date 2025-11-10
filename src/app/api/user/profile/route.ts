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

        return NextResponse.json(result.data || result, { status: result.status || 200 });
    } catch (error: any) {
        if (error.message === "Unauthorized") {
            return unauthorizedResponse();
        }

        if (error.message === "User not found") {
            return createErrorResponse(error.message, 404);
        }

        if (
            error.message === "Email already in use" ||
            error.message === "Current password is required to set a new password" ||
            error.message === "Cannot update password for OAuth accounts" ||
            error.message === "Current password is incorrect"
        ) {
            return createErrorResponse(error.message, 400);
        }

        console.error("[Profile Update API] Error:", error);
        return createErrorResponse(error.message || "Failed to update profile", 500);
    }
}

/**
 * Get user profile
 * GET /api/user/profile
 */
export async function GET(req: NextRequest) {
    try {
        const session = await requireAuth();
        const userId = session.user.id;

        const result = await userController.getProfile(userId);

        return NextResponse.json(result.data || result, { status: result.status || 200 });
    } catch (error: any) {
        if (error.message === "Unauthorized") {
            return unauthorizedResponse();
        }

        if (error.message === "User not found") {
            return createErrorResponse(error.message, 404);
        }

        console.error("[Profile Get API] Error:", error);
        return createErrorResponse(error.message || "Failed to fetch profile", 500);
    }
}
