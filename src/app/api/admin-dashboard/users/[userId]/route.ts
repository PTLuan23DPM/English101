import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { handleError } from "@/lib/error-handler";
import bcrypt from "bcryptjs";

// GET: Lấy thông tin chi tiết của user
export async function GET(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    const admin = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { role: true },
    });

    if (!admin || admin.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const user = await prisma.user.findUnique({
      where: { id: params.userId },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        cefrLevel: true,
        placementTestCompleted: true,
        placementScore: true,
        streak: true,
        longestStreak: true,
        lastActive: true,
        language: true,
        theme: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            progress: true,
            attempts: true,
            submissions: true,
            goals: true,
          },
        },
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
    return handleError(error);
  }
}

// PATCH: Cập nhật thông tin user
export async function PATCH(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    const admin = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { role: true },
    });

    if (!admin || admin.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { name, image, role, cefrLevel } = body;

    const updateData: {
      name?: string | null;
      image?: string | null;
      role?: "USER" | "ADMIN";
      cefrLevel?: string | null;
    } = {};
    if (name !== undefined) updateData.name = name?.trim() || null;
    if (image !== undefined) updateData.image = image || null;
    if (role !== undefined && ["USER", "ADMIN"].includes(role)) {
      updateData.role = role as "USER" | "ADMIN";
    }
    if (cefrLevel !== undefined) updateData.cefrLevel = cefrLevel || null;

    const updatedUser = await prisma.user.update({
      where: { id: params.userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        cefrLevel: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      user: updatedUser,
    });
  } catch (error) {
    return handleError(error);
  }
}

