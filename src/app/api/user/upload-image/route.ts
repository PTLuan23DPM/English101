import { NextRequest, NextResponse } from "next/server";
import { requireAuth, unauthorizedResponse } from "@/server/utils/auth";
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

        return NextResponse.json(result.data, { status: 200 });
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        
        if (errorMessage === "Unauthorized") {
            return unauthorizedResponse();
        }

        if (
            errorMessage === "No file provided" ||
            errorMessage === "Invalid file type. Only JPEG, PNG, and WebP are allowed" ||
            errorMessage === "File size too large. Maximum size is 5MB"
        ) {
            return createErrorResponse(errorMessage, 400);
        }

        console.error("[Upload Image API] Error:", error);
        return createErrorResponse(errorMessage || "Failed to upload image", 500);
    }
}
