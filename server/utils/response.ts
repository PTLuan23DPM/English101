/**
 * Response Utilities
 * Helper functions for API responses
 */

import { NextResponse } from "next/server";

export function createResponse(data: any, status: number = 200) {
    return NextResponse.json(data, { status });
}

export function createErrorResponse(message: string, status: number = 500) {
    return NextResponse.json({ error: message }, { status });
}

export function createSuccessResponse(data: any, status: number = 200) {
    return NextResponse.json({ success: true, ...data }, { status });
}

