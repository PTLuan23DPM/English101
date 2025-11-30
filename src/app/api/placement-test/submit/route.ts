import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { placementTestController } from "@/server/controllers/placementTestController";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body;
    try {
      body = await req.json();
    } catch (parseError) {
      console.error("Failed to parse request body:", parseError);
      return NextResponse.json(
        { error: "Invalid request body", details: "Request body must be valid JSON" },
        { status: 400 }
      );
    }

    const result = await placementTestController.submitTest(
      session.user.id,
      body
    );

    // Check if result indicates an error (status >= 400 or has error in data)
    if (result.status >= 400 || result.data?.error) {
      const errorResponse = {
        error: result.data?.error || "Failed to submit test",
        details: result.data?.details || result.data?.message || "Unknown error occurred",
        message: result.data?.message
      };
      console.error("Placement test submission error:", errorResponse);
      return NextResponse.json(
        errorResponse,
        { status: result.status || 500 }
      );
    }

    return NextResponse.json(result.data, { status: result.status || 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Placement test submit error:", error);
    
    // Check if it's a database connection error
    if (errorMessage.includes("Database connection failed") || errorMessage.includes("DATABASE_URL")) {
      return NextResponse.json(
        { 
          error: "Database connection failed", 
          details: "Please check your DATABASE_URL environment variable.",
          message: errorMessage 
        },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { 
        error: "Failed to submit test",
        details: errorMessage,
        message: errorMessage 
      },
      { status: 500 }
    );
  }
}
