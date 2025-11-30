/**
 * Activity Service
 * Handles data operations for activities (reading, writing, speaking, listening)
 */

import prisma from "@/lib/prisma";
import { CEFRLevel, ActivityType, Skill } from "@prisma/client";

export class ActivityService {
    /**
     * Get activities by skill
     */
    async getActivitiesBySkill(
        skill: Skill,
        filters?: {
            level?: string;
            type?: string;
            topic?: string;
        }
    ) {
        const baseInclude: any = {
            unit: {
                select: {
                    title: true,
                    level: true,
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
        };

        // Add media for listening activities
        if (skill === "LISTENING") {
            baseInclude.media = {
                select: {
                    id: true,
                    type: true,
                    durationS: true,
                    url: true,
                },
            };
        }

        // Add module and contents for culture/mediation activities
        if (skill === "CULTURE" || skill === "MEDIATION") {
            baseInclude.unit = {
                select: {
                    title: true,
                    level: true,
                    module: {
                        select: {
                            title: true,
                            type: true,
                        },
                    },
                    ...(skill === "CULTURE" && {
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
                    }),
                },
            };
        }

        // Build where clause
        const whereClause: any = {
            skill,
            ...(filters?.level && { level: filters.level as CEFRLevel }),
            ...(filters?.type && { type: filters.type as ActivityType }),
        };

        // Add topic filter for culture activities
        if (skill === "CULTURE" && filters?.topic) {
            whereClause.unit = {
                contents: {
                    some: {
                        topics: {
                            some: {
                                slug: filters.topic,
                            },
                        },
                    },
                },
            };
        }

        const activities = await prisma.activity.findMany({
            where: whereClause,
            include: baseInclude,
            orderBy: [
                { level: "asc" },
                { createdAt: "desc" },
            ],
        });

        return activities;
    }

    /**
     * Get activity by ID with details
     * @deprecated Use getActivityByIdWithIncludes instead
     */
    async getActivityById(activityId: string) {
        const activity = await prisma.activity.findUnique({
            where: { id: activityId },
            include: {
                unit: {
                    select: {
                        title: true,
                        level: true,
                    },
                },
                questions: {
                    include: {
                        media: {
                            select: {
                                id: true,
                                url: true,
                                type: true,
                            },
                        },
                    },
                    orderBy: { order: "asc" },
                },
            },
        });

        return activity;
    }

    /**
     * Format activities for response
     */
    formatActivities(activities: any[], skill: Skill) {
        return activities.map((activity) => {
            const unit = Array.isArray(activity.unit) ? activity.unit[0] : activity.unit;
            const base = {
                id: activity.id,
                title: activity.title,
                instruction: activity.instruction,
                level: activity.level,
                type: activity.type,
                maxScore: activity.maxScore,
                timeLimitSec: activity.timeLimitSec,
                unitTitle: (unit as { title?: string } | null)?.title || "",
            };

            if (skill === "WRITING") {
                return {
                    ...base,
                    promptCount: activity._count.questions,
                    wordCountMin: 50, // TODO: Move to schema
                    wordCountMax: 300, // TODO: Move to schema
                };
            } else if (skill === "LISTENING") {
                return {
                    ...base,
                    questionCount: activity._count.questions,
                    audioDuration: activity.media?.[0]?.durationS || 0,
                    hasAudio: activity.media && activity.media.length > 0,
                };
            } else if (skill === "CULTURE") {
                return {
                    ...base,
                    questionCount: activity._count.questions,
                    moduleTitle: (unit as { module?: { title?: string } } | null)?.module?.title,
                    topics: (unit as { contents?: Array<{ topics?: Array<{ id: string; slug: string; title: string }> }> } | null)?.contents?.flatMap((c: any) =>
                        c.topics?.map((t: any) => ({ id: t.id, slug: t.slug, title: t.title })) || []
                    ) || [],
                };
            } else if (skill === "MEDIATION") {
                return {
                    ...base,
                    questionCount: activity._count.questions,
                    moduleTitle: (unit as { module?: { title?: string } } | null)?.module?.title,
                };
            } else {
                return {
                    ...base,
                    questionCount: activity._count.questions,
                };
            }
        });
    }

    /**
     * Format activity prompts for writing
     */
    formatWritingPrompts(activity: any) {
        return activity.questions.map((q: any) => ({
            id: q.id,
            order: q.order,
            type: q.type,
            prompt: q.prompt,
            score: q.score,
            wordCountMin: 50, // TODO: Move to schema
            wordCountMax: 300, // TODO: Move to schema
            referenceImage: Array.isArray(q.media) ? q.media[0]?.url : undefined,
        }));
    }

    /**
     * Format activity for reading
     */
    formatReadingActivity(activity: any) {
        const sanitizedQuestions = activity.questions.map((q: any) => ({
            id: q.id,
            order: q.order,
            type: q.type,
            prompt: q.prompt,
            score: q.score,
            content: q.content,
            choices: q.choices?.map((c: any) => ({
                id: c.id,
                order: c.order,
                text: c.text,
                value: c.value,
                // Don't send isCorrect
            })),
        }));

        const unit = Array.isArray(activity.unit) ? activity.unit[0] : activity.unit;
        return {
            activity: {
                id: activity.id,
                title: activity.title,
                instruction: activity.instruction,
                level: activity.level,
                type: activity.type,
                maxScore: activity.maxScore,
                timeLimitSec: activity.timeLimitSec,
                unitTitle: (unit as { title?: string } | null)?.title || "",
            },
            questions: sanitizedQuestions,
        };
    }

    /**
     * Format activity for speaking
     */
    formatSpeakingActivity(activity: any) {
        const prompts = activity.questions.map((q: any) => ({
            id: q.id,
            order: q.order,
            type: q.type,
            prompt: q.prompt,
            score: q.score,
            preparationTime: 30, // seconds to prepare
            recordingTime: 60, // seconds to record
            sampleAudio: Array.isArray(q.media) ? q.media[0]?.url : undefined,
        }));

        const unit = Array.isArray(activity.unit) ? activity.unit[0] : activity.unit;
        return {
            activity: {
                id: activity.id,
                title: activity.title,
                instruction: activity.instruction,
                level: activity.level,
                type: activity.type,
                maxScore: activity.maxScore,
                timeLimitSec: activity.timeLimitSec,
                unitTitle: (unit as { title?: string } | null)?.title || "",
            },
            prompts,
        };
    }

    /**
     * Format activity for listening
     */
    formatListeningActivity(activity: any) {
        const sanitizedQuestions = activity.questions.map((q: any) => ({
            id: q.id,
            order: q.order,
            type: q.type,
            prompt: q.prompt,
            score: q.score,
            audioUrl: Array.isArray(q.media) ? q.media[0]?.url : undefined,
            audioDuration: Array.isArray(q.media) ? q.media[0]?.durationS : undefined,
            choices: q.choices?.map((c: any) => ({
                id: c.id,
                order: c.order,
                text: c.text,
                value: c.value,
                // Don't send isCorrect
            })),
        }));

        const unit = Array.isArray(activity.unit) ? activity.unit[0] : activity.unit;
        return {
            activity: {
                id: activity.id,
                title: activity.title,
                instruction: activity.instruction,
                level: activity.level,
                type: activity.type,
                maxScore: activity.maxScore,
                timeLimitSec: activity.timeLimitSec,
                unitTitle: (unit as { title?: string } | null)?.title || "",
                audioUrl: activity.media[0]?.url,
                audioDuration: activity.media[0]?.durationS,
                audioMeta: activity.media[0]?.meta,
            },
            questions: sanitizedQuestions,
        };
    }

    /**
     * Get activity with appropriate includes based on skill
     */
    async getActivityByIdWithIncludes(activityId: string, skill: Skill) {
        const baseInclude: any = {
            unit: {
                select: {
                    title: true,
                    level: true,
                },
            },
        };

        if (skill === "WRITING") {
            baseInclude.questions = {
                include: {
                    media: {
                        select: {
                            id: true,
                            url: true,
                            type: true,
                        },
                    },
                },
                orderBy: { order: "asc" },
            };
        } else if (skill === "READING") {
            baseInclude.questions = {
                include: {
                    choices: {
                        orderBy: { order: "asc" },
                    },
                    content: {
                        select: {
                            title: true,
                            html: true,
                            plainText: true,
                        },
                    },
                },
                orderBy: { order: "asc" },
            };
        } else if (skill === "SPEAKING") {
            baseInclude.questions = {
                include: {
                    media: {
                        select: {
                            id: true,
                            url: true,
                            type: true,
                        },
                    },
                },
                orderBy: { order: "asc" },
            };
        } else if (skill === "LISTENING") {
            baseInclude.media = {
                select: {
                    id: true,
                    url: true,
                    type: true,
                    durationS: true,
                    meta: true,
                },
            };
            baseInclude.questions = {
                include: {
                    choices: {
                        orderBy: { order: "asc" },
                        select: {
                            id: true,
                            order: true,
                            text: true,
                            value: true,
                        },
                    },
                    media: {
                        select: {
                            id: true,
                            url: true,
                            type: true,
                            durationS: true,
                        },
                    },
                },
                orderBy: { order: "asc" },
            };
        } else if (skill === "CULTURE") {
            baseInclude.unit = {
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
            };
            baseInclude.questions = {
                include: {
                    choices: {
                        orderBy: { order: "asc" },
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
                orderBy: { order: "asc" },
            };
        } else if (skill === "MEDIATION") {
            baseInclude.unit = {
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
            };
            baseInclude.questions = {
                include: {
                    choices: {
                        orderBy: { order: "asc" },
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
                orderBy: { order: "asc" },
            };
        }

        const activity = await prisma.activity.findUnique({
            where: { id: activityId },
            include: baseInclude,
        });

        return activity;
    }

    /**
     * Format activity for culture
     */
    formatCultureActivity(activity: any) {
        const sanitizedQuestions = activity.questions.map((q: any) => ({
            id: q.id,
            order: q.order,
            type: q.type,
            prompt: q.prompt,
            score: q.score,
            content: q.content,
            choices: q.choices?.map((c: any) => ({
                id: c.id,
                order: c.order,
                text: c.text,
                value: c.value,
            })),
        }));

        const unit = Array.isArray(activity.unit) ? activity.unit[0] : activity.unit;
        return {
            activity: {
                id: activity.id,
                title: activity.title,
                instruction: activity.instruction,
                level: activity.level,
                type: activity.type,
                maxScore: activity.maxScore,
                timeLimitSec: activity.timeLimitSec,
                unitTitle: (unit as { title?: string } | null)?.title || "",
                moduleTitle: (unit as { module?: { title?: string } } | null)?.module?.title,
            },
            article: (unit as { contents?: unknown[] } | null)?.contents && (unit as { contents?: unknown[] }).contents!.length > 0 ? (unit as { contents?: unknown[] }).contents![0] : null,
            questions: sanitizedQuestions,
        };
    }

    /**
     * Format activity for mediation
     */
    formatMediationActivity(activity: any) {
        const sanitizedQuestions = activity.questions.map((q: any) => ({
            id: q.id,
            order: q.order,
            type: q.type,
            prompt: q.prompt,
            score: q.score,
            content: q.content,
            choices: q.choices?.map((c: any) => ({
                id: c.id,
                order: c.order,
                text: c.text,
                value: c.value,
            })),
        }));

        const unit = Array.isArray(activity.unit) ? activity.unit[0] : activity.unit;
        return {
            activity: {
                id: activity.id,
                title: activity.title,
                instruction: activity.instruction,
                level: activity.level,
                type: activity.type,
                maxScore: activity.maxScore,
                timeLimitSec: activity.timeLimitSec,
                unitTitle: (unit as { title?: string } | null)?.title || "",
                moduleTitle: (unit as { module?: { title?: string } } | null)?.module?.title,
            },
            sourceContent: (unit as { contents?: unknown[] } | null)?.contents && (unit as { contents?: unknown[] }).contents!.length > 0 ? (unit as { contents?: unknown[] }).contents![0] : null,
            questions: sanitizedQuestions,
        };
    }
}

export const activityService = new ActivityService();

