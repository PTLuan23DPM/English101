import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { handleError } from "@/lib/error-handler";

// GET: Lấy chi tiết activity
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const { id } = await params;

    let activity;
    try {
      activity = await prisma.activity.findUnique({
        where: { id },
        include: {
          unit: {
            include: {
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
          media: true,
          questions: {
            include: {
              choices: {
                orderBy: { order: "asc" },
              },
              answers: true,
            },
            orderBy: { order: "asc" },
          },
        },
      });

      if (!activity) {
        return NextResponse.json(
          { error: "Activity not found" },
          { status: 404 }
        );
      }
    } catch (dbError: any) {
      if (
        dbError?.code === "P2021" ||
        dbError?.message?.includes("does not exist")
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

// PATCH: Cập nhật activity
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const { id } = await params;
    const body = await req.json();
    const {
      type,
      title,
      instruction,
      maxScore,
      timeLimitSec,
      level,
      skill,
      mediaUrls,
    } = body;

    const updateData: any = {};
    if (type !== undefined) updateData.type = type;
    if (title !== undefined) updateData.title = title.trim();
    if (instruction !== undefined) updateData.instruction = instruction?.trim() || null;
    if (maxScore !== undefined) updateData.maxScore = maxScore || null;
    if (timeLimitSec !== undefined) updateData.timeLimitSec = timeLimitSec || null;
    if (level !== undefined) updateData.level = level;
    if (skill !== undefined) updateData.skill = skill;

    let activity;
    try {
      // Update activity
      activity = await prisma.activity.update({
        where: { id },
        data: updateData,
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

      // Update media if provided
      if (mediaUrls !== undefined) {
        // Delete existing media
        await prisma.mediaAsset.deleteMany({
          where: { activityId: id },
        });

        // Create new media assets
        if (Array.isArray(mediaUrls) && mediaUrls.length > 0) {
          await Promise.all(
            mediaUrls.map((media: { url: string; type: string; durationS?: number }) =>
              prisma.mediaAsset.create({
                data: {
                  activityId: id,
                  url: media.url,
                  type: media.type as any,
                  durationS: media.durationS || null,
                },
              })
            )
          );
        }

        // Reload activity with media
        activity = await prisma.activity.findUnique({
          where: { id },
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
      }
    } catch (dbError: any) {
      if (
        dbError?.code === "P2021" ||
        dbError?.message?.includes("does not exist")
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

// DELETE: Xóa activity
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const { id } = await params;

    try {
      await prisma.activity.delete({
        where: { id },
      });
    } catch (dbError: any) {
      if (dbError?.code === "P2025") {
        return NextResponse.json(
          { error: "Activity not found" },
          { status: 404 }
        );
      }
      if (
        dbError?.code === "P2021" ||
        dbError?.message?.includes("does not exist")
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
      message: "Activity deleted successfully",
    });
  } catch (error) {
    return handleError(error);
  }
}

