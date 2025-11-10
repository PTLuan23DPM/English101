import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { submissionController } from "@/server/controllers/submissionController";

/**
 * @swagger
 * /api/reading/{activityId}/submit:
 *   post:
 *     summary: Submit answers for reading activity
 *     tags: [Reading]
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
      "READING",
      body
    );

    return NextResponse.json(result.data, { status: result.status });
  } catch (error) {
    console.error("Error submitting reading activity:", error);
    return NextResponse.json(
      { error: "Failed to submit activity" },
      { status: 500 }
    );
  }
}

