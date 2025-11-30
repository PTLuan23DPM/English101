/**
 * Getting Started Controller
 * Handles business logic for getting started tasks
 */

import { gettingStartedService } from "../services/gettingStartedService";
import { createResponse } from "../utils/auth";

export class GettingStartedController {
    /**
     * Get getting started tasks for user
     */
    async getTasks(userId: string) {
        try {
            const result = await gettingStartedService.getGettingStartedTasks(userId);
            return createResponse(result, 200);
        } catch (error: any) {
            console.error("[GettingStartedController] Error getting tasks:", error);
            return createResponse(
                { error: "Failed to get getting started tasks", details: error?.message },
                500
            );
        }
    }

    /**
     * Mark task as completed
     */
    async markTaskCompleted(userId: string, taskType: string) {
        try {
            const success = await gettingStartedService.markTaskCompleted(userId, taskType);
            return createResponse({ success, taskType }, 200);
        } catch (error: any) {
            console.error("[GettingStartedController] Error marking task completed:", error);
            return createResponse(
                { error: "Failed to mark task as completed", details: error?.message },
                500
            );
        }
    }
}

export const gettingStartedController = new GettingStartedController();

