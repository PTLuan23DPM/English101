/**
 * Gemini AI Service
 * Wrapper for Google Gemini API to power writing assistance features
 */

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Try multiple model names and API versions as fallback
// NOTE: gemini-pro is deprecated, prefer newer models (2.5 > 1.5)
const GEMINI_MODELS = [
    "gemini-2.5-flash",        // Latest and fastest
    "gemini-2.5-flash-latest", // Latest variant
    "gemini-1.5-flash-latest", // Fallback to 1.5
    "gemini-1.5-flash",
    "gemini-1.5-pro-latest",
    "gemini-1.5-pro",
];

// Deprecated models (do not try these)
const DEPRECATED_MODELS = [
    "gemini-pro",
    "gemini-pro-vision",
];

const GEMINI_API_VERSIONS = ["v1beta", "v1"];

// Default model (will be determined dynamically)
let activeModel = "gemini-2.5-flash";
let activeVersion = "v1beta";
let modelDetectionAttempted = false;

/**
 * Build API URL for a specific model and version
 */
function buildApiUrl(model: string, version: string): string {
    return `https://generativelanguage.googleapis.com/${version}/models/${model}:generateContent`;
}

export interface GeminiMessage {
    role: "user" | "model";
    parts: { text: string }[];
}

export interface GeminiRequest {
    contents: GeminiMessage[];
    systemInstruction?: {
        parts: Array<{ text: string }>;
    };
    generationConfig?: {
        temperature?: number;
        topK?: number;
        topP?: number;
        maxOutputTokens?: number;
        responseMimeType?: string;
    };
}

export interface GeminiResponse {
    candidates: Array<{
        content?: {
            parts: Array<{ text?: string }>;
            role?: string;
        };
        finishReason?: string;
        safetyRatings?: Array<{
            category: string;
            probability: string;
        }>;
    }>;
    promptFeedback?: {
        blockReason?: string;
    };
}

/**
 * Model availability map: model name -> supported API versions
 */
interface ModelAvailability {
    model: string;
    versions: string[];
}

/**
 * List available Gemini models with their supported API versions (excluding deprecated ones)
 */
async function listAvailableModels(): Promise<ModelAvailability[]> {
    if (!GEMINI_API_KEY) {
        return [];
    }

    const versions = ["v1beta", "v1"]; // Try v1beta first (more models available)
    const modelMap = new Map<string, Set<string>>(); // model name -> set of supported versions

    for (const version of versions) {
        try {
            const response = await fetch(
                `https://generativelanguage.googleapis.com/${version}/models?key=${GEMINI_API_KEY}`,
                {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                    },
                }
            );
            if (response.ok) {
                const data = await response.json();
                if (data.models && Array.isArray(data.models)) {
                    data.models.forEach((model: { name: string; supportedGenerationMethods?: string[] }) => {
                        // Extract model name (handle formats like "models/gemini-1.5-flash" or "gemini-1.5-flash")
                        let modelName = model.name;
                        if (modelName.startsWith("models/")) {
                            modelName = modelName.replace("models/", "");
                        }

                        // Skip deprecated models
                        if (DEPRECATED_MODELS.includes(modelName)) {
                            return;
                        }

                        // Only add if it supports generateContent
                        const supportsGenerateContent =
                            !model.supportedGenerationMethods ||
                            model.supportedGenerationMethods.includes("generateContent");

                        if (modelName && supportsGenerateContent) {
                            if (!modelMap.has(modelName)) {
                                modelMap.set(modelName, new Set());
                            }
                            modelMap.get(modelName)!.add(version);
                        }
                    });
                }
            }
        } catch (error) {
            // Ignore errors, try next version
            console.warn(`[Gemini API] Failed to list models from ${version}:`, error);
        }
    }

    // Convert to array format
    const result: ModelAvailability[] = [];
    modelMap.forEach((versions, model) => {
        result.push({
            model,
            versions: Array.from(versions),
        });
    });

    return result;
}

/**
 * Detect and set the best available model with correct API version
 */
async function detectAvailableModel(): Promise<void> {
    if (!GEMINI_API_KEY) {
        return;
    }

    try {
        const availableModels = await listAvailableModels();
        console.log("[Gemini API] Available models with versions:", availableModels.map(m => `${m.model} (${m.versions.join(", ")})`));

        if (availableModels.length === 0) {
            console.warn("[Gemini API] No available models found, using default");
            return;
        }

        // Create a map for quick lookup: model name -> supported versions
        const modelVersionMap = new Map<string, string[]>();
        availableModels.forEach(({ model, versions }) => {
            modelVersionMap.set(model, versions);
        });

        // Try to find a model from our preferred list (in order of preference)
        for (const model of GEMINI_MODELS) {
            const supportedVersions = modelVersionMap.get(model);
            if (supportedVersions && supportedVersions.length > 0) {
                activeModel = model;
                // Prefer v1beta for Gemini 1.5+ models, fallback to first available version
                activeVersion = supportedVersions.includes("v1beta") ? "v1beta" : supportedVersions[0];
                console.log(`[Gemini API] Using preferred model: ${activeModel} (${activeVersion})`);
                return;
            }
        }

        // Fallback to first available valid model (prefer 2.5 > 1.5 > others)
        const gemini25Models = availableModels.filter(m => m.model.includes("2.5"));
        const gemini15Models = availableModels.filter(m => m.model.includes("1.5"));

        if (gemini25Models.length > 0) {
            const bestModel = gemini25Models[0];
            activeModel = bestModel.model;
            activeVersion = bestModel.versions.includes("v1beta") ? "v1beta" : bestModel.versions[0];
            console.log(`[Gemini API] Using available Gemini 2.5 model: ${activeModel} (${activeVersion})`);
        } else if (gemini15Models.length > 0) {
            const bestModel = gemini15Models[0];
            activeModel = bestModel.model;
            activeVersion = bestModel.versions.includes("v1beta") ? "v1beta" : bestModel.versions[0];
            console.log(`[Gemini API] Using available Gemini 1.5 model: ${activeModel} (${activeVersion})`);
        } else {
            const firstModel = availableModels[0];
            activeModel = firstModel.model;
            activeVersion = firstModel.versions.includes("v1beta") ? "v1beta" : firstModel.versions[0];
            console.log(`[Gemini API] Using fallback model: ${activeModel} (${activeVersion})`);
        }
    } catch (error) {
        console.warn("[Gemini API] Failed to detect available models, using defaults:", error);
    }
}

/**
 * Call Gemini API with automatic error handling and model fallback
 */
export async function callGemini(
    prompt: string,
    systemInstruction?: string,
    config?: {
        temperature?: number;
        maxTokens?: number;
    }
): Promise<string> {
    if (!GEMINI_API_KEY) {
        throw new Error("GEMINI_API_KEY is not configured. Please add it to your .env file.");
    }

    // Detect available model on first call only (cache result to avoid repeated API calls)
    if (!modelDetectionAttempted) {
        modelDetectionAttempted = true;
        try {
            await detectAvailableModel();
        } catch (error) {
            console.warn("Model detection failed, will use fallback mechanism:", error);
            // Continue with fallback mechanism - it will try all models automatically
        }
    }

    // Base messages (user prompt only)
    const baseMessages: GeminiMessage[] = [
        {
            role: "user",
            parts: [{ text: prompt }],
        },
    ];

    // Determine if we need JSON response (based on system instruction)
    const needsJSON = systemInstruction?.includes("JSON") || systemInstruction?.includes("json");

    // Get available models with their supported versions
    let availableModelsWithVersions: ModelAvailability[] = [];
    try {
        availableModelsWithVersions = await listAvailableModels();
    } catch (error) {
        console.warn("[Gemini API] Failed to get available models, will try default models");
    }

    // Create a map for quick lookup: model name -> supported versions
    const modelVersionMap = new Map<string, string[]>();
    availableModelsWithVersions.forEach(({ model, versions }) => {
        modelVersionMap.set(model, versions);
    });

    // Try models in order of preference (exclude deprecated models)
    const validModelsToTry = GEMINI_MODELS.filter(m => !DEPRECATED_MODELS.includes(m));
    const modelsToTry = activeModel && !DEPRECATED_MODELS.includes(activeModel)
        ? [activeModel, ...validModelsToTry.filter((m) => m !== activeModel)]
        : validModelsToTry;

    let lastError: Error | null = null;

    for (const model of modelsToTry) {
        // Skip deprecated models
        if (DEPRECATED_MODELS.includes(model)) {
            console.warn(`[Gemini API] Skipping deprecated model: ${model}`);
            continue;
        }

        // Get supported versions for this model
        let supportedVersions = modelVersionMap.get(model) || [];

        // If no version info from API, infer from model name
        // Gemini 2.5 and 1.5+ models are typically only available in v1beta
        if (supportedVersions.length === 0) {
            if (model.includes("2.5") || model.includes("1.5")) {
                // Gemini 2.5 and 1.5 models are typically only in v1beta
                supportedVersions = ["v1beta"];
                console.log(`[Gemini API] No version info for ${model}, assuming v1beta only`);
            } else {
                // Older models might work with v1, but prefer v1beta
                supportedVersions = ["v1beta", "v1"];
            }
        }

        // Only try supported versions
        const versionsToTry = supportedVersions.includes(activeVersion)
            ? [activeVersion, ...supportedVersions.filter(v => v !== activeVersion)]
            : supportedVersions;

        for (const version of versionsToTry) {
            const apiUrl = buildApiUrl(model, version);

            try {
                // Determine if this model/version supports advanced features
                // Gemini 2.5 and 1.5+ models support systemInstruction and responseMimeType
                const supportsSystemInstruction = version === "v1beta" && (model.includes("2.5") || model.includes("1.5"));
                const supportsResponseMimeType = supportsSystemInstruction;

                // Prepare messages for this model
                const modelMessages: GeminiMessage[] = [...baseMessages];

                // Add system instruction based on model support
                if (systemInstruction && !supportsSystemInstruction) {
                    // For older models, add system instruction as first message
                    modelMessages.unshift({
                        role: "user",
                        parts: [{ text: `${systemInstruction}\n\nPlease follow these instructions carefully and respond in the requested format.` }],
                    });
                }

                // Prepare request body for this specific model/version
                const modelRequestBody: any = {
                    contents: modelMessages,
                    generationConfig: {
                        temperature: config?.temperature ?? 0.7,
                        topK: 40,
                        topP: 0.95,
                        maxOutputTokens: config?.maxTokens ?? 2048,
                    },
                };

                // Only add systemInstruction field if supported (Gemini 1.5+)
                if (systemInstruction && supportsSystemInstruction) {
                    modelRequestBody.systemInstruction = {
                        parts: [{ text: systemInstruction }],
                    };
                }

                // Only add responseMimeType if supported (Gemini 1.5+)
                if (needsJSON && supportsResponseMimeType) {
                    modelRequestBody.generationConfig.responseMimeType = "application/json";
                }

                const response = await fetch(`${apiUrl}?key=${GEMINI_API_KEY}`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(modelRequestBody),
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    const errorMessage = errorData.error?.message || response.statusText;

                    // If model not found (404), try next version or model
                    if (response.status === 404) {
                        console.warn(`[Gemini API] Model ${model} (${version}) not found: ${errorMessage}`);

                        // If it's a deprecated model, skip permanently
                        if (DEPRECATED_MODELS.includes(model)) {
                            console.warn(`[Gemini API] Model ${model} is deprecated, skipping permanently`);
                            continue; // Skip to next model
                        }

                        // If this version doesn't work, try next version for this model
                        // (the outer loop will handle trying next version)
                        lastError = new Error(`Model ${model} (${version}) not found: ${errorMessage}`);
                        continue; // Continue to next version
                    }

                    // If invalid argument (400) due to unsupported features, try fallback format
                    if (response.status === 400 && errorMessage.includes("Unknown name")) {
                        console.warn(`[Gemini API] Model ${model} (${version}) doesn't support advanced features, trying fallback format...`);

                        // Fallback: Use messages format without systemInstruction field or responseMimeType
                        const fallbackMessages: GeminiMessage[] = [...baseMessages];
                        if (systemInstruction) {
                            // Add system instruction as first message
                            fallbackMessages.unshift({
                                role: "user",
                                parts: [{ text: `${systemInstruction}\n\nPlease follow these instructions carefully and respond in valid JSON format only.` }],
                            });
                        }

                        const fallbackBody: any = {
                            contents: fallbackMessages,
                            generationConfig: {
                                temperature: config?.temperature ?? 0.7,
                                topK: 40,
                                topP: 0.95,
                                maxOutputTokens: config?.maxTokens ?? 2048,
                            },
                        };

                        try {
                            const fallbackResponse = await fetch(`${apiUrl}?key=${GEMINI_API_KEY}`, {
                                method: "POST",
                                headers: {
                                    "Content-Type": "application/json",
                                },
                                body: JSON.stringify(fallbackBody),
                            });

                            if (fallbackResponse.ok) {
                                // Use fallback response
                                const fallbackData: GeminiResponse = await fallbackResponse.json();
                                if (fallbackData.candidates && fallbackData.candidates.length > 0) {
                                    const fallbackCandidate = fallbackData.candidates[0];
                                    if (fallbackCandidate.content?.parts?.[0]?.text) {
                                        console.log(`[Gemini API] Successfully using ${model} (${version}) with fallback format`);
                                        // Update active model if successful
                                        if (model !== activeModel || version !== activeVersion) {
                                            activeModel = model;
                                            activeVersion = version;
                                        }
                                        return fallbackCandidate.content.parts[0].text;
                                    }
                                }
                            } else {
                                const fallbackError = await fallbackResponse.json().catch(() => ({}));
                                console.error(`[Gemini API] Fallback also failed:`, fallbackError);
                            }
                        } catch (fallbackError) {
                            console.error(`[Gemini API] Fallback request failed:`, fallbackError);
                        }

                        lastError = new Error(`Model ${model} (${version}) doesn't support required features: ${errorMessage}`);
                        continue;
                    }

                    throw new Error(
                        `Gemini API error: ${response.status} ${response.statusText}\n${JSON.stringify(errorData)}`
                    );
                }

                const data: GeminiResponse = await response.json();

                // Log response for debugging (only in development)
                if (process.env.NODE_ENV === "development") {
                    console.log(`[Gemini API] Response from ${model} (${version}):`, JSON.stringify(data, null, 2));
                }

                if (!data.candidates || data.candidates.length === 0) {
                    console.error("[Gemini API] No candidates in response:", JSON.stringify(data, null, 2));
                    throw new Error("No response from Gemini API - no candidates returned");
                }

                const candidate = data.candidates[0];

                // Check prompt feedback for block reasons first
                if (data.promptFeedback?.blockReason) {
                    console.error("[Gemini API] Prompt blocked:", data.promptFeedback.blockReason);
                    throw new Error(`Prompt blocked: ${data.promptFeedback.blockReason}`);
                }

                // Check if response was blocked or filtered
                if (candidate.finishReason && (candidate.finishReason === "SAFETY" || candidate.finishReason === "RECITATION")) {
                    console.error("[Gemini API] Response blocked:", candidate.finishReason, candidate.safetyRatings);
                    // Even if blocked, try to get partial response if available
                    if (candidate.content?.parts?.[0]?.text) {
                        console.warn("[Gemini API] Response was blocked but partial content available, using it");
                    } else {
                        throw new Error(`Response blocked by safety filters: ${candidate.finishReason}`);
                    }
                }

                // Log finish reason for debugging
                if (candidate.finishReason && candidate.finishReason !== "STOP") {
                    console.warn(`[Gemini API] Finish reason: ${candidate.finishReason}`);
                    // MAX_TOKENS means response was truncated but still usable
                    if (candidate.finishReason === "MAX_TOKENS") {
                        console.warn("[Gemini API] Response truncated due to token limit, but content may still be usable");
                    }
                }

                // Try to extract text from candidate
                let extractedText: string | null = null;

                // Method 1: Standard structure (content.parts[0].text)
                if (candidate.content?.parts?.[0]?.text) {
                    extractedText = candidate.content.parts[0].text;
                }
                // Method 2: Alternative structure (content.parts might be an array with different structure)
                else if (candidate.content?.parts && Array.isArray(candidate.content.parts) && candidate.content.parts.length > 0) {
                    // Try to find text in any part
                    for (const part of candidate.content.parts) {
                        if (part && typeof part === 'object') {
                            // Try different possible field names
                            if ('text' in part && typeof part.text === 'string') {
                                extractedText = part.text;
                                break;
                            } else if ('content' in part && typeof part.content === 'string') {
                                extractedText = part.content;
                                break;
                            }
                        }
                    }
                }
                // Method 3: Check if content itself is a string
                else if (candidate.content && typeof candidate.content === 'string') {
                    extractedText = candidate.content;
                }
                // Method 4: Check if candidate has text directly
                else if ('text' in candidate && typeof candidate.text === 'string') {
                    extractedText = candidate.text;
                }

                if (!extractedText) {
                    console.error("[Gemini API] Could not extract text from response:");
                    console.error("[Gemini API] Candidate structure:", JSON.stringify(candidate, null, 2));
                    console.error("[Gemini API] Full response:", JSON.stringify(data, null, 2));

                    // Try next candidate if available
                    if (data.candidates.length > 1) {
                        console.warn("[Gemini API] Trying next candidate...");
                        const nextCandidate = data.candidates[1];
                        if (nextCandidate.content?.parts?.[0]?.text) {
                            extractedText = nextCandidate.content.parts[0].text;
                            console.log("[Gemini API] Successfully extracted text from next candidate");
                        }
                    }

                    if (!extractedText) {
                        throw new Error("Invalid response structure from Gemini API - could not extract text from response");
                    }
                }

                // Update active model if successful
                if (model !== activeModel || version !== activeVersion) {
                    activeModel = model;
                    activeVersion = version;
                    console.log(`[Gemini API] Successfully using model: ${activeModel} (${activeVersion})`);
                }

                // Warn if response was truncated
                if (candidate.finishReason === "MAX_TOKENS") {
                    console.warn(`[Gemini API] Response was truncated (MAX_TOKENS), consider increasing maxTokens`);
                }

                return extractedText;
            } catch (error) {
                // If it's a network error or non-404 error, throw immediately
                if (error instanceof Error && !error.message.includes("404") && !error.message.includes("not found")) {
                    throw error;
                }
                lastError = error instanceof Error ? error : new Error(String(error));
                continue;
            }
        }
    }

    // If all models failed, throw the last error
    throw lastError || new Error(
        "All Gemini models failed. Please check your API key and ensure you have access to at least one Gemini model."
    );
}

/**
 * Fix unterminated strings in JSON by closing them properly
 */
function fixUnterminatedStrings(jsonString: string): string {
    let fixed = jsonString;
    let inString = false;
    let escapeNext = false;
    const unterminatedStrings: Array<{ start: number; end: number }> = [];
    let currentStringStart = -1;

    // Find all unterminated strings
    for (let i = 0; i < fixed.length; i++) {
        const char = fixed[i];

        if (escapeNext) {
            escapeNext = false;
            continue;
        }

        if (char === '\\') {
            escapeNext = true;
            continue;
        }

        if (char === '"') {
            if (!inString) {
                inString = true;
                currentStringStart = i;
            } else {
                inString = false;
                currentStringStart = -1;
            }
        }
    }

    // If we're still in a string at the end, it's unterminated
    if (inString && currentStringStart !== -1) {
        unterminatedStrings.push({ start: currentStringStart, end: fixed.length });
    }

    // Fix unterminated strings from end to start (to preserve indices)
    for (let i = unterminatedStrings.length - 1; i >= 0; i--) {
        const { start, end } = unterminatedStrings[i];
        const stringContent = fixed.substring(start + 1, end);

        // Escape special characters in the string content
        const escapedContent = stringContent
            .replace(/\\/g, "\\\\")  // Escape backslashes first
            .replace(/"/g, '\\"')     // Escape quotes
            .replace(/\n/g, "\\n")    // Escape newlines
            .replace(/\r/g, "\\r")    // Escape carriage returns
            .replace(/\t/g, "\\t");   // Escape tabs

        // Close the string
        fixed = fixed.substring(0, start + 1) + escapedContent + '"' + fixed.substring(end);
    }

    return fixed;
}

/**
 * Find the largest valid JSON object or array in a string using balanced bracket matching
 */
function extractValidJSON(text: string): string | null {
    let bestMatch: { start: number; end: number; type: 'object' | 'array' } | null = null;
    let depth = 0;
    let start = -1;
    let startType: 'object' | 'array' | null = null;
    let inString = false;
    let escapeNext = false;

    for (let i = 0; i < text.length; i++) {
        const char = text[i];

        if (escapeNext) {
            escapeNext = false;
            continue;
        }

        if (char === '\\') {
            escapeNext = true;
            continue;
        }

        if (char === '"') {
            inString = !inString;
            continue;
        }

        if (inString) {
            continue;
        }

        if (char === '{' || char === '[') {
            if (depth === 0) {
                start = i;
                startType = char === '{' ? 'object' : 'array';
            }
            depth++;
        } else if (char === '}' || char === ']') {
            depth--;
            if (depth === 0 && start !== -1 && startType) {
                // Check if closing bracket matches opening bracket type
                const isValid = (startType === 'object' && char === '}') || (startType === 'array' && char === ']');
                if (isValid) {
                    // Found complete JSON structure
                    const matchLength = i + 1 - start;
                    if (!bestMatch || matchLength > (bestMatch.end - bestMatch.start)) {
                        bestMatch = { start, end: i + 1, type: startType };
                    }
                }
                start = -1;
                startType = null;
            }
        }
    }

    if (bestMatch) {
        return text.substring(bestMatch.start, bestMatch.end);
    }

    return null;
}

/**
 * Parse JSON from Gemini response (handles markdown code blocks, extra text, and common JSON issues)
 */
export function parseGeminiJSON<T>(text: string): T {
    if (!text || typeof text !== "string") {
        console.error("Invalid input to parseGeminiJSON:", text);
        throw new Error("Invalid JSON response from AI: empty or non-string response");
    }

    let cleaned = text.trim();

    // Remove markdown code blocks if present
    cleaned = cleaned.replace(/^```json\s*/i, "").replace(/^```\s*/, "").replace(/```\s*$/g, "");

    // Try to extract JSON if there's text before/after
    // Look for JSON object/array boundaries (use non-greedy matching first)
    let jsonMatch = cleaned.match(/\{[\s\S]*?\}|\[[\s\S]*?\]/);
    if (!jsonMatch) {
        // If no match, try greedy matching
        jsonMatch = cleaned.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    }

    if (jsonMatch) {
        cleaned = jsonMatch[0];
    }

    // Clean up common issues
    cleaned = cleaned.trim();

    // Try parsing first time
    try {
        return JSON.parse(cleaned);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.warn("[Gemini API] First parse attempt failed:", errorMessage);

        // If error mentions unterminated string, try to fix it
        if (errorMessage.includes("Unterminated string") || errorMessage.includes("unterminated")) {
            console.log("[Gemini API] Attempting to fix unterminated strings...");
            try {
                const fixed = fixUnterminatedStrings(cleaned);
                return JSON.parse(fixed);
            } catch (fixError) {
                console.warn("[Gemini API] Fix attempt failed, trying extraction...");
            }
        }

        // Try to extract valid JSON using balanced bracket matching
        const extracted = extractValidJSON(cleaned);
        if (extracted) {
            try {
                return JSON.parse(extracted);
            } catch (e) {
                // Try fixing unterminated strings in extracted JSON
                if (e instanceof Error && e.message.includes("Unterminated string")) {
                    try {
                        const fixed = fixUnterminatedStrings(extracted);
                        return JSON.parse(fixed);
                    } catch (fixError) {
                        console.warn("[Gemini API] Extracted JSON still invalid after fix, trying original text...");
                    }
                } else {
                    console.warn("[Gemini API] Extracted JSON still invalid, trying original text...");
                }
            }
        }

        // Try extracting from original text
        const extractedFromOriginal = extractValidJSON(text);
        if (extractedFromOriginal) {
            try {
                return JSON.parse(extractedFromOriginal);
            } catch (e) {
                // Try fixing unterminated strings
                if (e instanceof Error && e.message.includes("Unterminated string")) {
                    try {
                        const fixed = fixUnterminatedStrings(extractedFromOriginal);
                        return JSON.parse(fixed);
                    } catch (fixError) {
                        // Still failed
                    }
                }
            }
        }

        // Last resort: try simple object match (for very simple cases)
        const simpleObjectMatch = cleaned.match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/);
        if (simpleObjectMatch) {
            try {
                return JSON.parse(simpleObjectMatch[0]);
            } catch (e) {
                // Still failed
            }
        }

        console.error("[Gemini API] Failed to parse JSON response after all attempts:");
        console.error("Original text (first 1000 chars):", text.substring(0, 1000));
        console.error("Cleaned text (first 1000 chars):", cleaned.substring(0, 1000));
        console.error("Parse error:", errorMessage);

        throw new Error(`Invalid JSON response from AI: ${errorMessage}. The response may be incomplete, truncated, or contain invalid characters. Please try again.`);
    }
}

/**
 * Check if Gemini API is configured
 */
export function isGeminiConfigured(): boolean {
    return !!GEMINI_API_KEY && GEMINI_API_KEY !== "your-gemini-api-key-here";
}

