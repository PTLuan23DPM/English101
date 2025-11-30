import prisma from "./prisma";

/**
 * Calculate streak based on completed activities
 * Returns the number of consecutive days with at least one completed activity
 */
export async function calculateStreakFromActivities(userId: string): Promise<{
    streak: number;
    longestStreak: number;
}> {
    try {
        // Get all completed attempts (submittedAt is not null), grouped by date
        const completedAttempts = await prisma.attempt.findMany({
            where: {
                userId,
                submittedAt: { not: null },
            },
            select: {
                submittedAt: true,
            },
            orderBy: {
                submittedAt: "desc",
            },
        });

        if (completedAttempts.length === 0) {
            return { streak: 0, longestStreak: 0 };
        }

        // Get unique dates (only date part, not time)
        const datesWithActivity = new Set<string>();
        completedAttempts.forEach((att) => {
            if (att.submittedAt) {
                const date = new Date(att.submittedAt);
                const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                datesWithActivity.add(dateStr);
            }
        });

    // Sort dates descending
    const sortedDates = Array.from(datesWithActivity).sort().reverse();

    // Calculate current streak (consecutive days from most recent activity backwards)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Find the most recent date with activity (must be today or yesterday to count)
    let mostRecentDate: Date | null = null;
    for (const dateStr of sortedDates) {
        const [year, month, day] = dateStr.split('-').map(Number);
        const activityDate = new Date(year, month - 1, day);
        if (activityDate <= today) {
            mostRecentDate = activityDate;
            break;
        }
    }

    if (!mostRecentDate) {
        return { streak: 0, longestStreak: 0 };
    }

    // Check if most recent activity is within last 2 days (today or yesterday)
    // If it's older, current streak is broken but longest streak is preserved
    const daysSinceLastActivity = Math.floor(
        (today.getTime() - mostRecentDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    let currentStreak = 0;
    
    if (daysSinceLastActivity <= 1) {
        // Only calculate current streak if last activity was today or yesterday

        // Calculate streak from most recent date backwards
        currentStreak = 1;
        let checkDate = new Date(mostRecentDate);
        checkDate.setDate(checkDate.getDate() - 1);

        // Count consecutive days backwards
        while (true) {
            const checkDateStr = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}-${String(checkDate.getDate()).padStart(2, '0')}`;
            
            if (sortedDates.includes(checkDateStr)) {
                currentStreak++;
                checkDate.setDate(checkDate.getDate() - 1);
            } else {
                break;
            }
        }
    }

    // Calculate longest streak (find longest consecutive sequence)
    let longestStreak = 0;
    let tempStreak = 0;
    let prevDate: Date | null = null;

    for (const dateStr of sortedDates) {
        const [year, month, day] = dateStr.split('-').map(Number);
        const currentDate = new Date(year, month - 1, day);

        if (prevDate === null) {
            tempStreak = 1;
        } else {
            const daysDiff = Math.floor(
                (prevDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24)
            );

            if (daysDiff === 1) {
                // Consecutive day
                tempStreak++;
            } else {
                // Streak broken
                longestStreak = Math.max(longestStreak, tempStreak);
                tempStreak = 1;
            }
        }

        prevDate = currentDate;
    }

    // Don't forget the last streak
    longestStreak = Math.max(longestStreak, tempStreak);

        return {
            streak: currentStreak,
            longestStreak,
        };
    } catch (error: any) {
        // Handle database connection errors
        if (error?.code === "P1001" || error?.message?.includes("Authentication failed") || error?.message?.includes("database credentials")) {
            console.error("[Streak] Database connection error:", error.message);
            return { streak: 0, longestStreak: 0 };
        }
        throw error;
    }
}

/**
 * Update user streak based on completed activity
 * Recalculates streak from all completed activities
 */
export async function updateStreakAfterActivity(userId: string): Promise<{
    streak: number;
    longestStreak: number;
    isNewDay: boolean;
}> {
    try {
        // Calculate streak from completed activities
        const { streak, longestStreak } = await calculateStreakFromActivities(userId);

        // Check if today has activity (to determine isNewDay)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const todayAttempt = await prisma.attempt.findFirst({
            where: {
                userId,
                submittedAt: {
                    gte: today,
                    lt: tomorrow,
                },
            },
        });

        const isNewDay = !!todayAttempt;

        // Note: User model doesn't have streak/longestStreak/lastActive fields
        // These would need to be stored elsewhere or added to schema
        const previousStreak = 0;

        return {
            streak,
            longestStreak,
            isNewDay: isNewDay && streak > previousStreak,
        };
    } catch (error: any) {
        // Handle database connection errors
        if (error?.code === "P1001" || error?.message?.includes("Authentication failed") || error?.message?.includes("database credentials")) {
            console.error("[Streak] Database connection error:", error.message);
            return { streak: 0, longestStreak: 0, isNewDay: false };
        }
        throw error;
    }
}

/**
 * Get user's streak status
 */
export async function getUserStreak(userId: string): Promise<{
    streak: number;
    longestStreak: number;
    lastActive: Date | null;
}> {
    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true },
        });

        if (!user) {
            throw new Error("User not found");
        }

        // Calculate streak from attempts
        const { streak, longestStreak } = await calculateStreakFromActivities(userId);

        // Get last active date from most recent attempt
        const lastAttempt = await prisma.attempt.findFirst({
            where: { userId, submittedAt: { not: null } },
            orderBy: { submittedAt: "desc" },
            select: { submittedAt: true },
        });

        return {
            streak,
            longestStreak,
            lastActive: lastAttempt?.submittedAt || null,
        };
    } catch (error: any) {
        // Handle database connection errors
        if (error?.code === "P1001" || error?.message?.includes("Authentication failed") || error?.message?.includes("database credentials")) {
            console.error("[Streak] Database connection error:", error.message);
            return { streak: 0, longestStreak: 0, lastActive: null };
        }
        throw error;
    }
}

