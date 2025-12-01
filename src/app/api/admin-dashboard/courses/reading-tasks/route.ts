import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { handleError } from "@/lib/error-handler";

// GET: Lấy danh sách Reading tasks
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
    const cefr = searchParams.get("cefr");
    const genre = searchParams.get("genre");
    const active = searchParams.get("active");

    const where: {
      cefr?: string;
      genre?: string;
      active?: boolean;
    } = {};
    if (cefr) where.cefr = cefr;
    if (genre) where.genre = genre;
    if (active !== null) where.active = active === "true";

    // Check if readingTask model exists
    try {
      const tasks = await prisma.readingTask.findMany({
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
            details: "The ReadingTask table does not exist in the database.",
          },
          { status: 500 }
        );
      }
      if (error.message?.includes("readingTask")) {
        return NextResponse.json(
          {
            error: "Prisma Client missing readingTask model. Please restart dev server after running 'npx prisma generate'",
            details: "The ReadingTask model is not available in Prisma Client.",
          },
          { status: 500 }
        );
      }
      throw dbError;
    }
  } catch (error) {
    console.error("[ReadingTasks API] Error:", error);
    return handleError(error);
  }
}

// POST: Tạo Reading task mới
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

    if (!title || !cefr || !genre) {
      return NextResponse.json(
        { error: "Title, CEFR level, and genre are required" },
        { status: 400 }
      );
    }

    // Get max order if not provided
    let taskOrder = order;
    if (taskOrder === undefined || taskOrder === null) {
      const maxOrder = await prisma.readingTask.findFirst({
        orderBy: { order: "desc" },
        select: { order: true },
      });
      taskOrder = (maxOrder?.order ?? -1) + 1;
    }

    const task = await prisma.readingTask.create({
      data: {
        title: title.trim(),
        subtitle: subtitle?.trim() || null,
        cefr: cefr.trim(),
        genre: genre.trim(),
        source: source?.trim() || null,
        tags: Array.isArray(tags) ? tags : [],
        estimatedTime: estimatedTime || null,
        wordCount: wordCount || null,
        coverEmoji: coverEmoji || "📖",
        gradient: gradient || null,
        readingSkills: Array.isArray(readingSkills) ? readingSkills : [],
        keyIdeas: Array.isArray(keyIdeas) ? keyIdeas : [],
        vocabulary: vocabulary || null,
        contentSections: contentSections || null,
        exercises: exercises || null,
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
    console.error("[ReadingTasks API] Error:", error);
    return handleError(error);
  }
}

