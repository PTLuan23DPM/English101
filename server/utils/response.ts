/**
 * Response Utilities
 * Helper functions for API responses with consistent format
 */

import { NextResponse } from "next/server";

export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
    details?: unknown;
    code?: string;
}

/**
 * Create a successful API response
 */
export function createSuccessResponse<T>(
    data: T,
    status: number = 200
): NextResponse<ApiResponse<T>> {
    return NextResponse.json(
        {
            success: true,
            data,
        },
        { status }
    );
}

/**
 * Create an error API response
 */
export function createErrorResponse(
    message: string,
    status: number = 500,
    code?: string,
    details?: unknown
): NextResponse<ApiResponse> {
    return NextResponse.json(
        {
            success: false,
            error: message,
            code,
            details,
        },
        { status }
    );
}

/**
 * Create a paginated response
 */
export function createPaginatedResponse<T>(
    data: T[],
    page: number,
    limit: number,
    total: number,
    status: number = 200
): NextResponse<ApiResponse<{ items: T[]; pagination: { page: number; limit: number; total: number; totalPages: number } }>> {
    return NextResponse.json(
        {
            success: true,
            data: {
                items: data,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit),
                },
            },
        },
        { status }
    );
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use createSuccessResponse or createErrorResponse instead
 */
export function createResponse(data: any, status: number = 200) {
    return NextResponse.json(data, { status });
}

