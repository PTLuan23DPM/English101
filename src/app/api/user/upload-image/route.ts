import { NextRequest, NextResponse } from "next/server";
import { requireAuth, unauthorizedResponse, createResponse } from "@/server/utils/auth";
import { fileController } from "@/server/controllers/fileController";
import { createErrorResponse } from "@/server/utils/response";

/**
 * Upload profile image
 * POST /api/user/upload-image
 */
export async function POST(req: NextRequest) {
    try {
        const session = await requireAuth();
        const userId = session.user.id;

        const formData = await req.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return createErrorResponse("No file provided", 400);
        }

        const result = await fileController.uploadProfileImage(userId, file);

        return createResponse(result.data, 200);
    } catch (error: any) {
        if (error.message === "Unauthorized") {
            return unauthorizedResponse();
        }

        if (
            error.message === "No file provided" ||
            error.message === "Invalid file type. Only JPEG, PNG, and WebP are allowed" ||
            error.message === "File size too large. Maximum size is 5MB"
        ) {
            return createErrorResponse(error.message, 400);
        }

        console.error("[Upload Image API] Error:", error);
        return createErrorResponse(error.message || "Failed to upload image", 500);
    }
}
