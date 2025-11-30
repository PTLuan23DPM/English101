/**
 * Analytics Service
 * Handles data operations for analytics
 */

import prisma from "@/lib/prisma";

export class AnalyticsService {
    /**
     * Get analytics data
     */
    async getAnalytics(
        userId: string,
        filters?: {
            skill?: string;
            timeframe?: string;
        }
    ) {
        // Calculate date filter
        let dateFilter: Date | undefined;
        if (filters?.timeframe === "week") {
            dateFilter = new Date();
            dateFilter.setDate(dateFilter.getDate() - 7);
        } else if (filters?.timeframe === "month") {
            dateFilter = new Date();
            dateFilter.setMonth(dateFilter.getMonth() - 1);
        }

        // Build where clause
        const whereClause: any = {
            userId,
            completed: true,
            score: { not: null },
        };

        if (filters?.skill && filters.skill !== "all") {
            whereClause.skill = filters.skill;
        }

        if (dateFilter) {
            whereClause.date = { gte: dateFilter };
        }

        // Fetch activities
        const activities = await prisma.userActivity.findMany({
            where: whereClause,
            select: {
                id: true,
                skill: true,
                score: true,
                date: true,
                metadata: true,
            },
            orderBy: { date: "desc" },
        });

        return activities;
    }

    /**
     * Calculate criteria scores from activities
     */
    calculateCriteriaScores(activities: any[]) {
        const criteriaScores: Record<
            string,
            { total: number; count: number; scores: number[] }
        > = {
            taskResponse: { total: 0, count: 0, scores: [] },
            coherence: { total: 0, count: 0, scores: [] },
            lexical: { total: 0, count: 0, scores: [] },
            grammar: { total: 0, count: 0, scores: [] },
        };

        activities.forEach((activity) => {
            const metadata = activity.metadata as any;
            if (metadata && metadata.scoringDetails) {
                const details = metadata.scoringDetails;

                if (details.task_response) {
                    criteriaScores.taskResponse.total += details.task_response;
                    criteriaScores.taskResponse.count += 1;
                    criteriaScores.taskResponse.scores.push(details.task_response);
                }
                if (details.coherence) {
                    criteriaScores.coherence.total += details.coherence;
                    criteriaScores.coherence.count += 1;
                    criteriaScores.coherence.scores.push(details.coherence);
                }
                if (details.lexical) {
                    criteriaScores.lexical.total += details.lexical;
                    criteriaScores.lexical.count += 1;
                    criteriaScores.lexical.scores.push(details.lexical);
                }
                if (details.grammar) {
                    criteriaScores.grammar.total += details.grammar;
                    criteriaScores.grammar.count += 1;
                    criteriaScores.grammar.scores.push(details.grammar);
                }
            }
        });

        return criteriaScores;
    }

    /**
     * Format analytics data
     */
    formatAnalytics(activities: any[]) {
        const criteriaScores = this.calculateCriteriaScores(activities);

        // Calculate averages
        const analytics = Object.entries(criteriaScores).map(([key, data]) => {
            const avg = data.count > 0 ? data.total / data.count : 0;
            const max = data.scores.length > 0 ? Math.max(...data.scores) : 0;
            const min = data.scores.length > 0 ? Math.min(...data.scores) : 0;

            return {
                criterion: key,
                average: parseFloat(avg.toFixed(2)),
                max: parseFloat(max.toFixed(2)),
                min: parseFloat(min.toFixed(2)),
                count: data.count,
            };
        });

        // Sort by average (identify weaknesses)
        analytics.sort((a, b) => a.average - b.average);

        // Identify strengths (top 2) and weaknesses (bottom 2)
        const strengths = analytics.slice(-2).reverse();
        const weaknesses = analytics.slice(0, 2);

        // Calculate score over time
        const scoreOverTime = activities.map((act) => ({
            date: act.date.toISOString(),
            score: act.score ? act.score * 10 : 0,
            skill: act.skill,
        }));

        return {
            criteriaScores: analytics,
            strengths,
            weaknesses,
            scoreOverTime,
            totalActivities: activities.length,
        };
    }
}

export const analyticsService = new AnalyticsService();

