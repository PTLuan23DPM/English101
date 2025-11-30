import { NextRequest, NextResponse } from "next/server";
import { authController } from "@/server/controllers/authController";
import { createErrorResponse } from "@/server/utils/response";
import { handleError } from "@/lib/error-handler";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, password } = body;

    const result = await authController.register({ name, email, password });

    return NextResponse.json(result, { status: 201 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    if (errorMessage === "Email and password are required") {
      return createErrorResponse(errorMessage, 400);
    }

    if (errorMessage === "Password must be at least 8 characters") {
      return createErrorResponse(errorMessage, 400);
    }

    if (errorMessage === "User with this email already exists") {
      return createErrorResponse(errorMessage, 409);
    }

    return handleError(error);
  }
}

