import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { handleError } from "@/lib/error-handler";

// GET: Lấy danh sách modules
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

    let modules;
    try {
      modules = await prisma.module.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          units: {
            select: {
              id: true,
              title: true,
              order: true,
              _count: {
                select: {
                  activities: true,
                },
              },
            },
            orderBy: { order: "asc" },
          },
          _count: {
            select: {
              units: true,
            },
          },
        },
      });
    } catch (dbError: any) {
      if (
        dbError?.code === "P2021" ||
        dbError?.message?.includes("does not exist") ||
        (dbError?.message?.includes("table") && dbError?.message?.includes("not found"))
      ) {
        return NextResponse.json(
          {
            error: "Database table not found. Please run migrations: npm run db:migrate",
            details: "The Module table does not exist in the database.",
            migrationCommand: "npm run db:migrate",
          },
          { status: 500 }
        );
      }
      throw dbError;
    }

    return NextResponse.json({
      success: true,
      modules,
    });
  } catch (error) {
    return handleError(error);
  }
}

// POST: Tạo module mới
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
    const { code, type, title, description, levelMin, levelMax } = body;

    if (!code || !type || !title) {
      return NextResponse.json(
        { error: "Code, type, and title are required" },
        { status: 400 }
      );
    }

    let module;
    try {
      module = await prisma.module.create({
        data: {
          code: code.trim(),
          type,
          title: title.trim(),
          description: description?.trim() || null,
          levelMin: levelMin || "A1",
          levelMax: levelMax || "C2",
        },
        include: {
          units: {
            select: {
              id: true,
              title: true,
              order: true,
            },
          },
        },
      });
    } catch (dbError: any) {
      if (dbError?.code === "P2002") {
        return NextResponse.json(
          { error: "Module code already exists" },
          { status: 400 }
        );
      }
      if (
        dbError?.code === "P2021" ||
        dbError?.message?.includes("does not exist")
      ) {
        return NextResponse.json(
          {
            error: "Database table not found. Please run migrations: npm run db:migrate",
            details: "The Module table does not exist in the database.",
          },
          { status: 500 }
        );
      }
      throw dbError;
    }

    return NextResponse.json({
      success: true,
      module,
    });
  } catch (error) {
    return handleError(error);
  }
}

