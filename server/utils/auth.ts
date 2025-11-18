/**
 * Auth Utilities
 * Helper functions for authentication
 */

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

/**
 * Get session from request
 */
export async function getSession() {
    return await getServerSession(authOptions);
}

/**
 * Check if user is authenticated and return session
 */
export async function requireAuth() {
    const session = await getSession();

    if (!session?.user?.id && !session?.user?.email) {
        throw new Error("Unauthorized");
    }

    return session;
}

/**
 * Get user by email (for controllers that need user object)
 */
export async function requireAuthByEmail(userEmail: string) {
    if (!userEmail) {
        throw new Error("Unauthorized: Email is required");
    }

    try {
        const { prisma } = await import("@/lib/prisma");
        const user = await prisma.user.findUnique({
            where: { email: userEmail },
        });

        if (!user) {
            console.error("[requireAuthByEmail] User not found for email:", userEmail);
            throw new Error("User not found");
        }

        return user;
    } catch (error: unknown) {
        if (error instanceof Error && error.message === "User not found") {
            throw error;
        }
        console.error("[requireAuthByEmail] Database error:", error);
        throw new Error("Failed to fetch user");
    }
}

/**
 * Create unauthorized response
 */
export function unauthorizedResponse() {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

/**
 * Create error response
 */
export function errorResponse(message: string, status: number = 500) {
    return NextResponse.json({ error: message }, { status });
}

/**
 * Create success response
 */
export function successResponse(data: any, status: number = 200) {
    return NextResponse.json(data, { status });
}

/**
 * Create response object (returns plain object, not NextResponse)
 * Use this in controllers to return data and status
 */
export function createResponse(data: any, status: number = 200) {
    return { data, status };
}

