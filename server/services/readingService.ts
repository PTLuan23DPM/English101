/**
 * Reading Service
 * Handles data operations for reading exercises
 * Naming Convention: camelCase for files and functions
 */

import { Exercise } from '../../types/exerciseTypes';
import { promises as fs } from 'fs';
import path from 'path';
import prisma from '@/lib/prisma';

export class ReadingService {
    private exercisesCache: Map<string, Exercise> = new Map();
    private exercisesDir = path.join(process.cwd(), 'exercises', 'reading');

    /**
     * Load all exercises from JSON files
     */
    async loadExercises(): Promise<void> {
        try {
            const levels = ['a1', 'a2', 'b1', 'b2', 'c1', 'c2'];

            for (const level of levels) {
                const levelDir = path.join(this.exercisesDir, level);

                try {
                    const files = await fs.readdir(levelDir);

                    for (const file of files) {
                        if (file.endsWith('.json')) {
                            const filePath = path.join(levelDir, file);
                            const content = await fs.readFile(filePath, 'utf-8');
                            const exercise: Exercise = JSON.parse(content);

                            this.exercisesCache.set(exercise.id, exercise);
                        }
                    }
                } catch (error) {
                    // Directory might not exist, skip
                    console.warn(`[ReadingService] Directory not found: ${levelDir}`);
                }
            }

            console.log(`[ReadingService] Loaded ${this.exercisesCache.size} exercises`);
        } catch (error) {
            console.error('[ReadingService] Error loading exercises:', error);
            throw error;
        }
    }

    /**
     * Find all exercises with filters
     */
    async findAll(filters?: {
        level?: string;
        type?: string;
        page?: number;
        pageSize?: number;
    }): Promise<Exercise[]> {
        // Ensure exercises are loaded
        if (this.exercisesCache.size === 0) {
            await this.loadExercises();
        }

        let exercises = Array.from(this.exercisesCache.values());

        // Apply filters
        if (filters?.level) {
            exercises = exercises.filter(
                (e) => e.level.toLowerCase() === filters.level?.toLowerCase()
            );
        }

        if (filters?.type) {
            exercises = exercises.filter((e) => e.type === filters.type);
        }

        // Apply pagination
        const page = filters?.page || 1;
        const pageSize = filters?.pageSize || 20;
        const start = (page - 1) * pageSize;
        const end = start + pageSize;

        return exercises.slice(start, end);
    }

    /**
     * Find exercise by ID
     */
    async findById(exerciseId: string): Promise<Exercise | null> {
        // Ensure exercises are loaded
        if (this.exercisesCache.size === 0) {
            await this.loadExercises();
        }

        return this.exercisesCache.get(exerciseId) || null;
    }

    /**
     * Save user attempt to database
     */
    async saveAttempt(
        userId: string,
        submission: any,
        result: any
    ): Promise<void> {
        try {
            // This is a placeholder - implement your database save logic
            await prisma.attempt.create({
                data: {
                    userId,
                    activityId: submission.exerciseId,
                    startedAt: new Date(submission.startTime),
                    submittedAt: new Date(submission.endTime),
                    score: result.totalScore,
                    status: 'graded',
                    meta: {
                        timeTaken: submission.timeTakenSeconds,
                        percentage: result.percentage,
                        passed: result.passed,
                    },
                },
            });
        } catch (error) {
            console.error('[ReadingService] Error saving attempt:', error);
            throw error;
        }
    }

    /**
     * Get user's reading attempts
     */
    async getUserAttempts(userId: string, filters?: {
        skill?: string;
        level?: string;
        limit?: number;
    }) {
        try {
            const attempts = await prisma.attempt.findMany({
                where: {
                    userId,
                    activity: {
                        skill: 'READING',
                        ...(filters?.level && { level: filters.level as any }),
                    },
                },
                include: {
                    activity: {
                        select: {
                            title: true,
                            level: true,
                            type: true,
                        },
                    },
                },
                orderBy: {
                    submittedAt: 'desc',
                },
                take: filters?.limit || 50,
            });

            return attempts;
        } catch (error) {
            console.error('[ReadingService] Error fetching attempts:', error);
            throw error;
        }
    }
}

// Export singleton instance
export const readingService = new ReadingService();

