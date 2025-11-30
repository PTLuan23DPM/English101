/**
 * Application Constants
 * Centralized constants for the application
 */

// API Routes
export const API_ROUTES = {
    AUTH: {
        LOGIN: '/api/auth/login',
        REGISTER: '/api/auth/register',
        LOGOUT: '/api/auth/logout',
        FORGOT_PASSWORD: '/api/auth/forgot-password',
        RESET_PASSWORD: '/api/auth/reset-password',
        VERIFY_OTP: '/api/auth/verify-otp',
    },
    USER: {
        PROFILE: '/api/user/profile',
        STATS: '/api/user/stats',
        UPDATE: '/api/user/update',
        UPLOAD_IMAGE: '/api/user/upload-image',
    },
    ACTIVITIES: {
        WRITING: '/api/writing/activities',
        READING: '/api/reading/activities',
        LISTENING: '/api/listening/activities',
        SPEAKING: '/api/speaking/activities',
    },
    PROGRESS: {
        STATS: '/api/progress/stats',
        ROUTE: '/api/progress',
    },
    GOALS: {
        LIST: '/api/goals/list',
        CREATE: '/api/goals/create',
        UPDATE: '/api/goals/update',
        DELETE: '/api/goals/delete',
    },
    GETTING_STARTED: '/api/getting-started',
    PLACEMENT_TEST: {
        QUESTIONS: '/api/placement-test/questions',
        SUBMIT: '/api/placement-test/submit',
    },
} as const;

// CEFR Levels
export const CEFR_LEVELS = {
    A1: 'A1',
    A2: 'A2',
    B1: 'B1',
    B2: 'B2',
    C1: 'C1',
    C2: 'C2',
} as const;

export type CEFRLevel = typeof CEFR_LEVELS[keyof typeof CEFR_LEVELS];

// Activity Types
export const ACTIVITY_TYPES = {
    WRITING: 'writing',
    READING: 'reading',
    LISTENING: 'listening',
    SPEAKING: 'speaking',
    GRAMMAR: 'grammar',
} as const;

export type ActivityType = typeof ACTIVITY_TYPES[keyof typeof ACTIVITY_TYPES];

// Score Ranges
export const SCORE_RANGES = {
    MIN: 0,
    MAX: 100,
    PASSING: 60,
    EXCELLENT: 90,
} as const;

// Pagination
export const PAGINATION = {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 10,
    MAX_LIMIT: 100,
} as const;

// File Upload
export const FILE_UPLOAD = {
    MAX_SIZE: 5 * 1024 * 1024, // 5MB
    ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
    ALLOWED_AUDIO_TYPES: ['audio/mpeg', 'audio/wav', 'audio/webm'],
} as const;

// Time Constants
export const TIME = {
    SECOND: 1000,
    MINUTE: 60 * 1000,
    HOUR: 60 * 60 * 1000,
    DAY: 24 * 60 * 60 * 1000,
} as const;

// Python Service URL
export const getPythonServiceUrl = (): string => {
    if (typeof window !== 'undefined') {
        // Client-side: use NEXT_PUBLIC_ prefix
        return process.env.NEXT_PUBLIC_PYTHON_SERVICE_URL || "http://localhost:8080";
    }
    // Server-side: use regular env var
    return process.env.PYTHON_SERVICE_URL || "http://localhost:8080";
};

// Error Messages
export const ERROR_MESSAGES = {
    UNAUTHORIZED: 'Unauthorized access',
    FORBIDDEN: 'Access forbidden',
    NOT_FOUND: 'Resource not found',
    VALIDATION_ERROR: 'Validation error',
    DATABASE_ERROR: 'Database error',
    INTERNAL_ERROR: 'Internal server error',
    INVALID_CREDENTIALS: 'Invalid credentials',
    USER_NOT_FOUND: 'User not found',
    ACTIVITY_NOT_FOUND: 'Activity not found',
} as const;

// Success Messages
export const SUCCESS_MESSAGES = {
    CREATED: 'Resource created successfully',
    UPDATED: 'Resource updated successfully',
    DELETED: 'Resource deleted successfully',
    LOGIN_SUCCESS: 'Login successful',
    LOGOUT_SUCCESS: 'Logout successful',
    REGISTER_SUCCESS: 'Registration successful',
} as const;

