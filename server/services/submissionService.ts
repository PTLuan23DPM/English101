import prisma from "@/lib/prisma";
import { Skill } from "@prisma/client";

interface AnswerSubmission {
    questionId: string;
    chosenIds: string[];
    answerText?: string;
}

interface SubmissionResult {
    attemptId: string;
    totalScore: number;
    maxScore: number;
    percentage: number;
    answers: Array<{
        questionId: string;
        isCorrect: boolean;
        score: number;
        maxScore: number;
        correctAnswer?: string;
        explanation?: string | null;
        feedback?: string;
    }>;
    skillLevel?: string;
    listenCount?: number;
    feedback?: {
        overall: string;
        suggestions: string[];
    };
    message?: string;
}

class SubmissionService {
    /**
     * Get activity with questions for grading
     */
    async getActivityWithQuestions(activityId: string) {
        return await prisma.activity.findUnique({
            where: { id: activityId },
            include: {
                questions: {
                    include: {
                        choices: true,
                        answers: true,
                    },
                },
            },
        });
    }

    /**
     * Create a new attempt
     */
    async createAttempt(
        userId: string,
        activityId: string,
        startTime: string,
        meta?: Record<string, any>
    ) {
        return await prisma.attempt.create({
            data: {
                userId,
                activityId,
                startedAt: new Date(startTime),
                submittedAt: new Date(),
                status: "submitted",
                meta: meta || {},
            },
        });
    }

    /**
     * Grade a single question answer
     */
    gradeQuestion(
        question: any,
        answer: AnswerSubmission
    ): { isCorrect: boolean; scoreEarned: number } {
        const correctAnswers = question.answers.map((a: any) => a.key);
        const correctChoices = question.choices
            .filter((c: any) => c.isCorrect)
            .map((c: any) => c.id);

        let isCorrect = false;

        if (question.type === "SINGLE_CHOICE" || question.type === "TRUE_FALSE") {
            const chosenChoice = question.choices.find(
                (c: any) => c.id === answer.chosenIds[0]
            );
            isCorrect = chosenChoice?.isCorrect || false;
        } else if (question.type === "MULTI_CHOICE") {
            const chosenSet = new Set(answer.chosenIds);
            const correctSet = new Set(correctChoices);
            isCorrect =
                chosenSet.size === correctSet.size &&
                [...chosenSet].every((id) => correctSet.has(id));
        } else if (question.type === "SHORT_TEXT" || question.type === "GAP_FILL") {
            const userAnswer = answer.answerText?.toLowerCase().trim() || "";
            isCorrect = correctAnswers.some(
                (key: string) => key.toLowerCase().trim() === userAnswer
            );
        }

        const scoreEarned = isCorrect ? question.score : 0;
        return { isCorrect, scoreEarned };
    }

    /**
     * Create submission record
     */
    async createSubmission(
        attemptId: string,
        userId: string,
        questionId: string,
        answer: AnswerSubmission,
        isCorrect: boolean | null,
        score: number | null
    ) {
        return await prisma.submission.create({
            data: {
                attemptId,
                userId,
                questionId,
                chosenIds: answer.chosenIds,
                answerText: answer.answerText,
                isCorrect,
                score,
            },
        });
    }

    /**
     * Update attempt with score and status
     */
    async updateAttempt(
        attemptId: string,
        totalScore: number,
        status: "submitted" | "graded" = "graded"
    ) {
        return await prisma.attempt.update({
            where: { id: attemptId },
            data: {
                score: totalScore,
                status,
            },
        });
    }

    /**
     * Submit answers for an activity (reading, listening, culture)
     */
    async submitActivityAnswers(
        userId: string,
        activityId: string,
        answers: AnswerSubmission[],
        startTime: string,
        skill: Skill,
        meta?: Record<string, any>
    ): Promise<SubmissionResult> {
        const activity = await this.getActivityWithQuestions(activityId);
        if (!activity) {
            throw new Error("Activity not found");
        }

        const attempt = await this.createAttempt(
            userId,
            activityId,
            startTime,
            meta
        );

        let totalScore = 0;
        const gradedAnswers: SubmissionResult["answers"] = [];

        // For mediation, we don't grade immediately
        const shouldGrade = skill !== "MEDIATION";

        for (const answer of answers) {
            const question = activity.questions.find(
                (q) => q.id === answer.questionId
            );
            if (!question) continue;

            let isCorrect: boolean | null = null;
            let scoreEarned: number | null = null;

            if (shouldGrade) {
                const result = this.gradeQuestion(question, answer);
                isCorrect = result.isCorrect;
                scoreEarned = result.scoreEarned;
                totalScore += scoreEarned;
            }

            await this.createSubmission(
                attempt.id,
                userId,
                question.id,
                answer,
                isCorrect,
                scoreEarned
            );

            if (shouldGrade) {
                const correctAnswers = question.answers.map((a: any) => a.key);
                const correctChoices = question.choices
                    .filter((c: any) => c.isCorrect)
                    .map((c: any) => c.id);

                gradedAnswers.push({
                    questionId: question.id,
                    isCorrect: isCorrect!,
                    score: scoreEarned!,
                    maxScore: question.score,
                    correctAnswer:
                        question.type === "SINGLE_CHOICE" || question.type === "TRUE_FALSE"
                            ? question.choices.find((c: any) => c.isCorrect)?.text
                            : correctAnswers[0],
                    explanation: question.explanation,
                });
            } else {
                // For mediation, just record submission with feedback message
                gradedAnswers.push({
                    questionId: question.id,
                    isCorrect: false, // Will be updated when graded
                    score: 0, // Will be updated when graded
                    maxScore: question.score,
                    feedback: "Your response has been submitted. Feedback will be available soon.",
                });
            }
        }

        await this.updateAttempt(
            attempt.id,
            totalScore,
            shouldGrade ? "graded" : "submitted"
        );

        const percentage = activity.maxScore
            ? Math.round((totalScore / activity.maxScore) * 100)
            : 0;

        const result: SubmissionResult = {
            attemptId: attempt.id,
            totalScore,
            maxScore: activity.maxScore || 0,
            percentage,
            answers: gradedAnswers,
        };

        // Add skill-specific logic
        if (skill === "LISTENING") {
            const listenCount = meta?.listenCount || 1;
            result.listenCount = listenCount;
            result.skillLevel = this.calculateSkillLevel(percentage);
            result.feedback = {
                overall:
                    percentage >= 70
                        ? "Great job! Your listening comprehension is excellent."
                        : percentage >= 50
                            ? "Good effort! Keep practicing to improve your listening skills."
                            : "Keep working on your listening. Try to listen more actively and take notes.",
                suggestions: [
                    listenCount === 1 && percentage < 60
                        ? "Try listening to the audio multiple times to catch details you might have missed."
                        : null,
                    percentage < 70
                        ? "Focus on understanding the main ideas first, then work on details."
                        : null,
                    "Practice with different accents and speeds to improve comprehension.",
                ].filter(Boolean) as string[],
            };
        } else if (skill === "MEDIATION") {
            result.message =
                "Your mediation task has been submitted successfully. Feedback will be provided soon.";
            gradedAnswers.forEach((ans) => {
                ans.feedback =
                    "Your response has been submitted. Feedback will be available soon.";
            });
            // For mediation, we don't grade immediately
            await this.updateAttempt(attempt.id, totalScore, "submitted");
        }

        return result;
    }

    /**
     * Calculate skill level based on percentage
     */
    calculateSkillLevel(percentage: number): string {
        if (percentage >= 90) return "Advanced";
        if (percentage >= 75) return "Upper Intermediate";
        if (percentage >= 60) return "Intermediate";
        if (percentage >= 40) return "Elementary";
        return "Beginner";
    }
}

export const submissionService = new SubmissionService();

