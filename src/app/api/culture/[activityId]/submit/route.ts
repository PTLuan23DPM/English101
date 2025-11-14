import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { submissionController } from "@/server/controllers/submissionController";

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
            "CULTURE",
            body
        );

        return NextResponse.json(result.data, { status: result.status || 200 });
    } catch (error) {
        console.error("Error submitting culture activity:", error);
        return NextResponse.json(
            { error: "Failed to submit activity" },
            { status: 500 }
        );
    }
}

