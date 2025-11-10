/**
 * Goals Controller
 * Handles business logic for user goals
 */

import { goalsService } from "../services/goalsService";

export class GoalsController {
    /**
     * Get all goals for a user
     */
    async getGoals(userId: string) {
        try {
            const goals = await goalsService.getGoals(userId);

            return {
                success: true,
                data: { goals },
                status: 200,
            };
        } catch (error: any) {
            console.error("[GoalsController] Error getting goals:", error);
            return {
                success: false,
                data: { error: error.message || "Failed to get goals" },
                status: 500,
            };
        }
    }

    /**
     * Get goal by ID
     */
    async getGoalById(goalId: string, userId: string) {
        try {
            const goal = await goalsService.getGoalById(goalId, userId);

            if (!goal) {
                throw new Error("Goal not found");
            }

            return {
                success: true,
                data: { goal },
            };
        } catch (error) {
            console.error("[GoalsController] Error getting goal:", error);
            throw error;
        }
    }

    /**
     * Create a new goal
     */
    async createGoal(
        userId: string,
        data: {
            type: string;
            target: number;
            deadline?: Date | string | null;
            metadata?: any;
        }
    ) {
        try {
            if (!data.type || !data.target) {
                return {
                    success: false,
                    data: { error: "Missing required fields: type, target" },
                    status: 400,
                };
            }

            // Valid goal types
            const validTypes = [
                "daily_exercises",
                "weekly_hours",
                "target_level",
                "skill_improvement",
                "vocabulary_words",
                "reading_articles",
                "writing_essays",
                "speaking_practice",
                "listening_hours",
            ];

            if (!validTypes.includes(data.type)) {
                return {
                    success: false,
                    data: { error: "Invalid goal type" },
                    status: 400,
                };
            }

            if (typeof data.target !== "number" || data.target <= 0) {
                return {
                    success: false,
                    data: { error: "Target must be a positive number" },
                    status: 400,
                };
            }

            const goal = await goalsService.createGoal(userId, {
                type: data.type,
                target: data.target,
                deadline: data.deadline ? new Date(data.deadline) : null,
                metadata: data.metadata,
            });

            return {
                success: true,
                data: { goal },
                status: 201,
            };
        } catch (error: any) {
            console.error("[GoalsController] Error creating goal:", error);
            return {
                success: false,
                data: { error: error.message || "Failed to create goal" },
                status: 500,
            };
        }
    }

    /**
     * Update a goal
     */
    async updateGoal(
        userId: string,
        goalId: string,
        data: {
            type?: string;
            target?: number;
            current?: number;
            deadline?: Date | string | null;
            completed?: boolean;
            metadata?: any;
        }
    ) {
        try {
            const goal = await goalsService.getGoalById(goalId, userId);

            if (!goal) {
                return {
                    success: false,
                    data: { error: "Goal not found" },
                    status: 404,
                };
            }

            // Auto-complete if target reached
            if (data.current !== undefined && data.current >= goal.target) {
                data.completed = true;
            }

            await goalsService.updateGoal(goalId, userId, {
                ...data,
                deadline: data.deadline ? new Date(data.deadline) : data.deadline,
            });

            const updatedGoal = await goalsService.getGoalById(goalId, userId);

            return {
                success: true,
                data: { goal: updatedGoal },
                status: 200,
            };
        } catch (error: any) {
            console.error("[GoalsController] Error updating goal:", error);
            return {
                success: false,
                data: { error: error.message || "Failed to update goal" },
                status: 500,
            };
        }
    }

    /**
     * Delete a goal
     */
    async deleteGoal(userId: string, goalId: string) {
        try {
            const goal = await goalsService.getGoalById(goalId, userId);

            if (!goal) {
                return {
                    success: false,
                    data: { error: "Goal not found" },
                    status: 404,
                };
            }

            await goalsService.deleteGoal(goalId, userId);

            return {
                success: true,
                data: { message: "Goal deleted successfully" },
                status: 200,
            };
        } catch (error: any) {
            console.error("[GoalsController] Error deleting goal:", error);
            return {
                success: false,
                data: { error: error.message || "Failed to delete goal" },
                status: 500,
            };
        }
    }
}

export const goalsController = new GoalsController();

