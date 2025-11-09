import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { handleError } from "@/lib/error-handler";

// GET: Lấy page content theo slug
export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
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

    let page;
    try {
      page = await prisma.pageContent.findUnique({
        where: { slug: params.slug },
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
        dbError?.message?.includes("reading 'findUnique'") ||
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

    if (!page) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      page,
    });
  } catch (error) {
    return handleError(error);
  }
}

// PATCH: Cập nhật page content
export async function PATCH(
  req: NextRequest,
  { params }: { params: { slug: string } }
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
    const { title, content, isPublished, metadata } = body;

    const updateData: any = {};
    if (title !== undefined) updateData.title = title.trim();
    if (content !== undefined) updateData.content = content.trim();
    if (isPublished !== undefined) updateData.isPublished = isPublished;
    if (metadata !== undefined) updateData.metadata = metadata;

    let page;
    try {
      page = await prisma.pageContent.update({
        where: { slug: params.slug },
        data: updateData,
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
        dbError?.message?.includes("reading 'update'") ||
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

