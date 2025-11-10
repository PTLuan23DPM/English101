import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

/**
 * Get user goals
 * GET /api/goals
 */
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user || !session.user.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userId = session.user.id;

        const goals = await prisma.userGoal.findMany({
            where: { userId },
            orderBy: [{ completed: "asc" }, { createdAt: "desc" }],
        });

        return NextResponse.json({
            success: true,
            goals,
        });
    } catch (error) {
        console.error("[Goals GET API] Error:", error);
        return NextResponse.json(
            { error: "Failed to fetch goals" },
            { status: 500 }
        );
    }
}

/**
 * Create new goal
 * POST /api/goals
 */
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user || !session.user.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userId = session.user.id;
        const data = await req.json();
        const { type, target, deadline, metadata } = data;

        if (!type || !target) {
            return NextResponse.json(
                { error: "Missing required fields: type, target" },
                { status: 400 }
            );
        }

        const goal = await prisma.userGoal.create({
            data: {
                userId,
                type,
                target: parseInt(target),
                deadline: deadline ? new Date(deadline) : null,
                current: 0,
                completed: false,
                metadata: metadata || {},
            },
        });

        return NextResponse.json({
            success: true,
            goal,
            message: "Goal created successfully",
        });
    } catch (error) {
        console.error("[Goals POST API] Error:", error);
        return NextResponse.json(
            { error: "Failed to create goal" },
            { status: 500 }
        );
    }
}

