import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { handleError } from "@/lib/error-handler";

// GET: Lấy thống kê ratings và mức độ hài lòng
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
    const unitId = searchParams.get("unitId");
    const activityId = searchParams.get("activityId");

    const where: any = {};
    if (unitId) where.unitId = unitId;
    if (activityId) where.activityId = activityId;

    let ratings, stats;
    try {
      [ratings, stats] = await Promise.all([
        prisma.rating.findMany({
          where,
          orderBy: { createdAt: "desc" },
          take: 50,
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            unit: {
              select: {
                id: true,
                title: true,
              },
            },
            activity: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        }),
        prisma.rating.aggregate({
          where,
          _count: true,
          _avg: {
            rating: true,
          },
        }),
      ]);

      // Calculate rating distribution
      const ratingCounts = await Promise.all([
        prisma.rating.count({ where: { ...where, rating: 1 } }),
        prisma.rating.count({ where: { ...where, rating: 2 } }),
        prisma.rating.count({ where: { ...where, rating: 3 } }),
        prisma.rating.count({ where: { ...where, rating: 4 } }),
        prisma.rating.count({ where: { ...where, rating: 5 } }),
      ]);

      const helpfulCount = await prisma.rating.count({
        where: { ...where, helpful: true },
      });

      stats = {
        ...stats,
        distribution: {
          1: ratingCounts[0],
          2: ratingCounts[1],
          3: ratingCounts[2],
          4: ratingCounts[3],
          5: ratingCounts[4],
        },
        helpfulCount,
        helpfulPercentage:
          stats._count > 0
            ? Math.round((helpfulCount / stats._count) * 100)
            : 0,
        averageRating: stats._avg.rating
          ? Math.round(stats._avg.rating * 10) / 10
          : 0,
      };
    } catch (dbError: any) {
      // Check for Prisma Client not generated
      if (
        dbError?.message?.includes("Cannot read properties of undefined") ||
        dbError?.message?.includes("reading 'findMany'") ||
        dbError?.message?.includes("rating is not a function")
      ) {
        return NextResponse.json(
          {
            error: "Prisma Client not generated. Please run: npx prisma generate",
            details: "The Rating model is not available in Prisma Client.",
          },
          { status: 500 }
        );
      }
      
      // Check for table not found
      if (
        dbError?.code === "P2021" ||
        dbError?.message?.includes("does not exist") ||
        (dbError?.message?.includes("table") && dbError?.message?.includes("not found"))
      ) {
        return NextResponse.json(
          {
            error: "Database table not found. Please run migrations: npm run db:migrate",
            details: "The Rating table does not exist in the database. Run 'npm run db:migrate' or 'npx prisma migrate dev' to create it.",
            migrationCommand: "npm run db:migrate",
          },
          { status: 500 }
        );
      }
      
      throw dbError;
    }

    return NextResponse.json({
      success: true,
      ratings,
      stats,
    });
  } catch (error) {
    return handleError(error);
  }
}

