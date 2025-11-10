/**
 * User Service
 * Handles data operations for users
 */

import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

export class UserService {
    /**
     * Get user by ID
     */
    async getUserById(userId: string) {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                name: true,
                email: true,
                image: true,
                cefrLevel: true,
                streak: true,
                longestStreak: true,
                language: true,
                theme: true,
                createdAt: true,
                password: true,
            },
        });

        return user;
    }

    /**
     * Get user by email
     */
    async getUserByEmail(email: string) {
        const user = await prisma.user.findUnique({
            where: { email },
        });

        return user;
    }

    /**
     * Update user profile
     */
    async updateUser(userId: string, data: {
        name?: string;
        email?: string;
        image?: string;
        password?: string;
    }) {
        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data,
            select: {
                id: true,
                name: true,
                email: true,
                image: true,
            },
        });

        return updatedUser;
    }

    /**
     * Check if email is taken
     */
    async isEmailTaken(email: string, excludeUserId?: string) {
        const user = await prisma.user.findUnique({
            where: { email },
        });

        if (!user) return false;
        if (excludeUserId && user.id === excludeUserId) return false;
        return true;
    }

    /**
     * Hash password
     */
    async hashPassword(password: string): Promise<string> {
        return bcrypt.hash(password, 10);
    }

    /**
     * Compare password
     */
    async comparePassword(password: string, hashedPassword: string): Promise<boolean> {
        return bcrypt.compare(password, hashedPassword);
    }

    /**
     * Create user
     */
    async createUser(data: {
        name: string;
        email: string;
        password: string;
        role?: string;
    }) {
        const hashedPassword = await this.hashPassword(data.password);

        const user = await prisma.user.create({
            data: {
                name: data.name,
                email: data.email,
                password: hashedPassword,
                role: data.role || "USER",
            },
        });

        return user;
    }

    /**
     * Get user stats
     */
    async getUserStats(userId: string) {
        const stats = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                name: true,
                email: true,
                image: true,
                cefrLevel: true,
                streak: true,
                longestStreak: true,
                _count: {
                    select: {
                        activities: true,
                        goals: true,
                    },
                },
            },
        });

        // Calculate average score
        const activities = await prisma.userActivity.findMany({
            where: { userId },
            select: { score: true },
        });

        const averageScore = activities.length > 0
            ? activities.reduce((sum, a) => sum + (a.score || 0), 0) / activities.length
            : 0;

        return {
            ...stats,
            averageScore: Math.round(averageScore * 10) / 10,
        };
    }
}

export const userService = new UserService();

