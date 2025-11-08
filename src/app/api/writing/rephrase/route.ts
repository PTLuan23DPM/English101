import { NextRequest, NextResponse } from "next/server";
import { callGemini, parseGeminiJSON, isGeminiConfigured } from "@/lib/gemini";
import { SYSTEM_INSTRUCTIONS, buildRephrasePrompt } from "@/lib/prompts/writing";

export async function POST(req: NextRequest) {
    try {
        if (!isGeminiConfigured()) {
            return NextResponse.json(
                { error: "Gemini API is not configured" },
                { status: 503 }
            );
        }

        const { text, style, targetLevel } = await req.json();

        if (!text || !style || !targetLevel) {
            return NextResponse.json(
                { error: "Missing required fields: text, style, targetLevel" },
                { status: 400 }
            );
        }

        if (!["simple", "academic", "formal"].includes(style)) {
            return NextResponse.json(
                { error: "Style must be one of: simple, academic, formal" },
                { status: 400 }
            );
        }

        const prompt = buildRephrasePrompt(text, style as "simple" | "academic" | "formal", targetLevel);
        const response = await callGemini(prompt, SYSTEM_INSTRUCTIONS.REPHRASE, {
            temperature: 0.7,
            maxTokens: 2000, // Increased to prevent truncation
        });

        console.log("[Rephrase API] Raw Gemini response length:", response.length);
        console.log("[Rephrase API] Raw Gemini response (first 500 chars):", response.substring(0, 500));

        const result = parseGeminiJSON<{
            options?: Array<{ text?: string; notes?: string }>;
        }>(response);

        console.log("[Rephrase API] Parsed result:", JSON.stringify(result, null, 2));

        // Validate and provide defaults if missing
        if (!result.options || !Array.isArray(result.options) || result.options.length === 0) {
            console.warn("[Rephrase API] Invalid or empty options, providing default");
            return NextResponse.json({
                options: [
                    {
                        text: text, // Return original text as fallback
                        notes: "Unable to generate rephrased version. Please try again.",
                    },
                ],
            });
        }

        // Ensure all options have required fields
        const validatedOptions = result.options.map((opt, idx) => ({
            text: opt.text || text,
            notes: opt.notes || `Rephrased version ${idx + 1}`,
        }));

        return NextResponse.json({ options: validatedOptions });
    } catch (error) {
        console.error("Rephrase error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to rephrase text" },
            { status: 500 }
        );
    }
}

