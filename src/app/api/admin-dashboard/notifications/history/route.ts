import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// GET: Lấy lịch sử thông báo đã gửi
export async function GET(req: NextRequest) {
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

    // Get all notifications grouped by sentBy and createdAt
    // Group notifications sent at the same time by the same admin
    const notifications = await prisma.userNotification.findMany({
      where: {
        sentBy: admin.id,
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        title: true,
        message: true,
        type: true,
        link: true,
        userId: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        read: true,
        createdAt: true,
      },
    });

    // Group notifications by title, message, type, link, and createdAt (within 1 second)
    const groupedNotifications = notifications.reduce((acc, notif) => {
      const key = `${notif.title}-${notif.message}-${notif.type}-${notif.link || ""}-${Math.floor(notif.createdAt.getTime() / 1000)}`;
      
      if (!acc[key]) {
        acc[key] = {
          id: notif.id,
          title: notif.title,
          message: notif.message,
          type: notif.type,
          link: notif.link,
          sentAt: notif.createdAt,
          recipients: [],
          totalSent: 0,
          readCount: 0,
        };
      }
      
      acc[key].recipients.push({
        id: notif.user.id,
        name: notif.user.name,
        email: notif.user.email,
        read: notif.read,
      });
      
      acc[key].totalSent++;
      if (notif.read) {
        acc[key].readCount++;
      }
      
      return acc;
    }, {} as Record<string, any>);

    const history = Object.values(groupedNotifications).map((group: any) => ({
      id: group.id,
      title: group.title,
      message: group.message,
      type: group.type,
      link: group.link,
      sentAt: group.sentAt,
      totalSent: group.totalSent,
      readCount: group.readCount,
      unreadCount: group.totalSent - group.readCount,
      recipients: group.recipients,
    }));

    return NextResponse.json({
      success: true,
      notifications: history,
      total: history.length,
    });
  } catch (error) {
    console.error("[Notifications History API] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch notification history" },
      { status: 500 }
    );
  }
}

