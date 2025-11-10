import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

/**
 * @swagger
 * /api/mediation/{activityId}:
 *   get:
 *     summary: Get mediation activity detail
 *     tags: [Mediation]
 */
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ activityId: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { activityId } = await params;
        const activity = await prisma.activity.findUnique({
            where: { id: activityId },
            include: {
                unit: {
                    select: {
                        title: true,
                        level: true,
                        module: {
                            select: {
                                title: true,
                                type: true,
                            },
                        },
                        contents: {
                            select: {
                                id: true,
                                title: true,
                                html: true,
                                plainText: true,
                                summary: true,
                            },
                        },
                    },
                },
                questions: {
                    include: {
                        choices: {
                            orderBy: { order: 'asc' },
                        },
                        content: {
                            select: {
                                id: true,
                                title: true,
                                html: true,
                                plainText: true,
                            },
                        },
                    },
                    orderBy: { order: 'asc' },
                },
            },
        });

        if (!activity) {
            return NextResponse.json({ error: "Activity not found" }, { status: 404 });
        }

        if (activity.skill !== "MEDIATION") {
            return NextResponse.json({ error: "Not a mediation activity" }, { status: 400 });
        }

        // For mediation activities, return source content and tasks
        const sanitizedQuestions = activity.questions.map((q) => ({
            id: q.id,
            order: q.order,
            type: q.type,
            prompt: q.prompt,
            score: q.score,
            content: q.content,
            choices: q.choices.map((c) => ({
                id: c.id,
                order: c.order,
                text: c.text,
                value: c.value,
            })),
        }));

        return NextResponse.json({
            activity: {
                id: activity.id,
                title: activity.title,
                instruction: activity.instruction,
                level: activity.level,
                type: activity.type,
                maxScore: activity.maxScore,
                timeLimitSec: activity.timeLimitSec,
                unitTitle: activity.unit.title,
                moduleTitle: activity.unit.module.title,
            },
            sourceContent: activity.unit.contents.length > 0 ? activity.unit.contents[0] : null,
            questions: sanitizedQuestions,
        });
    } catch (error) {
        console.error("Error fetching mediation activity:", error);
        return NextResponse.json(
            { error: "Failed to fetch activity" },
            { status: 500 }
        );
    }
}

