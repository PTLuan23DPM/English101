import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { handleError } from "@/lib/error-handler";

// GET: Lấy danh sách feedback
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
    const status = searchParams.get("status");
    const type = searchParams.get("type");

    const skip = (page - 1) * limit;

    const where: {
      status?: string;
      type?: string;
    } = {};
    if (status) where.status = status;
    if (type) where.type = type;

    let feedbacks, total;
    try {
      [feedbacks, total] = await Promise.all([
        // @ts-expect-error - Feedback model may not exist in Prisma schema
        prisma.feedback.findMany({
          where,
          skip,
          take: limit,
          orderBy: [
            { priority: "desc" },
            { createdAt: "desc" },
          ],
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            repliedByUser: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        }),
        // @ts-expect-error - Feedback model may not exist in Prisma schema
        prisma.feedback.count({ where }),
      ]);
    } catch (dbError: unknown) {
      const error = dbError as { code?: string; message?: string };
      // Check for Prisma Client not generated
      if (
        error.message?.includes("Cannot read properties of undefined") ||
        error.message?.includes("reading 'findMany'") ||
        error.message?.includes("feedback is not a function")
      ) {
        return NextResponse.json(
          {
            error: "Prisma Client not generated. Please run: npx prisma generate",
            details: "The Feedback model is not available in Prisma Client.",
          },
          { status: 500 }
        );
      }
      
      // Check for table not found (P2021 error code or message)
      if (
        error.code === "P2021" ||
        error.message?.includes("does not exist") ||
        error.message?.includes("table") && error.message?.includes("not found")
      ) {
        return NextResponse.json(
          {
            error: "Database table not found. Please run migrations: npm run db:migrate",
            details: "The Feedback table does not exist in the database. Run 'npm run db:migrate' or 'npx prisma migrate dev' to create it.",
            migrationCommand: "npm run db:migrate",
          },
          { status: 500 }
        );
      }
      
      throw dbError;
    }

    return NextResponse.json({
      success: true,
      feedbacks,
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

