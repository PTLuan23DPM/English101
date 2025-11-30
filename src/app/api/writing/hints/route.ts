import { NextRequest, NextResponse } from "next/server";
import { callGemini, parseGeminiJSON, isGeminiConfigured } from "@/lib/gemini";
import { SYSTEM_INSTRUCTIONS, buildHintsPrompt } from "@/lib/prompts/writing";

export async function POST(req: NextRequest) {
    try {
        if (!isGeminiConfigured()) {
            return NextResponse.json(
                { error: "Gemini API is not configured" },
                { status: 503 }
            );
        }

        const { text, level } = await req.json();

        if (!text || !level) {
            return NextResponse.json(
                { error: "Missing required fields: text, level" },
                { status: 400 }
            );
        }

        const prompt = buildHintsPrompt(text, level);
        const response = await callGemini(prompt, SYSTEM_INSTRUCTIONS.HINTS, {
            temperature: 0.6,
            maxTokens: 2000,
        });

        console.log("[Hints API] Raw Gemini response length:", response.length);

        const result = parseGeminiJSON<{
            grammarHints?: Array<{
                location?: string;
                issue?: string;
                hint?: string;
                explanation?: string;
            }>;
            coherenceHints?: Array<{
                location?: string;
                issue?: string;
                suggestion?: string;
                example?: string;
            }>;
        }>(response);

        // Validate and provide defaults if missing
        const validatedResult = {
            grammarHints: Array.isArray(result.grammarHints)
                ? result.grammarHints.map((hint) => ({
                    location: hint.location || "Unknown location",
                    issue: hint.issue || "Grammar issue",
                    hint: hint.hint || "Check grammar",
                    explanation: hint.explanation || "Explanation not available",
                }))
                : [],
            coherenceHints: Array.isArray(result.coherenceHints)
                ? result.coherenceHints.map((hint) => ({
                    location: hint.location || "Unknown location",
                    issue: hint.issue || "Coherence issue",
                    suggestion: hint.suggestion || "Improve coherence",
                    example: hint.example || "Example not available",
                }))
                : [],
        };

        return NextResponse.json(validatedResult);
    } catch (error) {
        console.error("Hints error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to generate hints" },
            { status: 500 }
        );
    }
}

