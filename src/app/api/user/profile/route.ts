import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

/**
 * Update user profile
 * PUT /api/user/profile
 */
export async function PUT(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user || !session.user.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userId = session.user.id;
        const data = await req.json();
        const { name, email, currentPassword, newPassword, image } = data;

        // Verify user exists
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { password: true, email: true },
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Build update object
        const updateData: any = {};

        // Update name if provided
        if (name && name !== session.user.name) {
            updateData.name = name;
        }

        // Update image if provided
        if (image) {
            updateData.image = image;
        }

        // Update email if provided and different
        if (email && email !== user.email) {
            // Check if email is already taken
            const existingUser = await prisma.user.findUnique({
                where: { email },
            });

            if (existingUser && existingUser.id !== userId) {
                return NextResponse.json(
                    { error: "Email already in use" },
                    { status: 400 }
                );
            }

            updateData.email = email;
        }

        // Update password if provided
        if (newPassword) {
            if (!currentPassword) {
                return NextResponse.json(
                    { error: "Current password is required to set a new password" },
                    { status: 400 }
                );
            }

            // Verify current password
            if (!user.password) {
                return NextResponse.json(
                    { error: "Cannot update password for OAuth accounts" },
                    { status: 400 }
                );
            }

            const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
            if (!isPasswordValid) {
                return NextResponse.json(
                    { error: "Current password is incorrect" },
                    { status: 400 }
                );
            }

            // Hash new password
            const hashedPassword = await bcrypt.hash(newPassword, 10);
            updateData.password = hashedPassword;
        }

        // Update user
        if (Object.keys(updateData).length > 0) {
            const updatedUser = await prisma.user.update({
                where: { id: userId },
                data: updateData,
                select: {
                    id: true,
                    name: true,
                    email: true,
                    image: true,
                },
            });

            return NextResponse.json({
                success: true,
                message: "Profile updated successfully",
                user: updatedUser,
            });
        }

        return NextResponse.json({
            success: true,
            message: "No changes to update",
        });
    } catch (error) {
        console.error("[Profile Update API] Error:", error);
        return NextResponse.json(
            { error: "Failed to update profile" },
            { status: 500 }
        );
    }
}

/**
 * Get user profile
 * GET /api/user/profile
 */
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user || !session.user.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userId = session.user.id;

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
            },
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            user,
        });
    } catch (error) {
        console.error("[Profile Get API] Error:", error);
        return NextResponse.json(
            { error: "Failed to fetch profile" },
            { status: 500 }
        );
    }
}

