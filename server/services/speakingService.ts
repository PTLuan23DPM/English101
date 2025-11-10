/**
 * Speaking Service
 * Handles data operations for speaking activities
 */

import prisma from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

export class SpeakingService {
    /**
     * Save audio file
     */
    async saveAudioFile(userId: string, audioFile: File): Promise<string> {
        const bytes = await audioFile.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Create recordings directory if it doesn't exist
        const recordingsDir = join(process.cwd(), "public", "recordings");
        if (!existsSync(recordingsDir)) {
            await mkdir(recordingsDir, { recursive: true });
        }

        const filename = `recording-${userId}-${Date.now()}.webm`;
        const filepath = join(recordingsDir, filename);
        await writeFile(filepath, buffer);

        return `/recordings/${filename}`;
    }

    /**
     * Get activity with questions
     */
    async getActivityWithQuestions(activityId: string) {
        return await prisma.activity.findUnique({
            where: { id: activityId },
            include: {
                questions: true,
            },
        });
    }

    /**
     * Create or find attempt
     */
    async createOrFindAttempt(
        userId: string,
        activityId: string,
        startTime: string
    ) {
        let attempt = await prisma.attempt.findFirst({
            where: {
                userId,
                activityId,
                status: { in: ["started", "submitted"] },
            },
        });

        if (!attempt) {
            attempt = await prisma.attempt.create({
                data: {
                    userId,
                    activityId,
                    startedAt: startTime ? new Date(startTime) : new Date(),
                    status: "submitted",
                },
            });
        }

        return attempt;
    }

    /**
     * Save submission
     */
    async saveSubmission(
        attemptId: string,
        userId: string,
        questionId: string,
        transcription: string,
        score: number,
        feedback: any
    ) {
        return await prisma.submission.create({
            data: {
                attemptId,
                userId,
                questionId,
                answerText: transcription,
                score,
                feedback: JSON.stringify(feedback),
            },
        });
    }

    /**
     * Update attempt with score
     */
    async updateAttemptScore(attemptId: string) {
        const totalScore = await prisma.submission.aggregate({
            where: { attemptId },
            _sum: { score: true },
        });

        await prisma.attempt.update({
            where: { id: attemptId },
            data: {
                score: totalScore._sum.score || 0,
                submittedAt: new Date(),
                status: "graded",
            },
        });

        return totalScore._sum.score || 0;
    }

    /**
     * Mock transcription (TODO: Replace with real API)
     */
    async mockTranscribe(): Promise<string> {
        // Simulate API delay
        await new Promise((resolve) => setTimeout(resolve, 1000));
        return "Hello, my name is John and I'm learning English. I enjoy reading books and watching movies in English to improve my language skills.";
    }

    /**
     * Mock grading (TODO: Replace with real AI grading)
     */
    async mockGradeSpeaking(transcription: string): Promise<{
        score: number;
        pronunciation: number;
        fluency: number;
        grammar: number;
        vocabulary: number;
        feedback: string;
        suggestions: string[];
    }> {
        // Simulate API delay
        await new Promise((resolve) => setTimeout(resolve, 1500));

        const wordCount = transcription.split(" ").length;
        const hasGoodLength = wordCount >= 20 && wordCount <= 100;

        // Mock scores
        const pronunciation = Math.floor(Math.random() * 20) + 75; // 75-95
        const fluency = Math.floor(Math.random() * 20) + 70; // 70-90
        const grammar = Math.floor(Math.random() * 20) + 65; // 65-85
        const vocabulary = Math.floor(Math.random() * 20) + 70; // 70-90

        const totalScore = Math.round(
            (pronunciation + fluency + grammar + vocabulary) / 4
        );

        return {
            score: Math.min(totalScore, 100),
            pronunciation,
            fluency,
            grammar,
            vocabulary,
            feedback:
                totalScore >= 80
                    ? "Excellent work! Your speaking is clear and well-structured."
                    : totalScore >= 70
                        ? "Good job! Keep practicing to improve fluency."
                        : "Keep working on your pronunciation and grammar.",
            suggestions: [
                pronunciation < 80 ? "Work on pronunciation of specific sounds" : null,
                fluency < 75
                    ? "Practice speaking more smoothly without long pauses"
                    : null,
                grammar < 70 ? "Review grammar rules for this level" : null,
                vocabulary < 75 ? "Try to use more varied vocabulary" : null,
                !hasGoodLength ? "Try to speak for the recommended duration" : null,
            ].filter(Boolean) as string[],
        };
    }
}

export const speakingService = new SpeakingService();

