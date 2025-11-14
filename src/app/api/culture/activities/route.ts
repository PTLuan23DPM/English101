import { NextRequest, NextResponse } from "next/server";
import { requireAuth, unauthorizedResponse } from "@/server/utils/auth";
import { activityController } from "@/server/controllers/activityController";

/**
 * @swagger
 * /api/culture/activities:
 *   get:
 *     summary: Get culture & topics activities
 *     tags: [Culture]
 *     parameters:
 *       - in: query
 *         name: level
 *         schema:
 *           type: string
 *         description: CEFR level filter (A1, A2, B1, B2, C1, C2)
 *       - in: query
 *         name: topic
 *         schema:
 *           type: string
 *         description: Topic category filter
 *     responses:
 *       200:
 *         description: List of culture activities
 *       401:
 *         description: Unauthorized
 */
export async function GET(req: NextRequest) {
    try {
        await requireAuth();

        const { searchParams } = new URL(req.url);
        const level = searchParams.get("level") || undefined;
        const topic = searchParams.get("topic") || undefined;

        const result = await activityController.getActivities("CULTURE", { level, topic });

        return NextResponse.json({
            activities: result.data,
        });
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        
        if (errorMessage === "Unauthorized") {
            return unauthorizedResponse();
        }

        console.error("Error fetching culture activities:", error);
        return NextResponse.json(
            { error: errorMessage || "Failed to fetch activities" },
            { status: 500 }
        );
    }
}
