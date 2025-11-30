import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { handleError } from "@/lib/error-handler";

// GET: Lấy danh sách Writing tasks
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

    // Check if writingTask model exists
    if (!prisma.writingTask) {
      console.error("[WritingTasks API] Prisma Client missing writingTask model");
      return NextResponse.json(
        { 
          error: "Database model not available. Please restart the dev server after running 'npx prisma generate'",
          details: "The WritingTask model is not available in Prisma Client. This usually happens when the dev server was running before generating Prisma Client."
        },
        { status: 500 }
      );
    }

    const tasks = await prisma.writingTask.findMany({
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
  } catch (error) {
    console.error("[WritingTasks API] Error:", error);
    return handleError(error);
  }
}

// POST: Tạo Writing task mới
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
      targetWords,
      tips,
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
      const maxOrder = await prisma.writingTask.findFirst({
        orderBy: { order: "desc" },
        select: { order: true },
      });
      taskOrder = (maxOrder?.order ?? -1) + 1;
    }

    const task = await prisma.writingTask.create({
      data: {
        title: title.trim(),
        type: type.trim(),
        level: level.trim(),
        prompt: prompt.trim(),
        targetWords: targetWords?.trim() || "",
        tips: Array.isArray(tips) ? tips : [],
        recommended: recommended ?? false,
        icon: icon || "📝",
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
    return handleError(error);
  }
}

