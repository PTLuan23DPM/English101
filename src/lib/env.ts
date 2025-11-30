import { z } from "zod";

const envSchema = z.object({
    // Database
    DATABASE_URL: z.string().url(),

    // NextAuth
    NEXTAUTH_SECRET: z.string().min(32),
    NEXTAUTH_URL: z.string().url().optional(),

    // Google OAuth
    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),

    // Email (Resend)
    RESEND_API_KEY: z.string().optional(),
    FROM_EMAIL: z.string().email().optional(),
    FROM_NAME: z.string().optional(),

    // Python Service
    PYTHON_SERVICE_URL: z.string().url().optional(),
    NEXT_PUBLIC_PYTHON_SERVICE_URL: z.string().url().optional(),

    // Node Environment
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

export type Env = z.infer<typeof envSchema>;

let env: Env | undefined;

export function validateEnv(): Env {
    if (env) {
        return env;
    }

    try {
        env = envSchema.parse({
            DATABASE_URL: process.env.DATABASE_URL,
            NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
            NEXTAUTH_URL: process.env.NEXTAUTH_URL,
            GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
            GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
            RESEND_API_KEY: process.env.RESEND_API_KEY,
            FROM_EMAIL: process.env.FROM_EMAIL,
            FROM_NAME: process.env.FROM_NAME,
            PYTHON_SERVICE_URL: process.env.PYTHON_SERVICE_URL,
            NEXT_PUBLIC_PYTHON_SERVICE_URL: process.env.NEXT_PUBLIC_PYTHON_SERVICE_URL,
            NODE_ENV: process.env.NODE_ENV || "development",
        });
        return env;
    } catch (error) {
        if (error instanceof z.ZodError) {
            const missing = error.errors
                .filter((e) => e.code === "invalid_type" && e.received === "undefined")
                .map((e) => e.path.join("."));

            if (missing.length > 0) {
                console.error("❌ Missing required environment variables:");
                missing.forEach((key) => console.error(`   - ${key}`));
            }

            const invalid = error.errors
                .filter((e) => e.code !== "invalid_type" || e.received !== "undefined")
                .map((e) => `${e.path.join(".")}: ${e.message}`);

            if (invalid.length > 0) {
                console.error("❌ Invalid environment variables:");
                invalid.forEach((msg) => console.error(`   - ${msg}`));
            }
        }

        throw new Error("Environment validation failed. Please check your .env file.");
    }
}

export function getEnv(): Env {
    if (!env) {
        return validateEnv();
    }
    return env;
}

