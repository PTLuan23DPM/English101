import { NextRequest, NextResponse } from "next/server";
import { callGemini, parseGeminiJSON, isGeminiConfigured } from "@/lib/gemini";
import { SYSTEM_INSTRUCTIONS, buildNextTaskPrompt } from "@/lib/prompts/writing";

export async function POST(req: NextRequest) {
    try {
        if (!isGeminiConfigured()) {
            return NextResponse.json(
                { error: "Gemini API is not configured" },
                { status: 503 }
            );
        }

        const { userId, level, lastScore, errorProfile } = await req.json();

        if (!userId || !level || lastScore === undefined || !errorProfile) {
            return NextResponse.json(
                { error: "Missing required fields: userId, level, lastScore, errorProfile" },
                { status: 400 }
            );
        }

        const prompt = buildNextTaskPrompt(userId, level, lastScore, errorProfile);
        const response = await callGemini(prompt, SYSTEM_INSTRUCTIONS.NEXT_TASK, {
            temperature: 0.6,
            maxTokens: 1500, // Increased to ensure complete response
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
        }>(response);

        console.log("[Next Task API] Parsed result:", JSON.stringify(result, null, 2));

        // Validate and provide defaults if missing
        if (!result.recommendedTask) {
            console.error("[Next Task API] Missing recommendedTask in response:", result);

            // Provide default recommendation based on weakest area
            const weakestArea = Object.entries(errorProfile)
                .filter(([_, score]) => score !== undefined)
                .sort((a, b) => (a[1] || 0) - (b[1] || 0))[0];

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
        };

        return NextResponse.json(validatedResult);
    } catch (error) {
        console.error("Next task error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to recommend next task" },
            { status: 500 }
        );
    }
}

