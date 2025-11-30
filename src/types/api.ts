/**
 * Shared API Types
 * Common types and interfaces for API requests and responses
 */

export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
    details?: unknown;
    code?: string;
}

export interface PaginatedResponse<T> {
    items: T[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

export interface ApiError {
    success: false;
    error: string;
    code?: string;
    details?: unknown;
}

export interface ApiSuccess<T> {
    success: true;
    data: T;
}

export type ApiResult<T> = ApiSuccess<T> | ApiError;

// Common query parameters
export interface PaginationParams {
    page?: number;
    limit?: number;
}

export interface SortParams {
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}

export interface FilterParams {
    search?: string;
    [key: string]: unknown;
}

