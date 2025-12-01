import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { handleError } from "@/lib/error-handler";

// GET: Lấy danh sách activities (có thể filter theo unitId, skill)
// For WRITING skill, reuse the same query logic as user page to ensure data matches
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
    const skill = searchParams.get("skill");
    const level = searchParams.get("level");
    const type = searchParams.get("type");

    // For WRITING skill, use the same query logic as user page
    // Reuse the exact same where clause and orderBy from activityService.getActivitiesBySkill
    if (skill && skill.toUpperCase() === "WRITING") {
      try {
        // Build where clause exactly like activityService.getActivitiesBySkill
        const whereClause: {
          skill: "WRITING";
          level?: "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
        } = {
          skill: "WRITING",
          ...(level && { level: level as "A1" | "A2" | "B1" | "B2" | "C1" | "C2" }),
        };

        console.log("[Admin Activities API] WRITING skill query:", JSON.stringify(whereClause, null, 2));

        // Use the same orderBy as user page: [{ level: "asc" }, { createdAt: "desc" }]
        // Use the EXACT same baseInclude as activityService.getActivitiesBySkill for WRITING
        // Then enhance with admin-specific fields
        const baseInclude: {
          unit: {
            select: {
              title: boolean;
              level: boolean;
              id: boolean;
              module: {
                select: {
                  id: boolean;
                  code: boolean;
                  title: boolean;
                };
              };
            };
          };
          questions: {
            select: {
              id: boolean;
              order: boolean;
              type: boolean;
              score: boolean;
            };
          };
          _count: {
            select: {
              questions: boolean;
            };
          };
        } = {
          unit: {
            select: {
              title: true,
              level: true,
              // Add id and module for admin (not in user query, but needed for admin display)
              id: true,
              module: {
                select: {
                  id: true,
                  code: true,
                  title: true,
                },
              },
            },
          },
          questions: {
            select: {
              id: true,
              order: true,
              type: true,
              score: true,
            },
          },
          _count: {
            select: {
              questions: true,
            },
          },
        };

        // Admin-specific includes (thêm vào, không thay đổi base)
        const adminInclude = {
          author: {
            select: {
              id: true,
              name: true,
              email: true,
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
        };

        const activities = await prisma.activity.findMany({
          where: whereClause,
          orderBy: [
            { level: "asc" },
            { createdAt: "desc" },
          ],
          include: {
            ...baseInclude,
            ...adminInclude,
          },
        });

        console.log(`[Admin Activities API] Found ${activities.length} WRITING activities`);

        return NextResponse.json({
          success: true,
          activities,
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
    }

    // For other skills, use the original query logic
    const where: {
      unitId?: string;
      skill?: "WRITING" | "READING" | "LISTENING" | "SPEAKING" | "GRAMMAR" | "VOCABULARY";
      level?: "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
    } = {};
    if (unitId) where.unitId = unitId;
    if (skill) {
      // Ensure skill is a valid enum value
      where.skill = skill.toUpperCase() as "WRITING" | "READING" | "LISTENING" | "SPEAKING" | "GRAMMAR" | "VOCABULARY";
    }
    if (level) where.level = level as "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
    
    console.log("[Activities API] Query params:", { unitId, skill, level, type, where });

    let activities;
    try {
      activities = await prisma.activity.findMany({
        where,
        orderBy: { createdAt: "desc" },
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
          author: {
            select: {
              id: true,
              name: true,
              email: true,
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

// POST: Tạo activity mới
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
      unitId,
      type,
      title,
      instruction,
      maxScore,
      timeLimitSec,
      level,
      skill,
      mediaUrls,
    } = body;

    if (!unitId || !type || !title || !level || !skill) {
      return NextResponse.json(
        { error: "Unit ID, type, title, level, and skill are required" },
        { status: 400 }
      );
    }

    let activity: Awaited<ReturnType<typeof prisma.activity.create>>;
    try {
      // Create activity
      activity = await prisma.activity.create({
        data: {
          unitId,
          authorId: admin.id,
          type,
          title: title.trim(),
          instruction: instruction?.trim() || null,
          maxScore: maxScore || null,
          timeLimitSec: timeLimitSec || null,
          level,
          skill,
        },
        include: {
          unit: {
            select: {
              id: true,
              title: true,
            },
          },
          media: true,
        },
      });

      // Create media assets if provided
      if (mediaUrls && Array.isArray(mediaUrls) && mediaUrls.length > 0) {
        await Promise.all(
          mediaUrls.map((media: { url: string; type: string; durationS?: number }) =>
            prisma.mediaAsset.create({
              data: {
                activityId: activity.id,
                url: media.url,
                type: media.type as "AUDIO" | "VIDEO" | "IMAGE",
                durationS: media.durationS || null,
              },
            })
          )
        );

        // Reload activity with media
        const reloadedActivity = await prisma.activity.findUnique({
          where: { id: activity.id },
          include: {
            unit: {
              select: {
                id: true,
                title: true,
              },
            },
            media: true,
          },
        });
        if (reloadedActivity) {
          activity = reloadedActivity;
        }
      }
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
      activity,
    });
  } catch (error) {
    return handleError(error);
  }
}

