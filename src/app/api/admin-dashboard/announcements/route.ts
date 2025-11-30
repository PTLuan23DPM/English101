import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { handleError } from "@/lib/error-handler";

// GET: Lấy danh sách announcements
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
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const isPublished = searchParams.get("published");

    const skip = (page - 1) * limit;

    const where: any = {};
    if (isPublished !== null) {
      where.isPublished = isPublished === "true";
    }

    return NextResponse.json(
      {
        error: "Announcement model not available",
        details: "The Announcement model is not defined in Prisma schema.",
      },
      { status: 501 }
    );
  } catch (error) {
    return handleError(error);
  }
}

// POST: Tạo announcement mới
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    const admin = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, role: true },
    });

    if (!admin || admin.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const {
      title,
      content,
      summary,
      isPublished,
      priority,
      startDate,
      endDate,
      imageUrl,
      metadata,
    } = body;

    return NextResponse.json(
      {
        error: "Announcement model not available",
        details: "The Announcement model is not defined in Prisma schema.",
      },
      { status: 501 }
    );
  } catch (error) {
    return handleError(error);
  }
}

