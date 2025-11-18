import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import UserManagementClient from "./UserManagementClient";
import type { AdminUserRecord } from "./UserManagementClient";

export const dynamic = "force-dynamic";

export default async function UserManagementPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/authentication/login");
  }

  if (session.user?.role !== "ADMIN") {
    redirect("/english/dashboard");
  }

  const usersFromDb = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      role: true,
      cefrLevel: true,
      placementTestCompleted: true,
      streak: true,
      longestStreak: true,
      lastActive: true,
      createdAt: true,
      _count: {
        select: {
          progress: true,
          attempts: true,
        },
      },
    },
  });

  const mappedUsers: AdminUserRecord[] = usersFromDb.map((user) => ({
    ...user,
    lastActive: user.lastActive ? user.lastActive.toISOString() : null,
    createdAt: user.createdAt.toISOString(),
    _count: {
      progress: user._count.progress,
      attempts: user._count.attempts,
    },
  }));

  return <UserManagementClient initialUsers={mappedUsers} />;
}

