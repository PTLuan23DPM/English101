import { NextRequest, NextResponse } from "next/server";
import { callGemini, parseGeminiJSON, isGeminiConfigured } from "@/lib/gemini";
import { SYSTEM_INSTRUCTIONS, buildSummarizePrompt } from "@/lib/prompts/writing";

export async function POST(req: NextRequest) {
    try {
        if (!isGeminiConfigured()) {
            return NextResponse.json(
                { error: "Gemini API is not configured" },
                { status: 503 }
            );
        }

        const { text, topic } = await req.json();

        if (!text) {
            return NextResponse.json(
                { error: "Missing required field: text" },
                { status: 400 }
            );
        }

        const prompt = buildSummarizePrompt(text, topic || "General topic");
        const response = await callGemini(prompt, SYSTEM_INSTRUCTIONS.SUMMARIZE, {
            temperature: 0.5,
            maxTokens: 2000, // Increased to prevent truncation
        });

        console.log("[Summarize API] Raw Gemini response length:", response.length);
        console.log("[Summarize API] Raw Gemini response (first 500 chars):", response.substring(0, 500));

        const result = parseGeminiJSON<{
            summary?: string;
            mainPoints?: string[];
            onTopicScore?: number;
            onTopicExplanation?: string;
            feedback?: string;
        }>(response);

        console.log("[Summarize API] Parsed result:", JSON.stringify(result, null, 2));

        // Validate and provide defaults if missing
        const validatedResult = {
            summary: result.summary || "Unable to generate summary.",
            mainPoints: Array.isArray(result.mainPoints) ? result.mainPoints : [],
            onTopicScore: typeof result.onTopicScore === "number" ? result.onTopicScore : 5,
            onTopicExplanation: result.onTopicExplanation || "Unable to assess on-topic score.",
            feedback: result.feedback || "Unable to generate feedback.",
        };

        return NextResponse.json(validatedResult);
    } catch (error) {
        console.error("Summarize error:", error);
        const errorMessage = error instanceof Error ? error.message : "Failed to summarize text";
        
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

