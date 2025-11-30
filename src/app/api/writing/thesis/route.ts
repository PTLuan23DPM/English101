import { NextRequest, NextResponse } from "next/server";
import { callGemini, parseGeminiJSON, isGeminiConfigured } from "@/lib/gemini";
import { SYSTEM_INSTRUCTIONS, buildThesisPrompt } from "@/lib/prompts/writing";

export async function POST(req: NextRequest) {
    try {
        if (!isGeminiConfigured()) {
            return NextResponse.json(
                { error: "Gemini API is not configured" },
                { status: 503 }
            );
        }

        const { level, type, topic, stance } = await req.json();

        if (!level || !type || !topic) {
            return NextResponse.json(
                { error: "Missing required fields: level, type, topic" },
                { status: 400 }
            );
        }

        const prompt = buildThesisPrompt(level, type, topic, stance);
        const response = await callGemini(prompt, SYSTEM_INSTRUCTIONS.THESIS, {
            temperature: 0.7,
            maxTokens: 2500, // Increased to prevent truncation
        });

        console.log("[Thesis API] Raw Gemini response length:", response.length);
        console.log("[Thesis API] Raw Gemini response (first 500 chars):", response.substring(0, 500));

        let result;
        try {
            result = parseGeminiJSON<{
                options?: Array<{
                    thesis?: string;
                    mainPoints?: string[];
                    approach?: string;
                }>;
            }>(response);

            console.log("[Thesis API] Parsed result:", JSON.stringify(result, null, 2));
        } catch (parseError) {
            console.error("[Thesis API] JSON parsing failed:", parseError);
            console.error("[Thesis API] Full response:", response);
            // Return default result instead of throwing
            return NextResponse.json({
                options: [
                    {
                        thesis: `This essay will discuss ${topic} from a ${type} perspective at ${level} level.`,
                        mainPoints: ["Main point 1", "Main point 2", "Main point 3"],
                        approach: "General approach for this essay type",
                    },
                    {
                        thesis: `The essay explores ${topic} through the lens of ${type} analysis.`,
                        mainPoints: ["Key aspect 1", "Key aspect 2"],
                        approach: "Alternative approach",
                    },
                    {
                        thesis: `This writing addresses ${topic} using a ${type} framework.`,
                        mainPoints: ["Important point 1", "Important point 2", "Important point 3"],
                        approach: "Structured approach",
                    },
                ],
            });
        }

        // Validate and provide defaults if missing
        if (!result.options || !Array.isArray(result.options) || result.options.length === 0) {
            console.warn("[Thesis API] Invalid or empty options, providing default");
            return NextResponse.json({
                options: [
                    {
                        thesis: `This essay will discuss ${topic} from a ${type} perspective.`,
                        mainPoints: ["Point 1", "Point 2", "Point 3"],
                        approach: "General approach",
                    },
                ],
            });
        }

        // Ensure all options have required fields
        const validatedOptions = result.options.map((opt, idx) => ({
            thesis: opt.thesis || `Thesis statement ${idx + 1}`,
            mainPoints: Array.isArray(opt.mainPoints) ? opt.mainPoints : [],
            approach: opt.approach || `Approach ${idx + 1}`,
        }));

        return NextResponse.json({ options: validatedOptions });
    } catch (error) {
        console.error("Thesis generation error:", error);
        const errorMessage = error instanceof Error ? error.message : "Failed to generate thesis";
        
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

