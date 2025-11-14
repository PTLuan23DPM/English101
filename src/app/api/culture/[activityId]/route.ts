import { NextRequest, NextResponse } from "next/server";
import { requireAuth, unauthorizedResponse } from "@/server/utils/auth";
import { activityController } from "@/server/controllers/activityController";

/**
 * @swagger
 * /api/culture/{activityId}:
 *   get:
 *     summary: Get culture activity detail
 *     tags: [Culture]
 *     parameters:
 *       - in: path
 *         name: activityId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Activity details
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Activity not found
 */
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ activityId: string }> }
) {
    try {
        await requireAuth();

        const { activityId } = await params;
        const result = await activityController.getActivityById(activityId, "CULTURE");

        return NextResponse.json(result.data);
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        
        if (errorMessage === "Unauthorized") {
            return unauthorizedResponse();
        }

        if (errorMessage === "Activity not found") {
            return NextResponse.json({ error: errorMessage }, { status: 404 });
        }

        console.error("Error fetching culture activity:", error);
        return NextResponse.json(
            { error: errorMessage || "Failed to fetch activity" },
            { status: 500 }
        );
    }
}
