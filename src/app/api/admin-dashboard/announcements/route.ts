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

    const where: {
      isPublished?: boolean;
    } = {};
    if (isPublished !== null) {
      where.isPublished = isPublished === "true";
    }

    let announcements, total;
    try {
      [announcements, total] = await Promise.all([
        // @ts-expect-error - Announcement model may not exist in Prisma schema
        prisma.announcement.findMany({
          where,
          skip,
          take: limit,
          orderBy: [
            { priority: "desc" },
            { createdAt: "desc" },
          ],
          include: {
            author: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        }),
        // @ts-expect-error - Announcement model may not exist in Prisma schema
        prisma.announcement.count({ where }),
      ]);
    } catch (dbError: unknown) {
      const error = dbError as { code?: string; message?: string };
      // Check if it's a "Cannot read properties of undefined" error (Prisma Client not generated)
      if (
        error.message?.includes("Cannot read properties of undefined") ||
        error.message?.includes("reading 'findMany'") ||
        error.message?.includes("announcement is not a function")
      ) {
        return NextResponse.json(
          {
            error: "Prisma Client not generated. Please run: npx prisma generate",
            details: "The Announcement model is not available in Prisma Client. You need to regenerate the client after adding new models to the schema.",
          },
          { status: 500 }
        );
      }
      // Check if it's a table doesn't exist error
      if (error.code === "P2021" || error.message?.includes("does not exist")) {
        return NextResponse.json(
          {
            error: "Database table not found. Please run migrations: npm run db:migrate",
            details: error.message,
          },
          { status: 500 }
        );
      }
      throw dbError;
    }

    return NextResponse.json({
      success: true,
      announcements,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
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

    if (!title || !content) {
      return NextResponse.json(
        { error: "Title and content are required" },
        { status: 400 }
      );
    }

    let announcement;
    try {
      // @ts-expect-error - Announcement model may not exist in Prisma schema
      announcement = await prisma.announcement.create({
        data: {
          title: title.trim(),
          content: content.trim(),
          summary: summary?.trim() || null,
          authorId: admin.id,
          isPublished: isPublished || false,
          priority: priority || 0,
          startDate: startDate ? new Date(startDate) : null,
          endDate: endDate ? new Date(endDate) : null,
          imageUrl: imageUrl?.trim() || null,
          metadata: metadata || null,
        },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });
    } catch (dbError: unknown) {
      const error = dbError as { code?: string; message?: string };
      // Check if it's a "Cannot read properties of undefined" error
      if (
        error.message?.includes("Cannot read properties of undefined") ||
        error.message?.includes("reading 'create'") ||
        error.message?.includes("announcement is not a function")
      ) {
        return NextResponse.json(
          {
            error: "Prisma Client not generated. Please run: npx prisma generate",
            details: "The Announcement model is not available in Prisma Client.",
          },
          { status: 500 }
        );
      }
      throw dbError;
    }

    return NextResponse.json({
      success: true,
      announcement,
    });
  } catch (error) {
    return handleError(error);
  }
}

