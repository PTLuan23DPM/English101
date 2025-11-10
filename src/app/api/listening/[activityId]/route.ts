import { NextRequest, NextResponse } from "next/server";
import { requireAuth, unauthorizedResponse, createResponse } from "@/server/utils/auth";
import { activityController } from "@/server/controllers/activityController";

/**
 * @swagger
 * /api/listening/{activityId}:
 *   get:
 *     summary: Get listening activity detail
 *     tags: [Listening]
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
    const result = await activityController.getActivityById(activityId, "LISTENING");

    return createResponse(result.data);
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return unauthorizedResponse();
    }

    if (error.message === "Activity not found") {
      return createResponse({ error: error.message }, 404);
    }

    console.error("Error fetching listening activity:", error);
    return createResponse(
      { error: error.message || "Failed to fetch activity" },
      500
    );
  }
}
