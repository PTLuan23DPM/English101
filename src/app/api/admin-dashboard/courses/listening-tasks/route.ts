import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { handleError } from "@/lib/error-handler";

// GET: Lấy danh sách Listening tasks
export async function GET(req: NextRequest) {
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

    const searchParams = req.nextUrl.searchParams;
    const level = searchParams.get("level");
    const type = searchParams.get("type");
    const active = searchParams.get("active");

    const where: {
      level?: string;
      type?: string;
      active?: boolean;
    } = {};
    if (level) where.level = level;
    if (type) where.type = type;
    if (active !== null) where.active = active === "true";

    try {
      const tasks = await prisma.listeningTask.findMany({
        where,
        orderBy: [
          { order: "asc" },
          { createdAt: "desc" },
        ],
      });

      return NextResponse.json({
        success: true,
        tasks,
      });
    } catch (dbError: unknown) {
      const error = dbError as { code?: string; message?: string };
      if (error.code === "P2021" || error.message?.includes("does not exist")) {
        return NextResponse.json(
          {
            error: "Database table not found. Please run: npx prisma db push",
            details: "The ListeningTask table does not exist in the database.",
          },
          { status: 500 }
        );
      }
      if (error.message?.includes("listeningTask")) {
        return NextResponse.json(
          {
            error: "Prisma Client missing listeningTask model. Please restart dev server after running 'npx prisma generate'",
            details: "The ListeningTask model is not available in Prisma Client.",
          },
          { status: 500 }
        );
      }
      throw dbError;
    }
  } catch (error) {
    console.error("[ListeningTasks API] Error:", error);
    return handleError(error);
  }
}

// POST: Tạo Listening task mới
export async function POST(req: NextRequest) {
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
      description,
      duration,
      speakers,
      accent,
      questions,
      tags,
      recommended,
      icon,
      color,
      order,
      active,
    } = body;

    if (!title || !type || !level || !description) {
      return NextResponse.json(
        { error: "Title, type, level, and description are required" },
        { status: 400 }
      );
    }

    // Get max order if not provided
    let taskOrder = order;
    if (taskOrder === undefined || taskOrder === null) {
      const maxOrder = await prisma.listeningTask.findFirst({
        orderBy: { order: "desc" },
        select: { order: true },
      });
      taskOrder = (maxOrder?.order ?? -1) + 1;
    }

    const task = await prisma.listeningTask.create({
      data: {
        title: title.trim(),
        type: type.trim(),
        level: level.trim(),
        description: description.trim(),
        duration: duration?.trim() || "",
        speakers: speakers?.trim() || "",
        accent: accent?.trim() || "",
        questions: questions || 0,
        tags: Array.isArray(tags) ? tags : [],
        recommended: recommended ?? false,
        icon: icon || "🎧",
        color: color || "blue",
        order: taskOrder,
        active: active !== undefined ? active : true,
      },
    });

    return NextResponse.json({
      success: true,
      task,
    });
  } catch (error) {
    console.error("[ListeningTasks API] Error:", error);
    return handleError(error);
  }
}


