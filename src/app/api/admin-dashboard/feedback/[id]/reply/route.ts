import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { handleError } from "@/lib/error-handler";

// POST: Trả lời feedback
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const { reply, status } = body;

    if (!reply || typeof reply !== "string" || reply.trim().length === 0) {
      return NextResponse.json(
        { error: "Reply is required" },
        { status: 400 }
      );
    }

    let feedback;
    try {
      feedback = await prisma.feedback.update({
        where: { id: params.id },
        data: {
          reply: reply.trim(),
          repliedAt: new Date(),
          repliedBy: admin.id,
          status: status || "resolved",
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          repliedByUser: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });
    } catch (dbError: any) {
      // Check for Prisma Client not generated
      if (
        dbError?.message?.includes("Cannot read properties of undefined") ||
        dbError?.message?.includes("reading 'update'")
      ) {
        return NextResponse.json(
          {
            error: "Prisma Client not generated. Please run: npx prisma generate",
            details: "The Feedback model is not available in Prisma Client.",
          },
          { status: 500 }
        );
      }
      
      // Check for table not found
      if (
        dbError?.code === "P2021" ||
        dbError?.message?.includes("does not exist") ||
        (dbError?.message?.includes("table") && dbError?.message?.includes("not found"))
      ) {
        return NextResponse.json(
          {
            error: "Database table not found. Please run migrations: npm run db:migrate",
            details: "The Feedback table does not exist in the database. Run 'npm run db:migrate' or 'npx prisma migrate dev' to create it.",
            migrationCommand: "npm run db:migrate",
          },
          { status: 500 }
        );
      }
      
      throw dbError;
    }

    return NextResponse.json({
      success: true,
      feedback,
    });
  } catch (error) {
    return handleError(error);
  }
}

