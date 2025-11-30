import { asyncHandler, AppError } from "@/lib/error-handler";
import { requireAuth } from "@/server/utils/auth";
import { statsController } from "@/server/controllers/statsController";
import { createSuccessResponse } from "@/server/utils/response";

/**
 * Get user statistics (avg score, total activities, streak, etc.)
 * GET /api/user/stats
 */
export const GET = asyncHandler(async () => {
    const session = await requireAuth();
    const userId = session.user.id;

    const result = await statsController.getStats(userId);

    if (!result.success || !result.data?.stats) {
        throw new AppError(
            "Failed to fetch user stats",
            500,
            "STATS_FETCH_ERROR"
        );
    }

    return createSuccessResponse({ stats: result.data.stats });
});

