import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { handleError } from "@/lib/error-handler";

// GET: Lấy danh sách writing tasks (public, không cần auth)
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const level = searchParams.get("level");
    const type = searchParams.get("type");
    const active = searchParams.get("active") !== "false"; // Default: only active

    const where: {
      active: boolean;
      level?: string;
      type?: string;
    } = {
      active: active !== false,
    };

    if (level && level !== "All levels") {
      where.level = level;
    }

    if (type && type !== "All types") {
      where.type = type;
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
    return handleError(error);
  }
}

// POST: Tạo writing task mới (chỉ admin)
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
      icon,
      type,
      level,
      prompt,
      targetWords,
      tips,
      recommended,
      color,
      order,
    } = body;

    if (!title || !type || !level || !prompt) {
      return NextResponse.json(
        { error: "Title, type, level, and prompt are required" },
        { status: 400 }
      );
    }

    const task = await prisma.writingTask.create({
      data: {
        title: title.trim(),
        icon: icon || "📝",
        type: type.trim(),
        level: level.trim(),
        prompt: prompt.trim(),
        targetWords: targetWords?.trim() || "",
        tips: tips || [],
        recommended: recommended || false,
        color: color || "blue",
        order: order || 0,
        active: true,
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


