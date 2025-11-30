import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { handleError } from "@/lib/error-handler";

// GET: Lấy bảng xếp hạng người học nổi bật
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
    const sortBy = searchParams.get("sortBy") || "streak"; // streak, progress, score, attempts
    const limit = parseInt(searchParams.get("limit") || "20");

    // Get all users with their stats
    const users = await prisma.user.findMany({
      where: {
        role: "USER", // Only regular users, not admins
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        streak: true,
        longestStreak: true,
        cefrLevel: true,
        lastActive: true,
        createdAt: true,
        _count: {
          select: {
            progress: true,
            attempts: true,
          },
        },
        progress: {
          select: {
            status: true,
            scoreSum: true,
          },
        },
        attempts: {
          where: {
            status: "graded",
            score: {
              not: null,
            },
          },
          select: {
            score: true,
          },
        },
      },
    });

    // Calculate scores and rankings
    const usersWithStats = users.map((user) => {
      const completedProgress = user.progress.filter((p) => p.status === "completed");
      const totalScore = completedProgress.reduce((sum, p) => sum + (p.scoreSum || 0), 0);
      const avgScore =
        user.attempts.length > 0
          ? user.attempts.reduce((sum, a) => sum + (a.score || 0), 0) / user.attempts.length
          : 0;

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        streak: user.streak,
        longestStreak: user.longestStreak,
        cefrLevel: user.cefrLevel,
        lastActive: user.lastActive,
        createdAt: user.createdAt,
        stats: {
          totalProgress: user._count.progress,
          completedProgress: completedProgress.length,
          totalAttempts: user._count.attempts,
          totalScore,
          avgScore: Math.round(avgScore * 10) / 10,
        },
      };
    });

    // Sort based on sortBy parameter
    let sortedUsers = [...usersWithStats];
    switch (sortBy) {
      case "streak":
        sortedUsers.sort((a, b) => b.streak - a.streak);
        break;
      case "progress":
        sortedUsers.sort((a, b) => b.stats.completedProgress - a.stats.completedProgress);
        break;
      case "score":
        sortedUsers.sort((a, b) => b.stats.totalScore - a.stats.totalScore);
        break;
      case "attempts":
        sortedUsers.sort((a, b) => b.stats.totalAttempts - a.stats.totalAttempts);
        break;
      default:
        sortedUsers.sort((a, b) => b.streak - a.streak);
    }

    // Add ranking
    const rankedUsers = sortedUsers.slice(0, limit).map((user, index) => ({
      ...user,
      rank: index + 1,
    }));

    return NextResponse.json({
      success: true,
      data: {
        users: rankedUsers,
        sortBy,
        total: users.length,
      },
    });
  } catch (error) {
    return handleError(error);
  }
}

