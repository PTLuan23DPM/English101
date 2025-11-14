import { NextRequest, NextResponse } from "next/server";
import { requireAuth, unauthorizedResponse } from "@/server/utils/auth";
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

    return NextResponse.json({
      activities: result.data,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    if (errorMessage === "Unauthorized") {
      return unauthorizedResponse();
    }

    console.error("Error fetching reading activities:", error);
    return NextResponse.json(
      { error: errorMessage || "Failed to fetch activities" },
      { status: 500 }
    );
  }
}
