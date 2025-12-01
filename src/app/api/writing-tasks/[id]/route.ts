import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { handleError } from "@/lib/error-handler";

// GET: Lấy một writing task theo ID (public)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const task = await prisma.writingTask.findUnique({
      where: { id },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      task,
    });
  } catch (error) {
    return handleError(error);
  }
}

// PUT: Cập nhật writing task (chỉ admin)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const { id } = await params;
    const body = await req.json();

    const {
      title,
      icon,
      type,
      level,
      prompt,
      targetWords,
      tips,
      recommended,
      color,
      order,
      active,
    } = body;

    const updateData: {
      title?: string;
      icon?: string;
      type?: string;
      level?: string;
      prompt?: string;
      targetWords?: string;
      tips?: string[];
      recommended?: boolean;
      color?: string;
      order?: number;
      active?: boolean;
    } = {};

    if (title !== undefined) updateData.title = title.trim();
    if (icon !== undefined) updateData.icon = icon;
    if (type !== undefined) updateData.type = type.trim();
    if (level !== undefined) updateData.level = level.trim();
    if (prompt !== undefined) updateData.prompt = prompt.trim();
    if (targetWords !== undefined) updateData.targetWords = targetWords.trim();
    if (tips !== undefined) updateData.tips = tips;
    if (recommended !== undefined) updateData.recommended = recommended;
    if (color !== undefined) updateData.color = color;
    if (order !== undefined) updateData.order = order;
    if (active !== undefined) updateData.active = active;

    const task = await prisma.writingTask.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      task,
    });
  } catch (error) {
    return handleError(error);
  }
}

// DELETE: Xóa writing task (soft delete, chỉ admin)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const { id } = await params;

    // Soft delete: set active = false
    const task = await prisma.writingTask.update({
      where: { id },
      data: { active: false },
    });

    return NextResponse.json({
      success: true,
      task,
    });
  } catch (error) {
    return handleError(error);
  }
}


