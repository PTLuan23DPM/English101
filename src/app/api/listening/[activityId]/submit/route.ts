import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { submissionController } from "@/server/controllers/submissionController";

/**
 * @swagger
 * /api/listening/{activityId}/submit:
 *   post:
 *     summary: Submit answers for listening activity and get grading
 *     tags: [Listening]
 *     parameters:
 *       - in: path
 *         name: activityId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               answers:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     questionId:
 *                       type: string
 *                     chosenIds:
 *                       type: array
 *                       items:
 *                         type: string
 *                     answerText:
 *                       type: string
 *               startTime:
 *                 type: string
 *                 format: date-time
 *               listenCount:
 *                 type: number
 *                 description: Number of times audio was played
 *     responses:
 *       200:
 *         description: Graded results with feedback
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Activity not found
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ activityId: string }> }
) {
  try {
    const { activityId } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const result = await submissionController.submitActivity(
      session.user.email,
      activityId,
      "LISTENING",
      body
    );

    return NextResponse.json(result.data, { status: result.status });
  } catch (error) {
    console.error("Error submitting listening activity:", error);
    return NextResponse.json(
      { error: "Failed to submit activity" },
      { status: 500 }
    );
  }
}

