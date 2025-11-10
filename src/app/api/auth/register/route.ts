import { NextRequest, NextResponse } from "next/server";
import { authController } from "@/server/controllers/authController";
import { createResponse, createErrorResponse } from "@/server/utils/response";
import { handleError } from "@/lib/error-handler";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, password } = body;

    const result = await authController.register({ name, email, password });

    return createResponse(result, 201);
  } catch (error: any) {
    if (error.message === "Email and password are required") {
      return createErrorResponse(error.message, 400);
    }

    if (error.message === "Password must be at least 8 characters") {
      return createErrorResponse(error.message, 400);
    }

    if (error.message === "User with this email already exists") {
      return createErrorResponse(error.message, 409);
    }

    return handleError(error);
  }
}

