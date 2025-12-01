import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { handleError } from "@/lib/error-handler";

// GET: Lấy danh sách activities (public API cho user)
// Query parameters:
// - skill: WRITING, READING, LISTENING, SPEAKING, GRAMMAR, VOCABULARY
// - level: A1, A2, B1, B2, C1, C2
// - unitId: filter theo unit
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const skill = searchParams.get("skill");
    const level = searchParams.get("level");
    const unitId = searchParams.get("unitId");

    const where: {
      skill?: "WRITING" | "READING" | "LISTENING" | "SPEAKING" | "GRAMMAR" | "VOCABULARY";
      level?: "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
      unitId?: string;
    } = {};
    if (skill) {
      // Ensure skill is a valid enum value
      where.skill = skill.toUpperCase() as "WRITING" | "READING" | "LISTENING" | "SPEAKING" | "GRAMMAR" | "VOCABULARY";
    }
    if (level) where.level = level as "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
    if (unitId) where.unitId = unitId;
    
    console.log("[Activities Public API] Query params:", { skill, level, unitId, where });

    let activities;
    try {
      activities = await prisma.activity.findMany({
        where,
        orderBy: [
          { createdAt: "desc" },
        ],
        include: {
          unit: {
            select: {
              id: true,
              title: true,
              module: {
                select: {
                  id: true,
                  code: true,
                  title: true,
                },
              },
            },
          },
          media: {
            select: {
              id: true,
              url: true,
              type: true,
              durationS: true,
            },
          },
          _count: {
            select: {
              questions: true,
            },
          },
        },
      });
    } catch (dbError: unknown) {
      const error = dbError as { code?: string; message?: string };
      if (
        error.code === "P2021" ||
        error.message?.includes("does not exist")
      ) {
        return NextResponse.json(
          {
            error: "Database table not found. Please run migrations: npm run db:migrate",
            details: "The Activity table does not exist in the database.",
            migrationCommand: "npm run db:migrate",
          },
          { status: 500 }
        );
      }
      throw dbError;
    }

    return NextResponse.json({
      success: true,
      activities,
    });
  } catch (error) {
    return handleError(error);
  }
}

