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
        try {
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
        } catch (error: any) {
            // Handle database connection errors
            if (error?.code === "P1001" || error?.message?.includes("Authentication failed") || error?.message?.includes("database credentials")) {
                console.error("[UserService] Database connection error:", error.message);
                throw new Error("Database connection failed. Please check your DATABASE_URL environment variable.");
            }
            throw error;
        }
    }

    /**
     * Get user by email
     */
    async getUserByEmail(email: string) {
        try {
            const user = await prisma.user.findUnique({
                where: { email },
            });

            return user;
        } catch (error: any) {
            // Handle database connection errors
            if (error?.code === "P1001" || error?.message?.includes("Authentication failed") || error?.message?.includes("database credentials")) {
                console.error("[UserService] Database connection error:", error.message);
                throw new Error("Database connection failed. Please check your DATABASE_URL environment variable.");
            }
            throw error;
        }
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
        try {
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
        } catch (error: any) {
            // Handle database connection errors
            if (error?.code === "P1001" || error?.message?.includes("Authentication failed") || error?.message?.includes("database credentials")) {
                console.error("[UserService] Database connection error:", error.message);
                throw new Error("Database connection failed. Please check your DATABASE_URL environment variable.");
            }
            throw error;
        }
    }

    /**
     * Check if email is taken
     */
    async isEmailTaken(email: string, excludeUserId?: string) {
        try {
            const user = await prisma.user.findUnique({
                where: { email },
            });

            if (!user) return false;
            if (excludeUserId && user.id === excludeUserId) return false;
            return true;
        } catch (error: any) {
            // Handle database connection errors
            if (error?.code === "P1001" || error?.message?.includes("Authentication failed") || error?.message?.includes("database credentials")) {
                console.error("[UserService] Database connection error:", error.message);
                // Return false to allow registration to proceed (graceful degradation)
                return false;
            }
            throw error;
        }
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
        try {
            const hashedPassword = await this.hashPassword(data.password);

            const user = await prisma.user.create({
                data: {
                    name: data.name,
                    email: data.email,
                    password: hashedPassword,
                    role: (data.role || "USER") as "USER" | "ADMIN" | undefined,
                },
            });

            return user;
        } catch (error: any) {
            // Handle database connection errors
            if (error?.code === "P1001" || error?.message?.includes("Authentication failed") || error?.message?.includes("database credentials")) {
                console.error("[UserService] Database connection error:", error.message);
                throw new Error("Database connection failed. Please check your DATABASE_URL environment variable.");
            }
            throw error;
        }
    }

    /**
     * Get user stats
     */
    async getUserStats(userId: string) {
        try {
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
                },
            });

            // Calculate average score from attempts
            const attempts = await prisma.attempt.findMany({
                where: {
                    userId,
                    submittedAt: { not: null },
                    score: { not: null },
                },
                select: { score: true },
            });

            const averageScore = attempts.length > 0
                ? attempts.reduce((sum, a) => sum + (a.score || 0), 0) / attempts.length / 10 // Convert from 0-100 to 0-10
                : 0;

            return {
                ...stats,
                averageScore: Math.round(averageScore * 10) / 10,
            };
        } catch (error: any) {
            // Handle database connection errors
            if (error?.code === "P1001" || error?.message?.includes("Authentication failed") || error?.message?.includes("database credentials")) {
                console.error("[UserService] Database connection error:", error.message);
                throw new Error("Database connection failed. Please check your DATABASE_URL environment variable.");
            }
            throw error;
        }
    }
}

export const userService = new UserService();

