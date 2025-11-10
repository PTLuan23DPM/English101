/**
 * Activity Controller
 * Handles business logic for activities
 */

import { activityService } from "../services/activityService";
import { Skill } from "@prisma/client";

export class ActivityController {
    /**
     * Get activities by skill
     */
    async getActivities(skill: Skill, filters?: { level?: string; type?: string; topic?: string }) {
        try {
            const activities = await activityService.getActivitiesBySkill(skill, filters);
            const formattedActivities = activityService.formatActivities(activities, skill);

            return {
                success: true,
                data: formattedActivities,
            };
        } catch (error) {
            console.error(`[ActivityController] Error fetching ${skill} activities:`, error);
            throw new Error(`Failed to fetch ${skill.toLowerCase()} activities`);
        }
    }

    /**
     * Get activity by ID
     */
    async getActivityById(activityId: string, skill: Skill) {
        try {
            const activity = await activityService.getActivityByIdWithIncludes(activityId, skill);

            if (!activity) {
                throw new Error("Activity not found");
            }

            if (skill === "WRITING") {
                const prompts = activityService.formatWritingPrompts(activity);
                return {
                    success: true,
                    data: {
                        activity: {
                            id: activity.id,
                            title: activity.title,
                            instruction: activity.instruction,
                            level: activity.level,
                            type: activity.type,
                            maxScore: activity.maxScore,
                            timeLimitSec: activity.timeLimitSec,
                            unitTitle: activity.unit.title,
                        },
                        prompts,
                    },
                };
            } else if (skill === "READING") {
                return {
                    success: true,
                    data: activityService.formatReadingActivity(activity),
                };
            } else if (skill === "SPEAKING") {
                return {
                    success: true,
                    data: activityService.formatSpeakingActivity(activity),
                };
            } else if (skill === "LISTENING") {
                return {
                    success: true,
                    data: activityService.formatListeningActivity(activity),
                };
            } else if (skill === "CULTURE") {
                return {
                    success: true,
                    data: activityService.formatCultureActivity(activity),
                };
            } else if (skill === "MEDIATION") {
                return {
                    success: true,
                    data: activityService.formatMediationActivity(activity),
                };
            } else {
                return {
                    success: true,
                    data: activity,
                };
            }
        } catch (error) {
            console.error(`[ActivityController] Error fetching ${skill} activity:`, error);
            throw error;
        }
    }
}

export const activityController = new ActivityController();

