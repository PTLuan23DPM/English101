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
            maxTokens: 2000, // Increased to prevent truncation
        });

        console.log("[Thesis API] Raw Gemini response length:", response.length);

        const result = parseGeminiJSON<{
            options?: Array<{
                thesis?: string;
                mainPoints?: string[];
                approach?: string;
            }>;
        }>(response);

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
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to generate thesis" },
            { status: 500 }
        );
    }
}

