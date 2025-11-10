import { NextRequest, NextResponse } from "next/server";
import { requireAuth, unauthorizedResponse, createResponse } from "@/server/utils/auth";
import { activityController } from "@/server/controllers/activityController";

/**
 * @swagger
 * /api/reading/activities:
 *   get:
 *     summary: Get reading activities
 *     tags: [Reading]
 *     parameters:
 *       - in: query
 *         name: level
 *         schema:
 *           type: string
 *         description: CEFR level filter
 *     responses:
 *       200:
 *         description: List of reading activities
 */
export async function GET(req: NextRequest) {
  try {
    await requireAuth();

    const { searchParams } = new URL(req.url);
    const level = searchParams.get("level") || undefined;
    const type = searchParams.get("type") || undefined;

    const result = await activityController.getActivities("READING", { level, type });

    return createResponse({
      activities: result.data,
    });
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return unauthorizedResponse();
    }

    console.error("Error fetching reading activities:", error);
    return createResponse(
      { error: error.message || "Failed to fetch activities" },
      500
    );
  }
}
