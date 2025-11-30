import { Skill } from "@prisma/client";
import { submissionService } from "../services/submissionService";
import { requireAuthByEmail, createResponse } from "../utils/auth";

interface AnswerSubmission {
    questionId: string;
    chosenIds: string[];
    answerText?: string;
}

interface SubmitActivityRequest {
    answers: AnswerSubmission[];
    startTime: string;
    listenCount?: number;
    [key: string]: any;
}

export class SubmissionController {
    /**
     * Submit answers for an activity
     */
    async submitActivity(
        userEmail: string,
        activityId: string,
        skill: Skill,
        body: SubmitActivityRequest
    ) {
        try {
            const user = await requireAuthByEmail(userEmail);
            const { answers, startTime, listenCount, ...meta } = body;

            const result = await submissionService.submitActivityAnswers(
                user.id,
                activityId,
                answers,
                startTime,
                skill,
                listenCount ? { listenCount, ...meta } : meta
            );

            return createResponse(result, 200);
        } catch (error: any) {
            console.error(`[SubmissionController] Error submitting ${skill} activity:`, error);
            if (error.message === "Activity not found" || error.message === "User not found") {
                return createResponse({ error: error.message }, 404);
            }
            if (error.message === "Unauthorized") {
                return createResponse({ error: error.message }, 401);
            }
            return createResponse(
                { error: "Failed to submit activity" },
                500
            );
        }
    }
}

export const submissionController = new SubmissionController();

