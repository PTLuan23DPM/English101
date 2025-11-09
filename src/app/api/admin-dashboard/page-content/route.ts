import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { handleError } from "@/lib/error-handler";

// GET: Lấy danh sách page content
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

    let pages;
    try {
      pages = await prisma.pageContent.findMany({
        orderBy: { slug: "asc" },
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
    } catch (dbError: any) {
      // Check if it's a "Cannot read properties of undefined" error
      if (
        dbError?.message?.includes("Cannot read properties of undefined") ||
        dbError?.message?.includes("reading 'findMany'") ||
        dbError?.message?.includes("pageContent is not a function")
      ) {
        return NextResponse.json(
          {
            error: "Prisma Client not generated. Please run: npx prisma generate",
            details: "The PageContent model is not available in Prisma Client.",
          },
          { status: 500 }
        );
      }
      // Check if it's a table doesn't exist error
      if (dbError?.code === "P2021" || dbError?.message?.includes("does not exist")) {
        return NextResponse.json(
          {
            error: "Database table not found. Please run migrations: npm run db:migrate",
            details: dbError.message,
          },
          { status: 500 }
        );
      }
      throw dbError;
    }

    return NextResponse.json({
      success: true,
      pages,
    });
  } catch (error) {
    return handleError(error);
  }
}

// POST: Tạo page content mới
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
    const { slug, title, content, isPublished, metadata } = body;

    if (!slug || !title || !content) {
      return NextResponse.json(
        { error: "Slug, title and content are required" },
        { status: 400 }
      );
    }

    let page;
    try {
      page = await prisma.pageContent.create({
        data: {
          slug: slug.trim().toLowerCase(),
          title: title.trim(),
          content: content.trim(),
          authorId: admin.id,
          isPublished: isPublished !== undefined ? isPublished : true,
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
    } catch (dbError: any) {
      // Check if it's a "Cannot read properties of undefined" error
      if (
        dbError?.message?.includes("Cannot read properties of undefined") ||
        dbError?.message?.includes("reading 'create'") ||
        dbError?.message?.includes("pageContent is not a function")
      ) {
        return NextResponse.json(
          {
            error: "Prisma Client not generated. Please run: npx prisma generate",
            details: "The PageContent model is not available in Prisma Client.",
          },
          { status: 500 }
        );
      }
      throw dbError;
    }

    return NextResponse.json({
      success: true,
      page,
    });
  } catch (error) {
    return handleError(error);
  }
}

