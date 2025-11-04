import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  let userId: string | undefined;
  
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    userId = session.user.id;

    // Check if prisma is initialized
    if (!prisma) {
      console.error("Prisma client is not initialized");
      return NextResponse.json(
        { error: "Database connection error" },
        { status: 500 }
      );
    }

    // Verify user exists in database
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      console.error(`User not found in database: ${userId}`);
      return NextResponse.json(
        { error: "User not found. Please sign in again." },
        { status: 404 }
      );
    }

    const body = await req.json();
    const { score, totalQuestions, answers } = body;

    // Validate required fields
    if (typeof score !== "number" || score < 0) {
      return NextResponse.json(
        { error: "Invalid score" },
        { status: 400 }
      );
    }

    if (!answers || !Array.isArray(answers)) {
      return NextResponse.json(
        { error: "Invalid answers format" },
        { status: 400 }
      );
    }

    // Determine CEFR level based on score
    let cefrLevel = "A1";
    let description = "Beginner";

    if (score >= 23) {
      cefrLevel = "C2";
      description = "Proficient";
    } else if (score >= 19) {
      cefrLevel = "C1";
      description = "Advanced";
    } else if (score >= 15) {
      cefrLevel = "B2";
      description = "Upper Intermediate";
    } else if (score >= 11) {
      cefrLevel = "B1";
      description = "Intermediate";
    } else if (score >= 6) {
      cefrLevel = "A2";
      description = "Elementary";
    }

    // Save test result
    const testResult = await prisma.placementTestResult.create({
      data: {
        userId: userId,
        score,
        totalQuestions,
        cefrLevel,
        answers,
      },
    });

    // Update user's level and mark test as completed
    await prisma.user.update({
      where: { id: userId },
      data: {
        placementTestCompleted: true,
        cefrLevel,
        placementScore: score,
        lastActive: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      cefrLevel,
      description,
      score,
      totalQuestions,
      testResultId: testResult.id,
    });
  } catch (error: any) {
    console.error("Placement test submit error:", error);
    
    // Return more specific error message
    let errorMessage = "Failed to submit test";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    // Check for Prisma errors
    if (error?.code === "P2002") {
      errorMessage = "Test result already exists";
    } else if (error?.code === "P2025") {
      errorMessage = "User not found";
    } else if (error?.code === "P2003") {
      // Foreign key constraint violation
      errorMessage = "Invalid user session. Please sign in again.";
      console.error("Foreign key constraint violation - user ID may not exist in database:", userId);
    }
    
    return NextResponse.json(
      { error: errorMessage, details: error?.message },
      { status: 500 }
    );
  }
}
