import prisma from "./prisma";

/**
 * Update user streak based on activity
 * Call this after any completed activity
 */
export async function updateStreakAfterActivity(userId: string): Promise<{
    streak: number;
    longestStreak: number;
    isNewDay: boolean;
}> {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { lastActive: true, streak: true, longestStreak: true },
    });

    if (!user) {
        throw new Error("User not found");
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    let newStreak = user.streak;
    let newLongestStreak = user.longestStreak;
    let isNewDay = false;

    if (!user.lastActive) {
        // First activity ever
        newStreak = 1;
        isNewDay = true;
    } else {
        const lastActiveDate = new Date(
            user.lastActive.getFullYear(),
            user.lastActive.getMonth(),
            user.lastActive.getDate()
        );

        const daysDiff = Math.floor(
            (today.getTime() - lastActiveDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysDiff === 0) {
            // Same day - no change to streak
            isNewDay = false;
        } else if (daysDiff === 1) {
            // Consecutive day - increment streak
            newStreak = user.streak + 1;
            isNewDay = true;
        } else {
            // Streak broken - reset to 1
            newStreak = 1;
            isNewDay = true;
        }
    }

    // Update longest streak if current streak is higher
    if (newStreak > newLongestStreak) {
        newLongestStreak = newStreak;
    }

    // Update user
    await prisma.user.update({
        where: { id: userId },
        data: {
            lastActive: now,
            streak: newStreak,
            longestStreak: newLongestStreak,
        },
    });

    return {
        streak: newStreak,
        longestStreak: newLongestStreak,
        isNewDay,
    };
}

/**
 * Get user's streak status
 */
export async function getUserStreak(userId: string): Promise<{
    streak: number;
    longestStreak: number;
    lastActive: Date | null;
}> {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { streak: true, longestStreak: true, lastActive: true },
    });

    if (!user) {
        throw new Error("User not found");
    }

    return {
        streak: user.streak,
        longestStreak: user.longestStreak,
        lastActive: user.lastActive,
    };
}

