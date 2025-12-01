import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { handleError } from "@/lib/error-handler";
import { Prisma } from "@prisma/client";

// GET: Lấy chi tiết một Reading task
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

    const task = await prisma.readingTask.findUnique({
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

// PUT: Cập nhật Reading task
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
      subtitle,
      cefr,
      genre,
      source,
      tags,
      estimatedTime,
      wordCount,
      coverEmoji,
      gradient,
      readingSkills,
      keyIdeas,
      vocabulary,
      contentSections,
      exercises,
      recommended,
      order,
      active,
    } = body;

    // Check if task exists
    const existing = await prisma.readingTask.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Build update data (only include provided fields)
    const updateData: {
      title?: string;
      subtitle?: string | null;
      cefr?: string;
      genre?: string;
      source?: string | null;
      tags?: string[];
      estimatedTime?: number | null;
      wordCount?: number | null;
      coverEmoji?: string;
      gradient?: string | null;
      readingSkills?: string[];
      keyIdeas?: string[];
      vocabulary?: Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput;
      contentSections?: Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput;
      exercises?: Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput;
      recommended?: boolean;
      order?: number;
      active?: boolean;
    } = {};
    if (title !== undefined) updateData.title = title.trim();
    if (subtitle !== undefined) updateData.subtitle = subtitle?.trim() || null;
    if (cefr !== undefined) updateData.cefr = cefr.trim();
    if (genre !== undefined) updateData.genre = genre.trim();
    if (source !== undefined) updateData.source = source?.trim() || null;
    if (tags !== undefined) updateData.tags = Array.isArray(tags) ? tags : [];
    if (estimatedTime !== undefined) updateData.estimatedTime = estimatedTime || null;
    if (wordCount !== undefined) updateData.wordCount = wordCount || null;
    if (coverEmoji !== undefined) updateData.coverEmoji = coverEmoji;
    if (gradient !== undefined) updateData.gradient = gradient || null;
    if (readingSkills !== undefined) updateData.readingSkills = Array.isArray(readingSkills) ? readingSkills : [];
    if (keyIdeas !== undefined) updateData.keyIdeas = Array.isArray(keyIdeas) ? keyIdeas : [];
    if (vocabulary !== undefined) updateData.vocabulary = vocabulary as Prisma.InputJsonValue;
    if (contentSections !== undefined) updateData.contentSections = contentSections as Prisma.InputJsonValue;
    if (exercises !== undefined) updateData.exercises = exercises as Prisma.InputJsonValue;
    if (recommended !== undefined) updateData.recommended = recommended;
    if (order !== undefined) updateData.order = order;
    if (active !== undefined) updateData.active = active;

    const task = await prisma.readingTask.update({
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

// DELETE: Xóa Reading task
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
    const existing = await prisma.readingTask.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    await prisma.readingTask.delete({
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


