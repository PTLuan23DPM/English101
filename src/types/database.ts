/**
 * Database Types
 * Types derived from Prisma schema for type safety
 */

import { 
    User, 
    Attempt, 
    Activity, 
    UserGoal, 
    PlacementTestResult,
    WritingLLMUsage,
    UserNotification,
    Course,
    Module,
    Unit,
    Question,
    Feedback,
    Announcement,
    PageContent
} from '@prisma/client';

// Extended types with relations
export type UserWithRelations = User & {
    attempts?: Attempt[];
    goals?: UserGoal[];
    placementTestResult?: PlacementTestResult | null;
    notifications?: UserNotification[];
};

export type AttemptWithActivity = Attempt & {
    activity?: Activity | null;
    user?: User | null;
};

export type ActivityWithAttempts = Activity & {
    attempts?: Attempt[];
};

export type UserGoalWithDetails = UserGoal & {
    user?: User | null;
};

// Common database operation results
export interface DatabaseResult<T> {
    data: T | null;
    error: string | null;
}

// Statistics types
export interface UserStats {
    totalAttempts: number;
    completedActivities: number;
    averageScore: number;
    streak: number;
    longestStreak: number;
    lastActive: Date | null;
    skillsBreakdown: {
        [skill: string]: {
            count: number;
            avg: number;
        };
    };
}

export interface ActivityStats {
    activityId: string;
    totalAttempts: number;
    averageScore: number;
    completionRate: number;
}

