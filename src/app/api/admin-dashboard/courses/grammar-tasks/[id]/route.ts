import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { handleError } from "@/lib/error-handler";

// GET: Lấy chi tiết một Grammar task
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

    const task = await prisma.grammarTask.findUnique({
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

// PUT: Cập nhật Grammar task
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
      level,
      introduction,
      examples,
      exercises,
      exampleCount,
      exerciseCount,
      category,
      recommended,
      order,
      active,
    } = body;

    // Check if task exists
    const existing = await prisma.grammarTask.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Build update data (only include provided fields)
    const updateData: any = {};
    if (title !== undefined) updateData.title = title.trim();
    if (level !== undefined) updateData.level = level.trim();
    if (introduction !== undefined) updateData.introduction = introduction.trim();
    if (examples !== undefined) updateData.examples = examples;
    if (exercises !== undefined) updateData.exercises = exercises;
    if (category !== undefined) updateData.category = category?.trim() || null;
    if (recommended !== undefined) updateData.recommended = recommended;
    if (order !== undefined) updateData.order = order;
    if (active !== undefined) updateData.active = active;

    // Update counts if examples/exercises changed
    if (examples !== undefined || exercises !== undefined) {
      const exCount = exampleCount !== undefined 
        ? exampleCount 
        : (Array.isArray(examples) ? examples.length : existing.exampleCount);
      const exerCount = exerciseCount !== undefined 
        ? exerciseCount 
        : (Array.isArray(exercises) ? exercises.length : existing.exerciseCount);
      updateData.exampleCount = exCount;
      updateData.exerciseCount = exerCount;
    } else if (exampleCount !== undefined || exerciseCount !== undefined) {
      if (exampleCount !== undefined) updateData.exampleCount = exampleCount;
      if (exerciseCount !== undefined) updateData.exerciseCount = exerciseCount;
    }

    const task = await prisma.grammarTask.update({
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

// DELETE: Xóa Grammar task
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
    const existing = await prisma.grammarTask.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    await prisma.grammarTask.delete({
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

