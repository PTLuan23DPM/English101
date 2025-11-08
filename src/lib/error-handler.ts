import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";

export interface ApiError {
    message: string;
    code?: string;
    statusCode: number;
    details?: unknown;
}

export class AppError extends Error {
    statusCode: number;
    code?: string;
    details?: unknown;

    constructor(message: string, statusCode: number = 500, code?: string, details?: unknown) {
        super(message);
        this.name = "AppError";
        this.statusCode = statusCode;
        this.code = code;
        this.details = details;
        Error.captureStackTrace(this, this.constructor);
    }
}

export function handleError(error: unknown): NextResponse {
    console.error("API Error:", error);

    // Zod validation errors
    if (error instanceof ZodError) {
        return NextResponse.json(
            {
                error: "Validation error",
                details: error.errors.map((e) => ({
                    path: e.path.join("."),
                    message: e.message,
                })),
            },
            { status: 400 }
        );
    }

    // Prisma errors
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
        switch (error.code) {
            case "P2002":
                return NextResponse.json(
                    { error: "A record with this value already exists" },
                    { status: 409 }
                );
            case "P2025":
                return NextResponse.json(
                    { error: "Record not found" },
                    { status: 404 }
                );
            case "P2003":
                return NextResponse.json(
                    { error: "Invalid reference" },
                    { status: 400 }
                );
            default:
                return NextResponse.json(
                    { error: "Database error", code: error.code },
                    { status: 500 }
                );
        }
    }

    // Custom AppError
    if (error instanceof AppError) {
        return NextResponse.json(
            {
                error: error.message,
                code: error.code,
                details: error.details,
            },
            { status: error.statusCode }
        );
    }

    // Generic errors
    if (error instanceof Error) {
        return NextResponse.json(
            {
                error: process.env.NODE_ENV === "production"
                    ? "Internal server error"
                    : error.message,
            },
            { status: 500 }
        );
    }

    // Unknown errors
    return NextResponse.json(
        { error: "An unexpected error occurred" },
        { status: 500 }
    );
}

export function asyncHandler(
    handler: (req: Request) => Promise<NextResponse>
) {
    return async (req: Request) => {
        try {
            return await handler(req);
        } catch (error) {
            return handleError(error);
        }
    };
}

