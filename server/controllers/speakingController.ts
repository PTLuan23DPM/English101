/**
 * Speaking Controller
 * Handles business logic for speaking activities
 */

import { speakingService } from "../services/speakingService";
import { requireAuthByEmail, createResponse } from "../utils/auth";

interface SubmitSpeakingRequest {
    questionId: string;
    audio: File;
    duration: number;
    startTime?: string;
}

export class SpeakingController {
    /**
     * Submit speaking activity
     */
    async submitSpeaking(
        userEmail: string,
        activityId: string,
        formData: FormData
    ) {
        try {
            const user = await requireAuthByEmail(userEmail);
            const questionId = formData.get("questionId") as string;
            const audioFile = formData.get("audio") as File | null;
            const duration = parseInt(formData.get("duration") as string) || 0;
            const startTime = formData.get("startTime") as string;

            if (!audioFile) {
                return createResponse({ error: "No audio file provided" }, 400);
            }

            // Validate activity and question
            const activity = await speakingService.getActivityWithQuestions(
                activityId
            );

            if (!activity) {
                return createResponse({ error: "Activity not found" }, 404);
            }

            const question = activity.questions.find((q) => q.id === questionId);
            if (!question) {
                return createResponse({ error: "Question not found" }, 404);
            }

            // Save audio file
            const audioUrl = await speakingService.saveAudioFile(user.id, audioFile);

            // Create or find attempt
            const attempt = await speakingService.createOrFindAttempt(
                user.id,
                activityId,
                startTime
            );

            // TODO: Integrate Speech-to-Text (OpenAI Whisper or other service)
            // For now, we'll use mock transcription
            const transcription = await speakingService.mockTranscribe();

            // TODO: Integrate AI grading (pronunciation, fluency, grammar, vocabulary)
            // For now, we'll use mock grading
            const feedback = await speakingService.mockGradeSpeaking(transcription);

            // Save submission
            await speakingService.saveSubmission(
                attempt.id,
                user.id,
                question.id,
                transcription,
                feedback.score,
                feedback
            );

            // Update attempt
            const totalScore = await speakingService.updateAttemptScore(attempt.id);

            return createResponse(
                {
                    success: true,
                    audio: {
                        url: audioUrl,
                        duration,
                    },
                    transcription,
                    feedback,
                },
                200
            );
        } catch (error: any) {
            console.error("[SpeakingController] Error submitting speaking:", error);
            if (error.message === "Unauthorized" || error.message === "User not found") {
                return createResponse({ error: error.message }, 401);
            }
            return createResponse({ error: "Failed to submit activity" }, 500);
        }
    }
}

export const speakingController = new SpeakingController();

