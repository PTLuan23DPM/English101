import { NextRequest, NextResponse } from "next/server";
import { callGemini, parseGeminiJSON, isGeminiConfigured } from "@/lib/gemini";
import { SYSTEM_INSTRUCTIONS, buildOutlinePrompt } from "@/lib/prompts/writing";

export async function POST(req: NextRequest) {
    try {
        if (!isGeminiConfigured()) {
            return NextResponse.json(
                { error: "Gemini API is not configured. Please add GEMINI_API_KEY to your .env file." },
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

        const prompt = buildOutlinePrompt(level, type, topic);
        const response = await callGemini(prompt, SYSTEM_INSTRUCTIONS.OUTLINE, {
            temperature: 0.7,
            maxTokens: 2000, // Increased to prevent truncation
        });

        console.log("[Outline API] Raw Gemini response length:", response.length);

        const result = parseGeminiJSON<{
            outline?: Array<{ section?: string; points?: string[] }>;
            thesisOptions?: string[];
        }>(response);

        // Validate and provide defaults if missing
        if (!result.outline || !Array.isArray(result.outline) || result.outline.length === 0) {
            console.warn("[Outline API] Invalid or empty outline, providing default");
            return NextResponse.json({
                outline: [
                    { section: "Introduction", points: ["Hook", "Background", "Thesis"] },
                    { section: "Body 1", points: ["Main point", "Supporting detail"] },
                    { section: "Body 2", points: ["Main point", "Supporting detail"] },
                    { section: "Conclusion", points: ["Restate thesis", "Summary"] },
                ],
                thesisOptions: [`This essay will discuss ${topic}.`],
            });
        }

        // Ensure all outline items have required fields
        const validatedOutline = result.outline.map((item, idx) => ({
            section: item.section || `Section ${idx + 1}`,
            points: Array.isArray(item.points) ? item.points : [],
        }));

        return NextResponse.json({
            outline: validatedOutline,
            thesisOptions: Array.isArray(result.thesisOptions) ? result.thesisOptions : [],
        });
    } catch (error) {
        console.error("Outline generation error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to generate outline" },
            { status: 500 }
        );
    }
}

