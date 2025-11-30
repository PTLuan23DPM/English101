import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { handleError } from "@/lib/error-handler";

// GET: Lấy danh sách units (public API cho user)
// Query parameters:
// - skill: WRITING, READING, LISTENING, SPEAKING, GRAMMAR, VOCABULARY
// - level: A1, A2, B1, B2, C1, C2
// - moduleId: filter theo module
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const skill = searchParams.get("skill");
    const level = searchParams.get("level");
    const moduleId = searchParams.get("moduleId");

    const where: any = {};
    if (skill) {
      // Ensure skill is a valid enum value
      where.skill = skill.toUpperCase();
    }
    if (level) where.level = level;
    if (moduleId) where.moduleId = moduleId;
    
    console.log("[Units Public API] Query params:", { skill, level, moduleId, where });

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

