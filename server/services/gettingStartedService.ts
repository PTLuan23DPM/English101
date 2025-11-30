/**
 * Getting Started Service
 * Handles getting started tasks for new users
 */

import prisma from "@/lib/prisma";

export interface GettingStartedTask {
    id: string;
    type: string;
    title: string;
    description: string;
    link: string;
    completed: boolean;
    order: number;
}

export class GettingStartedService {
    /**
     * Get all available task types
     */
    private getAvailableTaskTypes(): Array<{
        type: string;
        title: string;
        description: string;
        link: string;
        checkCompletion: (userId: string) => Promise<boolean>;
    }> {
        return [
            {
                type: "set_goals",
                title: "Set your learning goals",
                description: "Define what you want to achieve",
                link: "/english/goals",
                checkCompletion: async (userId: string) => {
                    // Check if user has any goal (not getting_started type)
                    const goal = await prisma.userGoal.findFirst({
                        where: { 
                            userId, 
                            type: { not: "getting_started" }
                        },
                    });
                    return !!goal;
                },
            },
            {
                type: "placement_test",
                title: "Take placement test",
                description: "Determine your English level",
                link: "/english/test",
                checkCompletion: async (userId: string) => {
                    const test = await prisma.placementTestResult.findFirst({
                        where: { userId },
                    });
                    return !!test;
                },
            },
            {
                type: "first_writing",
                title: "Complete your first writing task",
                description: "Practice writing skills",
                link: "/english/writing",
                checkCompletion: async (userId: string) => {
                    const attempt = await prisma.attempt.findFirst({
                        where: {
                            userId,
                            submittedAt: { not: null },
                            activity: {
                                skill: "WRITING",
                            },
                        },
                    });
                    return !!attempt;
                },
            },
            {
                type: "review_progress",
                title: "Review your progress",
                description: "Check your learning statistics",
                link: "/english/progress",
                checkCompletion: async (userId: string) => {
                    // Check if user has viewed progress page (we can track this via a simple flag or just return true if they have any attempts)
                    const hasActivity = await prisma.attempt.findFirst({
                        where: { userId, submittedAt: { not: null } },
                    });
                    return !!hasActivity;
                },
            },
            {
                type: "first_listening",
                title: "Complete your first listening exercise",
                description: "Practice listening skills",
                link: "/english/listening",
                checkCompletion: async (userId: string) => {
                    const attempt = await prisma.attempt.findFirst({
                        where: {
                            userId,
                            submittedAt: { not: null },
                            activity: {
                                skill: "LISTENING",
                            },
                        },
                    });
                    return !!attempt;
                },
            },
            {
                type: "first_reading",
                title: "Complete your first reading exercise",
                description: "Practice reading comprehension",
                link: "/english/reading",
                checkCompletion: async (userId: string) => {
                    const attempt = await prisma.attempt.findFirst({
                        where: {
                            userId,
                            submittedAt: { not: null },
                            activity: {
                                skill: "READING",
                            },
                        },
                    });
                    return !!attempt;
                },
            },
            {
                type: "first_speaking",
                title: "Complete your first speaking exercise",
                description: "Practice speaking skills",
                link: "/english/speaking",
                checkCompletion: async (userId: string) => {
                    const attempt = await prisma.attempt.findFirst({
                        where: {
                            userId,
                            submittedAt: { not: null },
                            activity: {
                                skill: "SPEAKING",
                            },
                        },
                    });
                    return !!attempt;
                },
            },
        ];
    }

    /**
     * Get getting started tasks for a user (random selection of 4 tasks)
     */
    async getGettingStartedTasks(userId: string): Promise<{
        tasks: GettingStartedTask[];
        progress: number;
        totalTasks: number;
        completedTasks: number;
    }> {
        try {
            const availableTasks = this.getAvailableTaskTypes();
            
            // Get user's completed tasks from database (stored in UserGoal with type "getting_started")
            const userCompletedTasks = await prisma.userGoal.findMany({
                where: {
                    userId,
                    type: "getting_started",
                    completed: true,
                },
                select: {
                    id: true,
                    metadata: true,
                },
            });

            const completedTaskTypes = new Set(
                userCompletedTasks
                    .map(t => (t.metadata as any)?.taskType)
                    .filter(Boolean)
            );

            // Check completion status for all tasks
            const tasksWithStatus = await Promise.all(
                availableTasks.map(async (task, index) => {
                    const isCompleted = 
                        completedTaskTypes.has(task.type) || 
                        await task.checkCompletion(userId);
                    
                    return {
                        id: `task_${task.type}`,
                        type: task.type,
                        title: task.title,
                        description: task.description,
                        link: task.link,
                        completed: isCompleted,
                        order: index,
                    };
                })
            );

            // Select 4 random tasks (prioritize uncompleted ones)
            const uncompletedTasks = tasksWithStatus.filter(t => !t.completed);
            const completedTasks = tasksWithStatus.filter(t => t.completed);
            
            // Shuffle and select
            const shuffledUncompleted = this.shuffleArray([...uncompletedTasks]);
            const shuffledCompleted = this.shuffleArray([...completedTasks]);
            
            // Take up to 4 tasks (prefer uncompleted, then fill with completed)
            const selectedTasks: GettingStartedTask[] = [];
            selectedTasks.push(...shuffledUncompleted.slice(0, 4));
            if (selectedTasks.length < 4) {
                selectedTasks.push(...shuffledCompleted.slice(0, 4 - selectedTasks.length));
            }
            
            // Sort by order (keep original order for consistency)
            selectedTasks.sort((a, b) => a.order - b.order);

            // Calculate progress
            const completedCount = selectedTasks.filter(t => t.completed).length;
            const totalCount = selectedTasks.length;
            const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

            // Save selected tasks to database if not exists
            for (const task of selectedTasks) {
                const existing = await prisma.userGoal.findFirst({
                    where: {
                        userId,
                        type: "getting_started",
                        id: task.id,
                    },
                });

                if (!existing) {
                    await prisma.userGoal.create({
                        data: {
                            id: task.id,
                            userId,
                            type: "getting_started",
                            target: 1,
                            current: task.completed ? 1 : 0,
                            completed: task.completed,
                            metadata: {
                                taskType: task.type,
                                title: task.title,
                                description: task.description,
                                link: task.link,
                                order: task.order,
                            },
                        },
                    });
                } else if (existing.completed !== task.completed) {
                    // Update completion status
                    await prisma.userGoal.update({
                        where: { id: existing.id },
                        data: {
                            completed: task.completed,
                            current: task.completed ? 1 : 0,
                        },
                    });
                }
            }

            return {
                tasks: selectedTasks,
                progress,
                totalTasks: totalCount,
                completedTasks: completedCount,
            };
        } catch (error: any) {
            console.error("[GettingStartedService] Error getting tasks:", error);
            // Return default tasks on error
            return {
                tasks: [],
                progress: 0,
                totalTasks: 0,
                completedTasks: 0,
            };
        }
    }

    /**
     * Mark a getting started task as completed
     */
    async markTaskCompleted(userId: string, taskType: string): Promise<boolean> {
        try {
            // Find task by id (format: task_${taskType})
            const taskId = `task_${taskType}`;
            const task = await prisma.userGoal.findFirst({
                where: {
                    userId,
                    type: "getting_started",
                    id: taskId,
                },
            });

            if (task && !task.completed) {
                await prisma.userGoal.update({
                    where: { id: task.id },
                    data: {
                        completed: true,
                        current: 1,
                    },
                });
                return true;
            }

            // If task doesn't exist, create it
            if (!task) {
                const taskConfig = this.getAvailableTaskTypes().find(t => t.type === taskType);
                if (taskConfig) {
                    await prisma.userGoal.create({
                        data: {
                            id: taskId,
                            userId,
                            type: "getting_started",
                            target: 1,
                            current: 1,
                            completed: true,
                            metadata: {
                                taskType: taskType,
                                title: taskConfig.title,
                                description: taskConfig.description,
                                link: taskConfig.link,
                            },
                        },
                    });
                    return true;
                }
            }

            return false;
        } catch (error: any) {
            console.error("[GettingStartedService] Error marking task completed:", error);
            return false;
        }
    }

    /**
     * Shuffle array (Fisher-Yates algorithm)
     */
    private shuffleArray<T>(array: T[]): T[] {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }
}

export const gettingStartedService = new GettingStartedService();

