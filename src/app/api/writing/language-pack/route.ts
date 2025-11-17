import { NextRequest, NextResponse } from "next/server";
import { callGemini, parseGeminiJSON, isGeminiConfigured } from "@/lib/gemini";
import { SYSTEM_INSTRUCTIONS, buildLanguagePackPrompt } from "@/lib/prompts/writing";

export async function GET(req: NextRequest) {
    try {
        if (!isGeminiConfigured()) {
            return NextResponse.json(
                { error: "Gemini API is not configured" },
                { status: 503 }
            );
        }

        const { searchParams } = new URL(req.url);
        const level = searchParams.get("level");
        const type = searchParams.get("type");

        if (!level || !type) {
            return NextResponse.json(
                { error: "Missing required parameters: level, type" },
                { status: 400 }
            );
        }

        const prompt = buildLanguagePackPrompt(level, type);
        const response = await callGemini(prompt, SYSTEM_INSTRUCTIONS.LANGUAGE_PACK, {
            temperature: 0.6,
            maxTokens: 2000, // Increased to prevent truncation
        });

        console.log("[Language Pack API] Raw Gemini response length:", response.length);

        const result = parseGeminiJSON<{
            phrases?: string[];
            discourseMarkers?: {
                contrast?: string[];
                addition?: string[];
                cause?: string[];
                example?: string[];
            };
            collocations?: string[];
            sentenceStarters?: string[];
        }>(response);

        // Validate and provide defaults if missing
        const validatedResult = {
            phrases: Array.isArray(result.phrases) ? result.phrases : [],
            discourseMarkers: {
                contrast: Array.isArray(result.discourseMarkers?.contrast) ? result.discourseMarkers.contrast : ["however", "on the other hand"],
                addition: Array.isArray(result.discourseMarkers?.addition) ? result.discourseMarkers.addition : ["moreover", "furthermore"],
                cause: Array.isArray(result.discourseMarkers?.cause) ? result.discourseMarkers.cause : ["therefore", "as a result"],
                example: Array.isArray(result.discourseMarkers?.example) ? result.discourseMarkers.example : ["for instance", "such as"],
            },
            collocations: Array.isArray(result.collocations) ? result.collocations : [],
            sentenceStarters: Array.isArray(result.sentenceStarters) ? result.sentenceStarters : ["To begin with,", "It is widely believed that,"],
        };

        return NextResponse.json(validatedResult);
    } catch (error) {
        console.error("Language pack error:", error);
        const errorMessage = error instanceof Error ? error.message : "Failed to generate language pack";
        
        // Handle 503 errors from Gemini
        const geminiError = error as { code?: number; status?: string; error?: { code?: number; message?: string } };
        if (geminiError.code === 503 || geminiError.status === "UNAVAILABLE" || geminiError.error?.code === 503) {
            return NextResponse.json(
                {
                    error: {
                        code: 503,
                        message: geminiError.error?.message || "The model is overloaded. Please try again later.",
                        status: "UNAVAILABLE",
                    },
                },
                { status: 503 }
            );
        }

        return NextResponse.json(
            { error: errorMessage },
            { status: 500 }
        );
    }
}

