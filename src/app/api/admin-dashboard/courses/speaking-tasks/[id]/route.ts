import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { handleError } from "@/lib/error-handler";

// GET: Lấy chi tiết một Speaking task
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
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

    const task = await prisma.speakingTask.findUnique({
      where: { id: params.id },
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

// PUT: Cập nhật Speaking task
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
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
    const {
      title,
      type,
      level,
      prompt,
      timeLimit,
      tips,
      vocab,
      phrases,
      recommended,
      icon,
      color,
      order,
      active,
    } = body;

    // Check if task exists
    const existing = await prisma.speakingTask.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Build update data (only include provided fields)
    const updateData: any = {};
    if (title !== undefined) updateData.title = title.trim();
    if (type !== undefined) updateData.type = type.trim();
    if (level !== undefined) updateData.level = level.trim();
    if (prompt !== undefined) updateData.prompt = prompt.trim();
    if (timeLimit !== undefined) updateData.timeLimit = timeLimit.trim();
    if (tips !== undefined) updateData.tips = Array.isArray(tips) ? tips : [];
    if (vocab !== undefined) updateData.vocab = vocab;
    if (phrases !== undefined) updateData.phrases = Array.isArray(phrases) ? phrases : [];
    if (recommended !== undefined) updateData.recommended = recommended;
    if (icon !== undefined) updateData.icon = icon;
    if (color !== undefined) updateData.color = color;
    if (order !== undefined) updateData.order = order;
    if (active !== undefined) updateData.active = active;

    const task = await prisma.speakingTask.update({
      where: { id: params.id },
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

// DELETE: Xóa Speaking task
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
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

    // Check if task exists
    const existing = await prisma.speakingTask.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    await prisma.speakingTask.delete({
      where: { id: params.id },
    });

    return NextResponse.json({
      success: true,
      message: "Task deleted successfully",
    });
  } catch (error) {
    return handleError(error);
  }
}

