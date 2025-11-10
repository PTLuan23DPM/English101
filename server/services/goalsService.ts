/**
 * Goals Service
 * Handles data operations for user goals
 */

import prisma from "@/lib/prisma";

export class GoalsService {
    /**
     * Get all goals for a user
     */
    async getGoals(userId: string) {
        return await prisma.userGoal.findMany({
            where: { userId },
            orderBy: [{ completed: "asc" }, { createdAt: "desc" }],
        });
    }

    /**
     * Get goal by ID
     */
    async getGoalById(goalId: string, userId: string) {
        return await prisma.userGoal.findFirst({
            where: {
                id: goalId,
                userId,
            },
        });
    }

    /**
     * Create a new goal
     */
    async createGoal(
        userId: string,
        data: {
            type: string;
            target: number;
            deadline?: Date | null;
            metadata?: any;
        }
    ) {
        return await prisma.userGoal.create({
            data: {
                userId,
                type: data.type,
                target: data.target,
                deadline: data.deadline || null,
                current: 0,
                completed: false,
                metadata: data.metadata || {},
            },
        });
    }

    /**
     * Update a goal
     */
    async updateGoal(
        goalId: string,
        userId: string,
        data: {
            type?: string;
            target?: number;
            current?: number;
            deadline?: Date | null;
            completed?: boolean;
            metadata?: any;
        }
    ) {
        return await prisma.userGoal.updateMany({
            where: {
                id: goalId,
                userId,
            },
            data: {
                ...(data.type && { type: data.type }),
                ...(data.target !== undefined && { target: data.target }),
                ...(data.current !== undefined && { current: data.current }),
                ...(data.deadline !== undefined && { deadline: data.deadline }),
                ...(data.completed !== undefined && { completed: data.completed }),
                ...(data.metadata && { metadata: data.metadata }),
            },
        });
    }

    /**
     * Delete a goal
     */
    async deleteGoal(goalId: string, userId: string) {
        return await prisma.userGoal.deleteMany({
            where: {
                id: goalId,
                userId,
            },
        });
    }
}

export const goalsService = new GoalsService();

