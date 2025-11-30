/**
 * Placement Test Controller
 * Handles business logic for placement tests
 */

import { placementTestService } from "../services/placementTestService";
import { createResponse } from "../utils/auth";

interface SubmitTestRequest {
    score: number;
    totalQuestions: number;
    answers: any[];
}

export class PlacementTestController {
    /**
     * Submit placement test
     */
    async submitTest(userId: string, data: SubmitTestRequest) {
        try {
            // Validate required fields
            if (typeof data.score !== "number" || data.score < 0) {
                return createResponse({ error: "Invalid score" }, 400);
            }

            if (!data.answers || !Array.isArray(data.answers)) {
                return createResponse({ error: "Invalid answers format" }, 400);
            }

            const result = await placementTestService.saveTestResult(userId, data);

            return createResponse(
                {
                    success: true,
                    cefrLevel: result.cefrLevel,
                    description: result.description,
                    score: data.score,
                    totalQuestions: data.totalQuestions,
                    testResultId: result.testResult.id,
                },
                200
            );
        } catch (error: any) {
            console.error("[PlacementTestController] Error submitting test:", error);

            // Handle Prisma errors
            if (error && typeof error === "object" && "code" in error) {
                const prismaError = error as { code?: string };
                if (prismaError.code === "P2002") {
                    return createResponse({ error: "Test result already exists" }, 400);
                } else if (prismaError.code === "P2025") {
                    return createResponse({ error: "User not found" }, 404);
                }
            }

            return createResponse(
                { error: "Failed to submit test", details: error.message },
                500
            );
        }
    }

    /**
     * Get user's placement test result
     */
    async getTestResult(userId: string) {
        try {
            const testResult = await placementTestService.getTestResult(userId);

            if (!testResult) {
                return createResponse({ error: "Test result not found" }, 404);
            }

            return createResponse({ testResult }, 200);
        } catch (error: any) {
            console.error("[PlacementTestController] Error getting test result:", error);
            return createResponse({ error: "Failed to get test result" }, 500);
        }
    }
}

export const placementTestController = new PlacementTestController();

