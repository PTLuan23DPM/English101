"use client";

import dynamic from "next/dynamic";
import "swagger-ui-react/swagger-ui.css";

const SwaggerUI = dynamic(() => import("swagger-ui-react"), { ssr: false });

const apiSpec = {
  openapi: "3.0.0",
  info: {
    title: "English101 API Documentation",
    version: "1.0.0",
    description: "Complete API documentation for the English101 learning platform",
    contact: {
      name: "English101 Team",
      email: "support@english101.com",
    },
  },
  servers: [
    {
      url: "http://localhost:3000",
      description: "Development server",
    },
  ],
  tags: [
    { name: "Authentication", description: "User authentication endpoints" },
    { name: "Dashboard", description: "Dashboard and user statistics" },
  ],
  paths: {
    "/api/auth/register": {
      post: {
        tags: ["Authentication"],
        summary: "Register a new user",
        description: "Create a new user account with email and password",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password", "name"],
                properties: {
                  email: { type: "string", format: "email", example: "user@example.com" },
                  password: { type: "string", format: "password", minLength: 6, example: "password123" },
                  name: { type: "string", example: "John Doe" },
                },
              },
            },
          },
        },
        responses: {
          "201": {
            description: "User successfully registered",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string", example: "User registered successfully" },
                    user: {
                      type: "object",
                      properties: {
                        id: { type: "string" },
                        email: { type: "string" },
                        name: { type: "string" },
                      },
                    },
                  },
                },
              },
            },
          },
          "400": {
            description: "Bad request - validation error",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    error: { type: "string", example: "Email and password are required" },
                  },
                },
              },
            },
          },
          "409": {
            description: "Conflict - user already exists",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    error: { type: "string", example: "User already exists" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/auth/forgot-password": {
      post: {
        tags: ["Authentication"],
        summary: "Request password reset OTP",
        description: "Send an OTP code to user's email for password reset",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email"],
                properties: {
                  email: { type: "string", format: "email", example: "user@example.com" },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "OTP sent successfully",
          },
          "404": {
            description: "User not found",
          },
        },
      },
    },
    "/api/auth/verify-otp": {
      post: {
        tags: ["Authentication"],
        summary: "Verify OTP code",
        description: "Verify the OTP code sent to user's email",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "otp"],
                properties: {
                  email: { type: "string", format: "email" },
                  otp: { type: "string", example: "123456" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "OTP verified successfully" },
          "400": { description: "Invalid or expired OTP" },
        },
      },
    },
    "/api/auth/reset-password": {
      post: {
        tags: ["Authentication"],
        summary: "Reset password",
        description: "Reset user password with verified OTP",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "otp", "newPassword"],
                properties: {
                  email: { type: "string", format: "email" },
                  otp: { type: "string" },
                  newPassword: { type: "string", format: "password", minLength: 6 },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Password reset successfully" },
          "400": { description: "Invalid request" },
        },
      },
    },
    "/api/dashboard/stats": {
      get: {
        tags: ["Dashboard"],
        summary: "Get user dashboard statistics",
        description: "Retrieve comprehensive user statistics including progress, streaks, and skill breakdown",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "Dashboard statistics retrieved successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    user: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        email: { type: "string" },
                        image: { type: "string", nullable: true },
                      },
                    },
                    stats: {
                      type: "object",
                      properties: {
                        streak: { type: "number", example: 7 },
                        completedUnits: { type: "number", example: 12 },
                        inProgressUnits: { type: "number", example: 3 },
                        totalAttempts: { type: "number", example: 45 },
                        avgScore: { type: "number", example: 85 },
                      },
                    },
                    skillsBreakdown: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          skill: { type: "string" },
                          completed: { type: "number" },
                          avgScore: { type: "number" },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          "401": { description: "Unauthorized - authentication required" },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },
  },
};

export default function ApiDocsPage() {
  return (
    <div style={{ minHeight: "100vh", background: "#fff" }}>
      <SwaggerUI spec={apiSpec} />
    </div>
  );
}

