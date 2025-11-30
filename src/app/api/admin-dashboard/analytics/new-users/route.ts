import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { handleError } from "@/lib/error-handler";

// GET: Lấy thống kê người dùng mới đăng ký
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
    const period = searchParams.get("period") || "30"; // days, 7, 30, 90, 365
    const periodDays = parseInt(period);

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodDays);

    // Get new users grouped by date
    const newUsers = await prisma.user.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        role: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Group by date
    const groupedByDate: Record<string, number> = {};
    const today = new Date();
    
    // Initialize all dates in range with 0
    for (let i = 0; i < periodDays; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateKey = date.toISOString().split("T")[0];
      groupedByDate[dateKey] = 0;
    }

    // Count users per date
    newUsers.forEach((user) => {
      const dateKey = new Date(user.createdAt).toISOString().split("T")[0];
      if (groupedByDate[dateKey] !== undefined) {
        groupedByDate[dateKey]++;
      }
    });

    // Convert to array format for chart
    const chartData = Object.entries(groupedByDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({
        date,
        count,
      }));

    // Calculate totals
    const totalNewUsers = newUsers.length;
    const todayNewUsers = newUsers.filter((user) => {
      const userDate = new Date(user.createdAt).toISOString().split("T")[0];
      const todayKey = today.toISOString().split("T")[0];
      return userDate === todayKey;
    }).length;

    const thisWeekNewUsers = newUsers.filter((user) => {
      const userDate = new Date(user.createdAt);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return userDate >= weekAgo;
    }).length;

    const thisMonthNewUsers = newUsers.filter((user) => {
      const userDate = new Date(user.createdAt);
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      return userDate >= monthAgo;
    }).length;

    return NextResponse.json({
      success: true,
      data: {
        chartData,
        totals: {
          total: totalNewUsers,
          today: todayNewUsers,
          thisWeek: thisWeekNewUsers,
          thisMonth: thisMonthNewUsers,
        },
        recentUsers: newUsers.slice(0, 10), // Last 10 new users
      },
    });
  } catch (error) {
    return handleError(error);
  }
}

