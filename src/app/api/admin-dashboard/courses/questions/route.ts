import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { handleError } from "@/lib/error-handler";
import { Prisma } from "@prisma/client";

// GET: Lấy danh sách questions (có thể filter theo activityId)
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
    const activityId = searchParams.get("activityId");

    const where: {
      activityId?: string;
    } = {};
    if (activityId) where.activityId = activityId;

    let questions;
    try {
      questions = await prisma.question.findMany({
        where,
        orderBy: { order: "asc" },
        include: {
          activity: {
            select: {
              id: true,
              title: true,
            },
          },
          choices: {
            orderBy: { order: "asc" },
          },
          answers: true,
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
            details: "The Question table does not exist in the database.",
            migrationCommand: "npm run db:migrate",
          },
          { status: 500 }
        );
      }
      throw dbError;
    }

    return NextResponse.json({
      success: true,
      questions,
    });
  } catch (error) {
    return handleError(error);
  }
}

// POST: Tạo question mới
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
      activityId,
      order,
      type,
      prompt,
      explanation,
      score,
      data,
      mediaId,
      contentId,
      choices,
      answers,
    } = body;

    if (!activityId || !type || !prompt) {
      return NextResponse.json(
        { error: "Activity ID, type, and prompt are required" },
        { status: 400 }
      );
    }

    let question: Awaited<ReturnType<typeof prisma.question.create>>;
    try {
      // Create question
      question = await prisma.question.create({
        data: {
          activityId,
          authorId: admin.id,
          order: order || 1,
          type,
          prompt: prompt.trim(),
          explanation: explanation?.trim() || null,
          score: score || 1,
          data: data || null,
          mediaId: mediaId || null,
          contentId: contentId || null,
        },
        include: {
          activity: {
            select: {
              id: true,
              title: true,
            },
          },
          choices: true,
          answers: true,
        },
      });

      // Create choices if provided
      if (choices && Array.isArray(choices) && choices.length > 0) {
        await Promise.all(
          choices.map((choice: { text: string; value?: string; isCorrect?: boolean; order?: number }, index: number) =>
            prisma.choice.create({
              data: {
                questionId: question.id,
                order: choice.order || index + 1,
                text: choice.text,
                value: choice.value || null,
                isCorrect: choice.isCorrect || false,
              },
            })
          )
        );
      }

      // Create answers if provided
      if (answers && Array.isArray(answers) && answers.length > 0) {
        await Promise.all(
          answers.map((answer: { key: string; meta?: unknown }) =>
            prisma.answerKey.create({
              data: {
                questionId: question.id,
                key: answer.key,
                meta: answer.meta ?? Prisma.JsonNull,
              },
            })
          )
        );
      }

      // Reload question with choices and answers
      const reloadedQuestion = await prisma.question.findUnique({
        where: { id: question.id },
        include: {
          activity: {
            select: {
              id: true,
              title: true,
            },
          },
          choices: {
            orderBy: { order: "asc" },
          },
          answers: true,
        },
      });
      if (reloadedQuestion) {
        question = reloadedQuestion;
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
            details: "The Question table does not exist in the database.",
            migrationCommand: "npm run db:migrate",
          },
          { status: 500 }
        );
      }
      throw dbError;
    }

    return NextResponse.json({
      success: true,
      question,
    });
  } catch (error) {
    return handleError(error);
  }
}

