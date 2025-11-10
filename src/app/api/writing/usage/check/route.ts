import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

/**
 * Get usage limits for a user based on their CEFR level
 */
function getUsageLimits(level: string | null | undefined): Record<string, number> {
    // Default limits if level is not set
    if (!level) {
        return {
            outline: 1,
            brainstorm: 1,
            thesis: 1,
            "language-pack": 2,
            rephrase: 3,
            expand: 3,
        };
    }

    const levelUpper = level.toUpperCase();

    // Beginner levels (A1, A2): More help allowed
    if (levelUpper === "A1" || levelUpper === "A2") {
        return {
            outline: 1,
            brainstorm: 1,
            thesis: 1,
            "language-pack": 3, // More vocabulary help
            rephrase: 3, // More rephrasing help
            expand: 3, // More expansion help
        };
    }

    // Intermediate levels (B1, B2): Moderate help
    if (levelUpper === "B1" || levelUpper === "B2") {
        return {
            outline: 1,
            brainstorm: 1,
            thesis: 1,
            "language-pack": 2,
            rephrase: 2,
            expand: 2,
        };
    }

    // Advanced levels (C1, C2): Limited help (challenge mode)
    return {
        outline: 1,
        brainstorm: 1,
        thesis: 1,
        "language-pack": 1, // Minimal help
        rephrase: 1, // Minimal help
        expand: 1, // Minimal help
    };
}

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session) {
            return NextResponse.json({ error: "Unauthorized: No session" }, { status: 401 });
        }

        if (!session.user) {
            return NextResponse.json({ error: "Unauthorized: No user in session" }, { status: 401 });
        }

        const userId = (session.user as { id?: string }).id;
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized: No user ID" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const taskId = searchParams.get("taskId");
        const feature = searchParams.get("feature");

        if (!feature) {
            return NextResponse.json(
                { error: "Feature parameter is required" },
                { status: 400 }
            );
        }

        // Get user's CEFR level
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { cefrLevel: true },
        });

        // Get usage limits based on level
        const limits = getUsageLimits(user?.cefrLevel);

        // Get current usage count for this feature and task
        const usageCount = await prisma.writingLLMUsage.count({
            where: {
                userId: userId,
                feature: feature,
                ...(taskId && { taskId: taskId }),
            },
        });

        const limit = limits[feature] || 0;
        const remaining = Math.max(0, limit - usageCount);
        const isAvailable = remaining > 0;

        return NextResponse.json({
            feature,
            limit,
            used: usageCount,
            remaining,
            isAvailable,
        });
    } catch (error) {
        console.error("Usage check error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to check usage" },
            { status: 500 }
        );
    }
}

/**
 * Get all usage limits and current usage for a task
 */
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.email) {
            console.error("[Usage Check] No session or email found");
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Get user from database using email (more reliable than session.user.id)
        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            select: { id: true, cefrLevel: true },
        });

        if (!user) {
            console.error("[Usage Check] User not found in database");
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const userId = user.id;
        const { taskId } = await req.json();

        // Get usage limits based on level
        const limits = getUsageLimits(user?.cefrLevel);

        // Get current usage for all features
        const features = ["outline", "brainstorm", "thesis", "language-pack", "rephrase", "expand"];
        const usage = await prisma.writingLLMUsage.findMany({
            where: {
                userId: userId,
                ...(taskId && { taskId: taskId }),
                feature: {
                    in: features,
                },
            },
            select: {
                feature: true,
            },
        });

        // Count usage per feature
        const usageCounts: Record<string, number> = {};
        features.forEach((f) => {
            usageCounts[f] = 0;
        });

        usage.forEach((u) => {
            usageCounts[u.feature] = (usageCounts[u.feature] || 0) + 1;
        });

        // Build response with limits and usage for each feature
        const result: Record<string, {
            limit: number;
            used: number;
            remaining: number;
            isAvailable: boolean;
        }> = {};

        features.forEach((feature) => {
            const limit = limits[feature] || 0;
            const used = usageCounts[feature] || 0;
            const remaining = Math.max(0, limit - used);
            const isAvailable = remaining > 0;

            result[feature] = {
                limit,
                used,
                remaining,
                isAvailable,
            };
        });

        return NextResponse.json(result);
    } catch (error) {
        console.error("Usage check error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to check usage" },
            { status: 500 }
        );
    }
}

