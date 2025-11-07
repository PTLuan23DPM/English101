import { NextRequest, NextResponse } from "next/server";
import { callGemini, parseGeminiJSON, isGeminiConfigured } from "@/lib/gemini";
import { SYSTEM_INSTRUCTIONS, buildBrainstormPrompt } from "@/lib/prompts/writing";

export async function POST(req: NextRequest) {
    try {
        if (!isGeminiConfigured()) {
            return NextResponse.json(
                { error: "Gemini API is not configured" },
                { status: 503 }
            );
        }

        const { level, type, topic } = await req.json();

        if (!level || !type || !topic) {
            return NextResponse.json(
                { error: "Missing required fields: level, type, topic" },
                { status: 400 }
            );
        }

        const prompt = buildBrainstormPrompt(level, type, topic);
        const response = await callGemini(prompt, SYSTEM_INSTRUCTIONS.BRAINSTORM, {
            temperature: 0.8,
            maxTokens: 2000, // Increased to prevent truncation
        });

        console.log("[Brainstorm API] Raw Gemini response length:", response.length);

        const result = parseGeminiJSON<{
            ideas?: Array<{ point?: string; explanation?: string }>;
            examples?: Array<{ idea?: string; example?: string }>;
            counterpoints?: string[];
        }>(response);

        // Validate and provide defaults if missing
        const validatedResult = {
            ideas: Array.isArray(result.ideas) && result.ideas.length > 0
                ? result.ideas.map((idea, idx) => ({
                    point: idea.point || `Idea ${idx + 1}`,
                    explanation: idea.explanation || "Explanation not available",
                }))
                : [{ point: `Main idea about ${topic}`, explanation: "Think about different aspects of this topic" }],
            examples: Array.isArray(result.examples) ? result.examples.map((ex, idx) => ({
                idea: ex.idea || `Idea ${idx + 1}`,
                example: ex.example || "Example not available",
            })) : [],
            counterpoints: Array.isArray(result.counterpoints) ? result.counterpoints : [],
        };

        return NextResponse.json(validatedResult);
    } catch (error) {
        console.error("Brainstorm error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to brainstorm ideas" },
            { status: 500 }
        );
    }
}

