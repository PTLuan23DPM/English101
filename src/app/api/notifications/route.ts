import { NextRequest, NextResponse } from "next/server";
import { requireAuth, unauthorizedResponse } from "@/server/utils/auth";
import { notificationsController } from "@/server/controllers/notificationsController";

/**
 * Get user notifications
 * GET /api/notifications
 */
export async function GET() {
    try {
        const session = await requireAuth();
        const userId = session.user.id;

        const result = await notificationsController.getNotifications(userId);

        return NextResponse.json({
            success: result.success,
            ...result.data,
        }, { status: result.success ? 200 : 500 });
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        
        if (errorMessage === "Unauthorized") {
            return unauthorizedResponse();
        }

        console.error("[Notifications GET API] Error:", error);
        return NextResponse.json(
            { error: errorMessage || "Failed to fetch notifications" },
            { status: 500 }
        );
    }
}

/**
 * Mark notification as read
 * PUT /api/notifications
 */
export async function PUT(req: NextRequest) {
    try {
        const session = await requireAuth();
        const userId = session.user.id;

        const data = await req.json();
        const { notificationId } = data;

        if (!notificationId) {
            return NextResponse.json(
                { error: "Notification ID is required" },
                { status: 400 }
            );
        }

        const result = await notificationsController.markAsRead(notificationId, userId);

        return NextResponse.json(result.data, { status: result.success ? 200 : 500 });
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        
        if (errorMessage === "Unauthorized") {
            return unauthorizedResponse();
        }

        console.error("[Notification Update API] Error:", error);
        return NextResponse.json(
            { error: errorMessage || "Failed to update notification" },
            { status: 500 }
        );
    }
}
