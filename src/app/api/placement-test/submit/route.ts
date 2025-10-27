import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { answers, score, totalQuestions, detectedLevel, levelScores } = await req.json();

    // Create a test activity record (you can create a special placement test activity)
    // For now, we'll store it in user metadata or create a custom table
    
    // Option 1: Store in UserProgress with a special placement test unit
    // Option 2: Add to user metadata
    // For simplicity, we'll log it and return success
    
    console.log(`Placement test completed by ${user.email}:`, {
      score,
      totalQuestions,
      detectedLevel,
      levelScores,
    });

    // TODO: You can create a PlacementTestResult model in schema.prisma to store this
    // For now, just return success

    return NextResponse.json({
      success: true,
      level: detectedLevel,
      score,
      totalQuestions,
      percentage: Math.round((score / totalQuestions) * 100),
    });
  } catch (error) {
    console.error("Placement test submission error:", error);
    return NextResponse.json(
      { error: "Failed to submit placement test" },
      { status: 500 }
    );
  }
}

