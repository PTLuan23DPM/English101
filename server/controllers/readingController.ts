/**
 * Reading Controller
 * Handles business logic for reading exercises
 * Naming Convention: camelCase for files, PascalCase for classes
 */

import { Exercise, SubmissionRequest, SubmissionResponse } from '../../types/exerciseTypes';
import { readingService } from '../services/readingService';
import { gradingService } from '../services/gradingService';

export class ReadingController {
    /**
     * Get all reading exercises with optional filters
     */
    async getExercises(filters?: {
        level?: string;
        type?: string;
        page?: number;
        pageSize?: number;
    }) {
        try {
            const exercises = await readingService.findAll(filters);
            return {
                success: true,
                data: exercises,
            };
        } catch (error) {
            console.error('[ReadingController] Error fetching exercises:', error);
            throw new Error('Failed to fetch reading exercises');
        }
    }

    /**
     * Get single exercise by ID
     */
    async getExerciseById(exerciseId: string) {
        try {
            const exercise = await readingService.findById(exerciseId);

            if (!exercise) {
                throw new Error('Exercise not found');
            }

            // Remove correct answers from questions before sending to client
            const sanitizedExercise = this.sanitizeExercise(exercise);

            return {
                success: true,
                data: sanitizedExercise,
            };
        } catch (error) {
            console.error('[ReadingController] Error fetching exercise:', error);
            throw error;
        }
    }

    /**
     * Submit and grade exercise
     */
    async submitExercise(
        userId: string,
        submission: SubmissionRequest
    ): Promise<SubmissionResponse> {
        try {
            // Load exercise with correct answers
            const exercise = await readingService.findById(submission.exerciseId);

            if (!exercise) {
                throw new Error('Exercise not found');
            }

            // Grade the submission
            const result = await gradingService.gradeSubmission(
                exercise,
                submission
            );

            // Save to database
            await readingService.saveAttempt(userId, submission, result);

            return result;
        } catch (error) {
            console.error('[ReadingController] Error submitting exercise:', error);
            throw error;
        }
    }

    /**
     * Get user's exercise history
     */
    async getUserHistory(userId: string, filters?: {
        skill?: string;
        level?: string;
        limit?: number;
    }) {
        try {
            const history = await readingService.getUserAttempts(userId, filters);
            return {
                success: true,
                data: history,
            };
        } catch (error) {
            console.error('[ReadingController] Error fetching history:', error);
            throw error;
        }
    }

    /**
     * Remove correct answers from exercise
     * Private helper method
     */
    private sanitizeExercise(exercise: Exercise): Exercise {
        return {
            ...exercise,
            questions: exercise.questions.map((q) => ({
                ...q,
                choices: q.choices?.map((c) => ({
                    id: c.id,
                    text: c.text,
                    isCorrect: false, // Hide correct answer from client
                })),
                // Remove correctAnswer and correctAnswers
                correctAnswer: undefined,
                correctAnswers: undefined,
            })),
        };
    }
}

// Export singleton instance
export const readingController = new ReadingController();

