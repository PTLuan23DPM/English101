import { NextRequest, NextResponse } from "next/server";
import { callGemini, parseGeminiJSON, isGeminiConfigured } from "@/lib/gemini";
import { SYSTEM_INSTRUCTIONS, buildNextTaskPrompt } from "@/lib/prompts/writing";

export async function POST(req: NextRequest) {
    try {
        const { userId, level, lastScore, errorProfile, scoringFeedback } = await req.json();

        if (!userId || !level || lastScore === undefined || !errorProfile) {
            return NextResponse.json(
                { error: "Missing required fields: userId, level, lastScore, errorProfile" },
                { status: 400 }
            );
        }

        // Try Gemini API if available
        if (isGeminiConfigured()) {
            try {
                const prompt = buildNextTaskPrompt(userId, level, lastScore, errorProfile, scoringFeedback);
                const response = await callGemini(prompt, SYSTEM_INSTRUCTIONS.NEXT_TASK, {
                    temperature: 0.6,
                    maxTokens: 4000, // Increased significantly to accommodate detailed feedback
                });

                console.log("[Next Task API] Raw Gemini response:", response);

                const result = parseGeminiJSON<{
                    recommendedTask?: {
                        type?: string;
                        level?: string;
                        focusAreas?: string[];
                        reasoning?: string;
                    };
                    specificSuggestions?: string[];
                    feedback?: {
                        strengths?: string[];
                        weaknesses?: string[];
                        overallComment?: string;
                    };
                }>(response);

                console.log("[Next Task API] Parsed result:", JSON.stringify(result, null, 2));

                // Validate and provide defaults if missing
                if (!result.recommendedTask) {
                    console.error("[Next Task API] Missing recommendedTask in response:", result);

                    // Provide default recommendation based on weakest area
                    const weakestArea = Object.entries(errorProfile)
                        .filter(([, score]) => typeof score === 'number')
                        .sort((a, b) => (a[1] as number) - (b[1] as number))[0];

                    const defaultRecommendation = {
                        recommendedTask: {
                            type: weakestArea ? `Focus on ${weakestArea[0]}` : "General Writing Practice",
                            level: level,
                            focusAreas: weakestArea ? [weakestArea[0]] : ["General improvement"],
                            reasoning: `Based on your score of ${lastScore}/10, this task will help you improve your ${weakestArea ? weakestArea[0] : "writing"} skills.`,
                        },
                        specificSuggestions: [
                            "Practice writing regularly",
                            "Review your previous mistakes",
                            "Focus on the areas where you scored lowest",
                        ],
                        feedback: {
                            strengths: ["You completed the writing task", "Keep practicing to improve"],
                            weaknesses: ["Focus on the areas where you scored lowest", "Continue working on your writing skills"],
                            overallComment: `Based on your score of ${lastScore}/10, keep practicing to improve your writing skills. Focus on the areas where you need the most improvement.`,
                        },
                    };

                    console.warn("[Next Task API] Using default recommendation:", defaultRecommendation);
                    return NextResponse.json(defaultRecommendation);
                }

                // Ensure all required fields exist
                const validatedResult = {
                    recommendedTask: {
                        type: result.recommendedTask.type || "Writing Task",
                        level: result.recommendedTask.level || level,
                        focusAreas: Array.isArray(result.recommendedTask.focusAreas)
                            ? result.recommendedTask.focusAreas
                            : [],
                        reasoning: result.recommendedTask.reasoning || "This task will help you improve your writing skills.",
                    },
                    specificSuggestions: Array.isArray(result.specificSuggestions)
                        ? result.specificSuggestions
                        : [],
                    feedback: result.feedback ? {
                        strengths: Array.isArray(result.feedback.strengths) && result.feedback.strengths.length > 0
                            ? result.feedback.strengths
                            : ["You completed the writing task", "Keep practicing to improve"],
                        weaknesses: Array.isArray(result.feedback.weaknesses) && result.feedback.weaknesses.length > 0
                            ? result.feedback.weaknesses
                            : ["Focus on the areas where you scored lowest", "Continue working on your writing skills"],
                        overallComment: result.feedback.overallComment || `Based on your score of ${lastScore}/10, keep practicing to improve your writing skills.`,
                    } : {
                        strengths: ["You completed the writing task", "Keep practicing to improve"],
                        weaknesses: ["Focus on the areas where you scored lowest", "Continue working on your writing skills"],
                        overallComment: `Based on your score of ${lastScore}/10, keep practicing to improve your writing skills.`,
                    },
                };

                return NextResponse.json(validatedResult);
            } catch (geminiError) {
                console.error("[Next Task API] Gemini API failed, using fallback:", geminiError);
                // Fall through to fallback recommendation
            }
        }

        // Fallback: Provide default recommendation when Gemini is unavailable
        console.warn("[Next Task API] Using fallback recommendation (Gemini unavailable)");

        const weakestArea = Object.entries(errorProfile)
            .filter(([, score]) => typeof score === 'number')
            .sort((a, b) => (a[1] as number) - (b[1] as number))[0];

        const fallbackRecommendation = {
            recommendedTask: {
                type: weakestArea ? `Focus on ${weakestArea[0]}` : "General Writing Practice",
                level: level,
                focusAreas: weakestArea ? [weakestArea[0]] : ["General improvement"],
                reasoning: `Based on your score of ${lastScore}/10, this task will help you improve your ${weakestArea ? weakestArea[0] : "writing"} skills.`,
            },
            specificSuggestions: [
                "Practice writing regularly",
                "Review your previous mistakes",
                "Focus on the areas where you scored lowest",
            ],
            feedback: {
                strengths: ["You completed the writing task", "Keep practicing to improve"],
                weaknesses: ["Focus on the areas where you scored lowest", "Continue working on your writing skills"],
                overallComment: `Based on your score of ${lastScore}/10, keep practicing to improve your writing skills. Focus on the areas where you need the most improvement.`,
            },
        };

        return NextResponse.json(fallbackRecommendation);
    } catch (error) {
        console.error("Next task error:", error);
        const errorMessage = error instanceof Error ? error.message : "Failed to recommend next task";
        const errorMessageLower = errorMessage.toLowerCase();

        // Determine appropriate status code based on error type
        let statusCode = 500;
        if (errorMessageLower.includes("unavailable") ||
            errorMessageLower.includes("overloaded") ||
            errorMessageLower.includes("service unavailable") ||
            errorMessageLower.includes("bad gateway") ||
            errorMessageLower.includes("gateway timeout")) {
            statusCode = 503;
        } else if (errorMessageLower.includes("quota") ||
            errorMessageLower.includes("rate limit") ||
            errorMessageLower.includes("too many requests")) {
            statusCode = 429;
        } else if (errorMessageLower.includes("not configured") ||
            errorMessageLower.includes("api key")) {
            statusCode = 503;
        }

        return NextResponse.json(
            {
                error: {
                    message: errorMessage,
                    code: statusCode === 503 ? "SERVICE_UNAVAILABLE" :
                        statusCode === 429 ? "RATE_LIMIT" : "INTERNAL_ERROR"
                }
            },
            { status: statusCode }
        );
    }
}

