import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { handleError } from "@/lib/error-handler";

// GET: Lấy danh sách units (có thể filter theo moduleId)
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
    const moduleId = searchParams.get("moduleId");

    const where: any = {};
    if (moduleId) where.moduleId = moduleId;

    let units;
    try {
      units = await prisma.unit.findMany({
        where,
        orderBy: [
          { moduleId: "asc" },
          { order: "asc" },
        ],
        include: {
          module: {
            select: {
              id: true,
              code: true,
              title: true,
            },
          },
          _count: {
            select: {
              activities: true,
              contents: true,
            },
          },
        },
      });
    } catch (dbError: any) {
      if (
        dbError?.code === "P2021" ||
        dbError?.message?.includes("does not exist")
      ) {
        return NextResponse.json(
          {
            error: "Database table not found. Please run migrations: npm run db:migrate",
            details: "The Unit table does not exist in the database.",
            migrationCommand: "npm run db:migrate",
          },
          { status: 500 }
        );
      }
      throw dbError;
    }

    return NextResponse.json({
      success: true,
      units,
    });
  } catch (error) {
    return handleError(error);
  }
}

// POST: Tạo unit mới
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
    const { moduleId, order, title, overview, level, skill } = body;

    if (!moduleId || !title || !level || !skill) {
      return NextResponse.json(
        { error: "Module ID, title, level, and skill are required" },
        { status: 400 }
      );
    }

    let unit;
    try {
      unit = await prisma.unit.create({
        data: {
          moduleId,
          order: order || 1,
          title: title.trim(),
          overview: overview?.trim() || null,
          level,
          skill,
        },
        include: {
          module: {
            select: {
              id: true,
              code: true,
              title: true,
            },
          },
        },
      });
    } catch (dbError: any) {
      if (
        dbError?.code === "P2021" ||
        dbError?.message?.includes("does not exist")
      ) {
        return NextResponse.json(
          {
            error: "Database table not found. Please run migrations: npm run db:migrate",
            details: "The Unit table does not exist in the database.",
            migrationCommand: "npm run db:migrate",
          },
          { status: 500 }
        );
      }
      throw dbError;
    }

    return NextResponse.json({
      success: true,
      unit,
    });
  } catch (error) {
    return handleError(error);
  }
}

