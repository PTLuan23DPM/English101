import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { handleError } from "@/lib/error-handler";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const task = await prisma.vocabularyTask.findUnique({ where: { id } });
    if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });
    return NextResponse.json({ success: true, task });
  } catch (error) {
    return handleError(error);
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { role: true },
    });

    if (!admin || admin.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const updateData: any = {};

    if (body.title !== undefined) updateData.title = body.title.trim();
    if (body.icon !== undefined) updateData.icon = body.icon;
    if (body.type !== undefined) updateData.type = body.type.trim();
    if (body.level !== undefined) updateData.level = body.level.trim();
    if (body.description !== undefined) updateData.description = body.description?.trim() || null;
    if (body.wordCount !== undefined) updateData.wordCount = body.wordCount;
    if (body.tags !== undefined) updateData.tags = body.tags;
    if (body.recommended !== undefined) updateData.recommended = body.recommended;
    if (body.color !== undefined) updateData.color = body.color;
    if (body.order !== undefined) updateData.order = body.order;
    if (body.active !== undefined) updateData.active = body.active;

    const task = await prisma.vocabularyTask.update({ where: { id }, data: updateData });
    return NextResponse.json({ success: true, task });
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { role: true },
    });

    if (!admin || admin.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const task = await prisma.vocabularyTask.update({ where: { id }, data: { active: false } });
    return NextResponse.json({ success: true, task });
  } catch (error) {
    return handleError(error);
  }
}

