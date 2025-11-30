import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { placementTestController } from "@/server/controllers/placementTestController";

export async function POST(req: NextRequest) {
  try {
    console.log("[PlacementTest] Starting submit request...");
    const session = await getServerSession(authOptions);

    if (!session) {
      console.error("[PlacementTest] No session found");
      return NextResponse.json({ error: "Unauthorized: No session" }, { status: 401 });
    }

    if (!session.user) {
      console.error("[PlacementTest] No user in session");
      return NextResponse.json({ error: "Unauthorized: No user in session" }, { status: 401 });
    }

    // Read body once
    const body = await req.json();
    
    if (!session.user.id) {
      console.error("[PlacementTest] No user.id in session. Session:", JSON.stringify(session, null, 2));
      
      // Try to get user ID from email as fallback
      if (session.user.email) {
        try {
          const { prisma } = await import("@/lib/prisma");
          const dbUser = await prisma.user.findUnique({
            where: { email: session.user.email },
            select: { id: true }
          });
          
          if (dbUser) {
            console.log("[PlacementTest] Found user ID from email:", dbUser.id);
            // Use dbUser.id instead
            const result = await placementTestController.submitTest(
              dbUser.id,
              body
            );
            return NextResponse.json(result.data, { status: result.status || 200 });
          }
        } catch (error) {
          console.error("[PlacementTest] Error fetching user by email:", error);
        }
      }
      
      return NextResponse.json({ 
        error: "Unauthorized: No user ID",
        message: "Please log in again to continue"
      }, { status: 401 });
    }

    console.log("[PlacementTest] User ID:", session.user.id);
    console.log("[PlacementTest] Request body:", { score: body.score, totalQuestions: body.totalQuestions, answersCount: body.answers?.length });
    
    const result = await placementTestController.submitTest(
      session.user.id,
      body
    );

    console.log("[PlacementTest] Submit successful, status:", result.status);
    return NextResponse.json(result.data, { status: result.status || 200 });
  } catch (error) {
    console.error("Placement test submit error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const errorDetails = error instanceof Error ? error.stack : String(error);
    console.error("Error details:", errorDetails);
    return NextResponse.json(
      { 
        error: "Failed to submit test",
        message: errorMessage,
        details: process.env.NODE_ENV === "development" ? errorDetails : undefined
      },
      { status: 500 }
    );
  }
}
