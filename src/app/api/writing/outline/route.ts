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
        
        let response: string;
        try {
            response = await callGemini(prompt, SYSTEM_INSTRUCTIONS.OUTLINE, {
                temperature: 0.7,
                maxTokens: 4000, // Increased significantly to prevent truncation
            });
        } catch (error) {
            const errorAny = error as any;
            // Handle MAX_TOKENS error - return default outline instead of failing
            if (
                errorAny.message?.includes("MAX_TOKENS") ||
                errorAny.message?.includes("truncated") ||
                errorAny.message?.includes("token limit")
            ) {
                console.warn("[Outline API] MAX_TOKENS error, returning default outline");
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
            throw error; // Re-throw other errors
        }

        console.log("[Outline API] Raw Gemini response length:", response.length);

        let result;
        try {
            result = parseGeminiJSON<{
                outline?: Array<{ section?: string; points?: string[] }>;
                thesisOptions?: string[];
            }>(response);
        } catch (parseError) {
            // If parsing fails, check if it's due to truncation
            const parseErrorMessage = parseError instanceof Error ? parseError.message : String(parseError);
            if (parseErrorMessage.includes("MAX_TOKENS") || parseErrorMessage.includes("truncated")) {
                console.warn("[Outline API] Response truncated, returning default outline");
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
            throw parseError; // Re-throw other parse errors
        }

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
    } catch (error: unknown) {
        console.error("[Outline API] Error:", error);
        
        // Handle Gemini API 503 errors (from gemini.ts)
        if (error instanceof Error) {
            const errorAny = error as any;
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
        }
        
        // Handle Gemini API errors from response
        if (error && typeof error === "object" && "error" in error) {
            const geminiError = error as { error?: { code?: number; message?: string; status?: string } };
            if (geminiError.error?.code === 503 || geminiError.error?.status === "UNAVAILABLE") {
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
            if (geminiError.error?.message) {
                return NextResponse.json(
                    { error: geminiError.error },
                    { status: 503 }
                );
            }
        }
        
        const errorMessage = error instanceof Error ? error.message : "Failed to generate outline";
        const errorAny = error as any;

        // Handle MAX_TOKENS error - return default outline instead of error
        if (
            errorMessage.includes("MAX_TOKENS") ||
            errorMessage.includes("truncated") ||
            errorMessage.includes("token limit")
        ) {
            console.warn("[Outline API] MAX_TOKENS error in catch block, returning default outline");
            return NextResponse.json({
                outline: [
                    { section: "Introduction", points: ["Hook", "Background", "Thesis"] },
                    { section: "Body 1", points: ["Main point", "Supporting detail"] },
                    { section: "Body 2", points: ["Main point", "Supporting detail"] },
                    { section: "Conclusion", points: ["Restate thesis", "Summary"] },
                ],
                thesisOptions: [`This essay will discuss ${topic || "the topic"}.`],
            });
        }

        return NextResponse.json(
            { error: errorMessage },
            { status: 500 }
        );
    }
}

