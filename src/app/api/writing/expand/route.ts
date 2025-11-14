import { NextRequest, NextResponse } from "next/server";
import { callGemini, parseGeminiJSON, isGeminiConfigured } from "@/lib/gemini";
import { SYSTEM_INSTRUCTIONS, buildExpandPrompt } from "@/lib/prompts/writing";

export async function POST(req: NextRequest) {
    try {
        if (!isGeminiConfigured()) {
            return NextResponse.json(
                { error: "Gemini API is not configured" },
                { status: 503 }
            );
        }

        const { sentence, mode } = await req.json();

        if (!sentence || !mode) {
            return NextResponse.json(
                { error: "Missing required fields: sentence, mode" },
                { status: 400 }
            );
        }

        if (!["reason", "example", "contrast"].includes(mode)) {
            return NextResponse.json(
                { error: "Mode must be one of: reason, example, contrast" },
                { status: 400 }
            );
        }

        const prompt = buildExpandPrompt(sentence, mode as "reason" | "example" | "contrast");
        const response = await callGemini(prompt, SYSTEM_INSTRUCTIONS.EXPANDER, {
            temperature: 0.8,
            maxTokens: 2000, // Increased to prevent truncation
        });

        console.log("[Expand API] Raw Gemini response length:", response.length);

        const result = parseGeminiJSON<{
            expansions?: Array<{ text?: string; explanation?: string }>;
        }>(response);

        // Validate and provide defaults if missing
        if (!result.expansions || !Array.isArray(result.expansions) || result.expansions.length === 0) {
            console.warn("[Expand API] Invalid or empty expansions, providing default");
            return NextResponse.json({
                expansions: [
                    {
                        text: sentence,
                        explanation: "Unable to generate expansion. Please try again.",
                    },
                ],
            });
        }

        // Ensure all expansions have required fields
        const validatedExpansions = result.expansions.map((exp, idx) => ({
            text: exp.text || sentence,
            explanation: exp.explanation || `Expansion ${idx + 1}`,
        }));

        return NextResponse.json({ expansions: validatedExpansions });
    } catch (error) {
        console.error("Expand error:", error);
        const errorMessage = error instanceof Error ? error.message : "Failed to expand sentence";
        const errorAny = error as any;

        // Handle 503 errors from Gemini
        if (errorAny.code === 503 || errorAny.status === "UNAVAILABLE" || errorAny.error?.code === 503) {
            return NextResponse.json(
                {
                    error: {
                        code: 503,
                        message: errorAny.error?.message || "The model is overloaded. Please try again later.",
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

