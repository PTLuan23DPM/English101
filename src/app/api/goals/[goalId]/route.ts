import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

/**
 * Update goal
 * PUT /api/goals/[goalId]
 */
export async function PUT(
    req: NextRequest,
    { params }: { params: { goalId: string } }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user || !session.user.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userId = session.user.id;
        const { goalId } = params;
        const data = await req.json();

        // Verify goal belongs to user
        const existingGoal = await prisma.userGoal.findUnique({
            where: { id: goalId },
        });

        if (!existingGoal || existingGoal.userId !== userId) {
            return NextResponse.json(
                { error: "Goal not found" },
                { status: 404 }
            );
        }

        // Update goal
        const updateData: any = {};
        if (data.current !== undefined) updateData.current = data.current;
        if (data.target !== undefined) updateData.target = data.target;
        if (data.completed !== undefined) updateData.completed = data.completed;
        if (data.deadline !== undefined)
            updateData.deadline = data.deadline ? new Date(data.deadline) : null;

        // Check if goal is completed
        if (updateData.current && updateData.current >= existingGoal.target) {
            updateData.completed = true;
        }

        const goal = await prisma.userGoal.update({
            where: { id: goalId },
            data: updateData,
        });

        return NextResponse.json({
            success: true,
            goal,
            message: "Goal updated successfully",
        });
    } catch (error) {
        console.error("[Goal Update API] Error:", error);
        return NextResponse.json(
            { error: "Failed to update goal" },
            { status: 500 }
        );
    }
}

/**
 * Delete goal
 * DELETE /api/goals/[goalId]
 */
export async function DELETE(
    req: NextRequest,
    { params }: { params: { goalId: string } }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user || !session.user.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userId = session.user.id;
        const { goalId } = params;

        // Verify goal belongs to user
        const existingGoal = await prisma.userGoal.findUnique({
            where: { id: goalId },
        });

        if (!existingGoal || existingGoal.userId !== userId) {
            return NextResponse.json(
                { error: "Goal not found" },
                { status: 404 }
            );
        }

        await prisma.userGoal.delete({
            where: { id: goalId },
        });

        return NextResponse.json({
            success: true,
            message: "Goal deleted successfully",
        });
    } catch (error) {
        console.error("[Goal Delete API] Error:", error);
        return NextResponse.json(
            { error: "Failed to delete goal" },
            { status: 500 }
        );
    }
}

