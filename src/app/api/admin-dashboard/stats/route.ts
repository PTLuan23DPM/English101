import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { handleError } from "@/lib/error-handler";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { role: true },
    });

    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get statistics in parallel
    const [totalUsers, totalLessons, totalVisits] = await Promise.all([
      // Total number of users
      prisma.user.count(),
      // Total number of lessons (units)
      prisma.unit.count(),
      // Total number of visits (using sessions as proxy for visits)
      prisma.session.count(),
    ]);

    return NextResponse.json({
      success: true,
      stats: {
        totalUsers,
        totalLessons,
        totalVisits,
      },
    });
  } catch (error) {
    return handleError(error);
  }
}

