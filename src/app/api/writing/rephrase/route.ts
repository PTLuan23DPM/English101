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

        // Limit text length to prevent MAX_TOKENS issues
        // Shorter text = more room for response
        // For rephrasing, we want to ensure we have enough tokens for the response
        const textToRephrase = text.substring(0, 150); // Reduced further to ensure room for 3 rephrased options

        const prompt = buildRephrasePrompt(textToRephrase, style as "simple" | "academic" | "formal", targetLevel);

        try {
            const response = await callGemini(prompt, SYSTEM_INSTRUCTIONS.REPHRASE, {
                temperature: 0.7,
                maxTokens: 4000, // Increased significantly to prevent truncation - need tokens for 3 rephrased options + JSON structure
            });

            console.log("[Rephrase API] Raw Gemini response length:", response.length);
            console.log("[Rephrase API] Raw Gemini response (first 1000 chars):", response.substring(0, 1000));

            let result;
            try {
                result = parseGeminiJSON<{
                    options?: Array<{ text?: string; notes?: string }>;
                }>(response);
                console.log("[Rephrase API] Parsed result:", JSON.stringify(result, null, 2));
            } catch (parseError) {
                console.error("[Rephrase API] Failed to parse JSON:", parseError);
                console.error("[Rephrase API] Response length:", response.length);
                console.error("[Rephrase API] Response (first 1500 chars):", response.substring(0, 1500));
                console.error("[Rephrase API] Response (last 500 chars):", response.substring(Math.max(0, response.length - 500)));

                // Check if error is due to MAX_TOKENS (truncated response)
                const errorMessage = parseError instanceof Error ? parseError.message : String(parseError);
                if (errorMessage.includes("MAX_TOKENS") || errorMessage.includes("truncated")) {
                    console.warn("[Rephrase API] Response was truncated. Attempting to extract partial options...");

                    // Try to extract partial options from truncated JSON
                    // Look for complete option objects in the response
                    const optionPattern = /"options"\s*:\s*\[([\s\S]*)/;
                    const optionMatch = response.match(optionPattern);

                    if (optionMatch && optionMatch[1]) {
                        // Try to extract at least one complete option
                        const optionsText = optionMatch[1];
                        const singleOptionPattern = /\{"text"\s*:\s*"([^"]*(?:\\.[^"]*)*)"\s*,\s*"notes"\s*:\s*"([^"]*(?:\\.[^"]*)*)"\}/;
                        const optionMatches = optionsText.match(new RegExp(singleOptionPattern.source, 'g'));

                        if (optionMatches && optionMatches.length > 0) {
                            console.log(`[Rephrase API] Found ${optionMatches.length} complete option(s) in truncated response`);
                            const extractedOptions = optionMatches.slice(0, 3).map((match, idx) => {
                                try {
                                    // Try to parse the single option
                                    const optionObj = JSON.parse(match);
                                    return {
                                        text: optionObj.text || textToRephrase,
                                        notes: optionObj.notes || `Rephrased version ${idx + 1} (partial)`,
                                    };
                                } catch {
                                    return {
                                        text: textToRephrase,
                                        notes: `Rephrased version ${idx + 1} (extraction failed)`,
                                    };
                                }
                            });

                            if (extractedOptions.length > 0) {
                                return NextResponse.json({ options: extractedOptions });
                            }
                        }
                    }

                    // If we can't extract partial options, return a helpful error
                    return NextResponse.json({
                        options: [
                            {
                                text: textToRephrase,
                                notes: "Response was truncated due to token limit. Please try with shorter text (under 150 characters) or simpler content.",
                            },
                        ],
                    });
                }

                // Try to extract options manually as last resort
                const optionsMatch = response.match(/"options"\s*:\s*\[([\s\S]*?)\]/);
                if (optionsMatch) {
                    console.warn("[Rephrase API] Attempting manual extraction of options...");
                    return NextResponse.json({
                        options: [
                            {
                                text: textToRephrase,
                                notes: "Unable to parse AI response. The text may contain special characters. Please try with simpler text.",
                            },
                        ],
                    });
                }

                // Re-throw the error with more context
                throw new Error(`Failed to parse JSON response: ${errorMessage}`);
            }

            // Validate and provide defaults if missing
            if (!result.options || !Array.isArray(result.options) || result.options.length === 0) {
                console.warn("[Rephrase API] Invalid or empty options, providing default");
                return NextResponse.json({
                    options: [
                        {
                            text: textToRephrase, // Return original text as fallback
                            notes: "Unable to generate rephrased version. Please try again.",
                        },
                    ],
                });
            }

            // Ensure all options have required fields
            const validatedOptions = result.options.map((opt, idx) => ({
                text: opt.text || textToRephrase,
                notes: opt.notes || `Rephrased version ${idx + 1}`,
            }));

            return NextResponse.json({ options: validatedOptions });
        } catch (error) {
            console.error("Rephrase error:", error);
            const errorMessage = error instanceof Error ? error.message : "Failed to rephrase text";
            
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

            // Handle MAX_TOKENS error specifically
            if (errorMessage.includes("MAX_TOKENS") || errorMessage.includes("truncated")) {
                return NextResponse.json({
                    options: [
                        {
                            text: textToRephrase || text.substring(0, 150),
                            notes: "Response was truncated due to token limit. Please try with shorter text (under 150 characters).",
                        },
                    ],
                });
            }

            return NextResponse.json(
                { error: errorMessage },
                { status: 500 }
            );
        }
    } catch (error) {
        console.error("Rephrase API error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to rephrase text" },
            { status: 500 }
        );
    }
}

