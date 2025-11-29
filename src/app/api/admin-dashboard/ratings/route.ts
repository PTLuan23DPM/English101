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

    return NextResponse.json(
      {
        error: "Rating model not available",
        details: "The Rating model is not defined in Prisma schema.",
      },
      { status: 501 }
    );
  } catch (error) {
    return handleError(error);
  }
}

