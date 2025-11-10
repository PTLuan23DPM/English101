import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session) {
            console.error("[Usage Record] No session found");
            return NextResponse.json({ error: "Unauthorized: No session" }, { status: 401 });
        }

        if (!session.user) {
            console.error("[Usage Record] No user in session");
            return NextResponse.json({ error: "Unauthorized: No user in session" }, { status: 401 });
        }

        const userId = (session.user as { id?: string }).id;
        if (!userId) {
            console.error("[Usage Record] No user ID in session");
            return NextResponse.json({ error: "Unauthorized: No user ID" }, { status: 401 });
        }

        const { taskId, feature, metadata } = await req.json();

        if (!feature) {
            return NextResponse.json(
                { error: "Feature parameter is required" },
                { status: 400 }
            );
        }

        // Validate feature name
        const validFeatures = ["outline", "brainstorm", "thesis", "language-pack", "rephrase", "expand"];
        if (!validFeatures.includes(feature)) {
            return NextResponse.json(
                { error: `Invalid feature. Must be one of: ${validFeatures.join(", ")}` },
                { status: 400 }
            );
        }

        // Record usage
        const usage = await prisma.writingLLMUsage.create({
            data: {
                userId: userId,
                taskId: taskId || null,
                feature: feature,
                metadata: metadata || null,
            },
        });

        return NextResponse.json({
            success: true,
            usage: {
                id: usage.id,
                feature: usage.feature,
                usedAt: usage.usedAt,
            },
        });
    } catch (error) {
        console.error("Usage record error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to record usage" },
            { status: 500 }
        );
    }
}

