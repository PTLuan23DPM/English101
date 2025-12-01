import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { handleError } from "@/lib/error-handler";

// GET: Lấy danh sách Grammar tasks
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
    const category = searchParams.get("category");
    const active = searchParams.get("active");

    const where: {
      level?: string;
      category?: string;
      active?: boolean;
    } = {};
    if (level) where.level = level;
    if (category) where.category = category;
    if (active !== null) where.active = active === "true";

    try {
      const tasks = await prisma.grammarTask.findMany({
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
            details: "The GrammarTask table does not exist in the database.",
          },
          { status: 500 }
        );
      }
      if (error.message?.includes("grammarTask")) {
        return NextResponse.json(
          {
            error: "Prisma Client missing grammarTask model. Please restart dev server after running 'npx prisma generate'",
            details: "The GrammarTask model is not available in Prisma Client.",
          },
          { status: 500 }
        );
      }
      throw dbError;
    }
  } catch (error) {
    console.error("[GrammarTasks API] Error:", error);
    return handleError(error);
  }
}

// POST: Tạo Grammar task mới
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

    if (!title || !level || !introduction) {
      return NextResponse.json(
        { error: "Title, level, and introduction are required" },
        { status: 400 }
      );
    }

    // Get max order if not provided
    let taskOrder = order;
    if (taskOrder === undefined || taskOrder === null) {
      const maxOrder = await prisma.grammarTask.findFirst({
        orderBy: { order: "desc" },
        select: { order: true },
      });
      taskOrder = (maxOrder?.order ?? -1) + 1;
    }

    // Calculate counts if not provided
    const exCount = exampleCount !== undefined ? exampleCount : (Array.isArray(examples) ? examples.length : 0);
    const exerCount = exerciseCount !== undefined ? exerciseCount : (Array.isArray(exercises) ? exercises.length : 0);

    const task = await prisma.grammarTask.create({
      data: {
        title: title.trim(),
        level: level.trim(),
        introduction: introduction.trim(),
        examples: examples || null,
        exercises: exercises || null,
        exampleCount: exCount,
        exerciseCount: exerCount,
        category: category?.trim() || null,
        recommended: recommended ?? false,
        order: taskOrder,
        active: active !== undefined ? active : true,
      },
    });

    return NextResponse.json({
      success: true,
      task,
    });
  } catch (error) {
    console.error("[GrammarTasks API] Error:", error);
    return handleError(error);
  }
}


