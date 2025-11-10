import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { speakingController } from "@/server/controllers/speakingController";

/**
 * @swagger
 * /api/speaking/{activityId}/submit:
 *   post:
 *     summary: Submit audio recording for speaking activity
 *     tags: [Speaking]
 *     parameters:
 *       - in: path
 *         name: activityId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               questionId:
 *                 type: string
 *               audio:
 *                 type: string
 *                 format: binary
 *               duration:
 *                 type: number
 *     responses:
 *       200:
 *         description: Audio uploaded and analyzed
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

    const formData = await req.formData();
    const result = await speakingController.submitSpeaking(
      session.user.email,
      activityId,
      formData
    );

    return NextResponse.json(result.data, { status: result.status });
  } catch (error) {
    console.error("Error submitting speaking activity:", error);
    return NextResponse.json(
      { error: "Failed to submit activity" },
      { status: 500 }
    );
  }
}

