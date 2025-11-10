import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { CEFRLevel, ActivityType } from "@prisma/client";

/**
 * @swagger
 * /api/culture/activities:
 *   get:
 *     summary: Get culture & topics activities
 *     tags: [Culture]
 *     parameters:
 *       - in: query
 *         name: level
 *         schema:
 *           type: string
 *         description: CEFR level filter (A1, A2, B1, B2, C1, C2)
 *       - in: query
 *         name: topic
 *         schema:
 *           type: string
 *         description: Topic category filter
 *     responses:
 *       200:
 *         description: List of culture activities
 *       401:
 *         description: Unauthorized
 */
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const level = searchParams.get("level");
        const topic = searchParams.get("topic");

        // Build where clause conditionally
        const whereConditions: any = {
            skill: "CULTURE",
        };

        if (level) {
            whereConditions.level = level as CEFRLevel;
        }

        if (topic) {
            whereConditions.unit = {
                contents: {
                    some: {
                        topics: {
                            some: {
                                slug: topic,
                            },
                        },
                    },
                },
            };
        }

        const activities = await prisma.activity.findMany({
            where: whereConditions,
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
                                topics: {
                                    select: {
                                        id: true,
                                        slug: true,
                                        title: true,
                                    },
                                },
                            },
                        },
                    },
                },
                questions: {
                    select: {
                        id: true,
                        order: true,
                        type: true,
                        score: true,
                    },
                },
                _count: {
                    select: {
                        questions: true,
                    },
                },
            },
            orderBy: [
                { level: 'asc' },
                { createdAt: 'desc' },
            ],
        });

        return NextResponse.json({
            activities: activities.map((activity) => ({
                id: activity.id,
                title: activity.title,
                instruction: activity.instruction,
                level: activity.level,
                type: activity.type,
                maxScore: activity.maxScore,
                timeLimitSec: activity.timeLimitSec,
                unitTitle: activity.unit.title,
                moduleTitle: activity.unit.module.title,
                questionCount: activity._count.questions,
                topics: activity.unit.contents.flatMap(c =>
                    c.topics.map(t => ({ id: t.id, slug: t.slug, title: t.title }))
                ),
            })),
        });
    } catch (error) {
        console.error("Error fetching culture activities:", error);
        return NextResponse.json(
            { error: "Failed to fetch activities" },
            { status: 500 }
        );
    }
}
