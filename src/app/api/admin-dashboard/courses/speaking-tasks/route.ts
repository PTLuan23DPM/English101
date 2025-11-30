import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { handleError } from "@/lib/error-handler";

// GET: Lấy danh sách Speaking tasks
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

    const where: any = {};
    if (level) where.level = level;
    if (type) where.type = type;
    if (active !== null) where.active = active === "true";

    try {
      const tasks = await prisma.speakingTask.findMany({
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
    } catch (dbError: any) {
      if (dbError?.code === "P2021" || dbError?.message?.includes("does not exist")) {
        return NextResponse.json(
          {
            error: "Database table not found. Please run: npx prisma db push",
            details: "The SpeakingTask table does not exist in the database.",
          },
          { status: 500 }
        );
      }
      if (dbError?.message?.includes("speakingTask")) {
        return NextResponse.json(
          {
            error: "Prisma Client missing speakingTask model. Please restart dev server after running 'npx prisma generate'",
            details: "The SpeakingTask model is not available in Prisma Client.",
          },
          { status: 500 }
        );
      }
      throw dbError;
    }
  } catch (error) {
    console.error("[SpeakingTasks API] Error:", error);
    return handleError(error);
  }
}

// POST: Tạo Speaking task mới
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

    if (!title || !type || !level || !prompt) {
      return NextResponse.json(
        { error: "Title, type, level, and prompt are required" },
        { status: 400 }
      );
    }

    // Get max order if not provided
    let taskOrder = order;
    if (taskOrder === undefined || taskOrder === null) {
      const maxOrder = await prisma.speakingTask.findFirst({
        orderBy: { order: "desc" },
        select: { order: true },
      });
      taskOrder = (maxOrder?.order ?? -1) + 1;
    }

    const task = await prisma.speakingTask.create({
      data: {
        title: title.trim(),
        type: type.trim(),
        level: level.trim(),
        prompt: prompt.trim(),
        timeLimit: timeLimit?.trim() || "",
        tips: Array.isArray(tips) ? tips : [],
        vocab: vocab || null,
        phrases: Array.isArray(phrases) ? phrases : [],
        recommended: recommended ?? false,
        icon: icon || "🎤",
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
    console.error("[SpeakingTasks API] Error:", error);
    return handleError(error);
  }
}

