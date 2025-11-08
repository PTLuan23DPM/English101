/**
 * Grading Service
 * Handles auto-grading logic for exercises
 * Naming Convention: camelCase
 */

import {
    Exercise,
    SubmissionRequest,
    SubmissionResponse,
    QuestionResult,
    QuestionType,
} from '../../types/exerciseTypes';

export class GradingService {
    /**
     * Grade a submission
     */
    async gradeSubmission(
        exercise: Exercise,
        submission: SubmissionRequest
    ): Promise<SubmissionResponse> {
        const results: QuestionResult[] = [];
        let totalScore = 0;

        // Grade each question
        for (const question of exercise.questions) {
            const userAnswer = submission.answers.find(
                (a) => a.questionId === question.id
            );

            const result = this.gradeQuestion(question, userAnswer);
            results.push(result);
            totalScore += result.pointsEarned;
        }

        const percentage = Math.round((totalScore / exercise.totalPoints) * 100);
        const passed = totalScore >= exercise.passingScore;

        // Generate feedback
        const feedback = this.generateFeedback(percentage, results, exercise);

        return {
            attemptId: '', // Will be set by service after saving
            totalScore,
            maxScore: exercise.totalPoints,
            percentage,
            passed,
            results,
            feedback,
        };
    }

    /**
     * Grade a single question
     */
    private gradeQuestion(question: any, userAnswer: any): QuestionResult {
        let isCorrect = false;
        let correctAnswer: any;

        if (!userAnswer) {
            // No answer provided
            return {
                questionId: question.id,
                isCorrect: false,
                pointsEarned: 0,
                maxPoints: question.points,
                explanation: question.explanation,
            };
        }

        switch (question.type) {
            case 'SINGLE_CHOICE':
            case 'TRUE_FALSE':
                // Single choice: check if chosen ID matches correct choice
                const correctChoice = question.choices?.find((c: any) => c.isCorrect);
                isCorrect = userAnswer.chosenIds?.[0] === correctChoice?.id;
                correctAnswer = correctChoice?.text;
                break;

            case 'MULTI_CHOICE':
                // Multi choice: all correct must be selected, no wrong ones
                const correctIds = question.choices
                    ?.filter((c: any) => c.isCorrect)
                    .map((c: any) => c.id);
                const userIds = userAnswer.chosenIds || [];
                isCorrect =
                    correctIds?.length === userIds.length &&
                    correctIds?.every((id: string) => userIds.includes(id));
                correctAnswer = question.choices
                    ?.filter((c: any) => c.isCorrect)
                    .map((c: any) => c.text)
                    .join(', ');
                break;

            case 'SHORT_TEXT':
                // Text answer: case-insensitive comparison with multiple possible answers
                const userText = (userAnswer.answerText || '').toLowerCase().trim();
                const possibleAnswers = question.correctAnswers || [
                    question.correctAnswer,
                ];
                isCorrect = possibleAnswers.some(
                    (ans: string) => ans.toLowerCase().trim() === userText
                );
                correctAnswer = possibleAnswers[0];
                break;

            case 'GAP_FILL':
                // Similar to short text but may have multiple blanks
                isCorrect = this.checkGapFill(question, userAnswer);
                correctAnswer = question.correctAnswers?.join(', ');
                break;

            default:
                // Unknown question type
                console.warn(`[GradingService] Unknown question type: ${question.type}`);
        }

        return {
            questionId: question.id,
            isCorrect,
            pointsEarned: isCorrect ? question.points : 0,
            maxPoints: question.points,
            correctAnswer,
            explanation: question.explanation,
        };
    }

    /**
     * Check gap fill answers
     */
    private checkGapFill(question: any, userAnswer: any): boolean {
        const userTexts = userAnswer.answerText?.split('|') || [];
        const correctAnswers = question.correctAnswers || [];

        if (userTexts.length !== correctAnswers.length) {
            return false;
        }

        return userTexts.every((text: string, index: number) => {
            return text.toLowerCase().trim() === correctAnswers[index].toLowerCase().trim();
        });
    }

    /**
     * Generate feedback based on performance
     */
    private generateFeedback(
        percentage: number,
        results: QuestionResult[],
        exercise: Exercise
    ) {
        const correctCount = results.filter((r) => r.isCorrect).length;
        const totalQuestions = results.length;

        let overall = '';
        const strengths: string[] = [];
        const weaknesses: string[] = [];
        const suggestions: string[] = [];

        // Overall feedback
        if (percentage >= 90) {
            overall = 'Excellent work! You have a strong understanding of this material.';
            strengths.push('Consistently accurate answers');
            strengths.push('Strong comprehension skills');
        } else if (percentage >= 75) {
            overall = 'Great job! You demonstrate good understanding with minor areas for improvement.';
            strengths.push('Good overall comprehension');
            weaknesses.push('A few questions need more attention');
            suggestions.push('Review the questions you missed');
        } else if (percentage >= 60) {
            overall = 'Good effort! You understand the basics but need more practice.';
            weaknesses.push('Some comprehension gaps');
            suggestions.push('Re-read the passage carefully');
            suggestions.push('Pay attention to key details');
        } else {
            overall = 'Keep practicing! Focus on understanding the main ideas and details.';
            weaknesses.push('Need to improve comprehension');
            suggestions.push('Read the passage multiple times');
            suggestions.push('Look up unfamiliar vocabulary');
            suggestions.push('Practice with easier texts first');
        }

        // Specific feedback based on question types
        const questionTypes = new Set(exercise.questions.map((q) => q.type));

        if (questionTypes.has('SINGLE_CHOICE')) {
            const choiceScore = this.getTypeScore(exercise, results, 'SINGLE_CHOICE');
            if (choiceScore < 70) {
                weaknesses.push('Multiple choice comprehension');
                suggestions.push('Practice identifying key information');
            }
        }

        return {
            overall,
            strengths,
            weaknesses,
            suggestions,
        };
    }

    /**
     * Calculate score for specific question type
     */
    private getTypeScore(exercise: Exercise, results: QuestionResult[], type: QuestionType): number {
        const typeQuestions = exercise.questions.filter((q) => q.type === type);
        if (typeQuestions.length === 0) return 100;

        const typeResults = results.filter((r) =>
            typeQuestions.some((q) => q.id === r.questionId)
        );

        const totalPoints = typeResults.reduce((sum, r) => sum + r.maxPoints, 0);
        const earnedPoints = typeResults.reduce((sum, r) => sum + r.pointsEarned, 0);

        return Math.round((earnedPoints / totalPoints) * 100);
    }
}

// Export singleton instance
export const gradingService = new GradingService();

