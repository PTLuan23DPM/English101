import { NextRequest, NextResponse } from "next/server";
import { callGemini, parseGeminiJSON, isGeminiConfigured } from "@/lib/gemini";
import { buildScoringPrompt, SYSTEM_INSTRUCTIONS } from "@/lib/prompts/writing";

export async function POST(req: NextRequest) {
    try {
        if (!isGeminiConfigured()) {
            return NextResponse.json(
                { error: "Gemini API is not configured" },
                { status: 503 }
            );
        }

        const { text, prompt, task } = await req.json();

        if (!text || text.trim().length < 10) {
            return NextResponse.json(
                { error: "Text must be at least 10 characters" },
                { status: 400 }
            );
        }

        // Build comprehensive scoring prompt
        const scoringPrompt = buildScoringPrompt(text, prompt || "", task);

        // Call Gemini with detailed scoring instructions
        const response = await callGemini(scoringPrompt, SYSTEM_INSTRUCTIONS.SCORING, {
            temperature: 0.3, // Lower temperature for more consistent scoring
            maxTokens: 3000, // Need more tokens for detailed feedback
        });

        console.log("[Gemini Scoring] Raw response length:", response.length);

        // Parse the JSON response
        const result = parseGeminiJSON<{
            score_10?: number;
            overall_score?: number;
            detailed_scores?: {
                task_response?: { score?: number; feedback?: string[] };
                coherence_cohesion?: { score?: number; feedback?: string[] };
                lexical_resource?: { score?: number; feedback?: string[] };
                grammatical_range?: { score?: number; feedback?: string[] };
            };
            statistics?: {
                words?: number;
                characters?: number;
                sentences?: number;
                paragraphs?: number;
                unique_words?: number;
            };
            strengths?: string[];
            weaknesses?: string[];
            recommendations?: string[];
        }>(response);

        console.log("[Gemini Scoring] Parsed result:", JSON.stringify(result, null, 2));

        // Calculate statistics
        const words = text.split(/\s+/).filter(w => w.length > 0);
        const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
        const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
        const uniqueWords = new Set(words.map(w => w.toLowerCase()));

        const statistics = {
            words: words.length,
            characters: text.length,
            sentences: sentences.length,
            paragraphs: paragraphs.length || 1,
            unique_words: uniqueWords.size,
        };

        // Validate and normalize scores (0-10 scale)
        const normalizeScore = (score: number | undefined, defaultScore: number = 7.0): number => {
            if (typeof score !== 'number' || isNaN(score)) return defaultScore;
            return Math.max(0, Math.min(10, score));
        };

        const taskResponseScore = normalizeScore(
            result.detailed_scores?.task_response?.score,
            result.score_10 || 7.0
        );
        const coherenceScore = normalizeScore(
            result.detailed_scores?.coherence_cohesion?.score,
            result.score_10 || 7.0
        );
        const lexicalScore = normalizeScore(
            result.detailed_scores?.lexical_resource?.score,
            result.score_10 || 7.0
        );
        const grammarScore = normalizeScore(
            result.detailed_scores?.grammatical_range?.score,
            result.score_10 || 7.0
        );

        // Calculate overall score as average of 4 criteria
        const overallScore = (taskResponseScore + coherenceScore + lexicalScore + grammarScore) / 4;
        const score10 = Math.round(overallScore * 10) / 10; // Round to 1 decimal

        // Ensure feedback arrays exist
        const ensureArray = (arr: string[] | undefined): string[] => {
            return Array.isArray(arr) && arr.length > 0 ? arr : ["No specific feedback provided."];
        };

        // Build response matching Python service format
        const scoringResult = {
            score_10: score10,
            overall_score: Math.round(overallScore * 100) / 10, // Convert to 100 scale for compatibility
            detailed_scores: {
                task_response: {
                    score: Math.round(taskResponseScore * 10) / 10,
                    feedback: ensureArray(result.detailed_scores?.task_response?.feedback),
                },
                coherence_cohesion: {
                    score: Math.round(coherenceScore * 10) / 10,
                    feedback: ensureArray(result.detailed_scores?.coherence_cohesion?.feedback),
                },
                lexical_resource: {
                    score: Math.round(lexicalScore * 10) / 10,
                    feedback: ensureArray(result.detailed_scores?.lexical_resource?.feedback),
                },
                grammatical_range: {
                    score: Math.round(grammarScore * 10) / 10,
                    feedback: ensureArray(result.detailed_scores?.grammatical_range?.feedback),
                },
            },
            statistics: result.statistics || statistics,
            word_count: statistics.words,
            strengths: Array.isArray(result.strengths) ? result.strengths : [],
            weaknesses: Array.isArray(result.weaknesses) ? result.weaknesses : [],
            recommendations: Array.isArray(result.recommendations) ? result.recommendations : [],
        };

        return NextResponse.json(scoringResult);
    } catch (error) {
        console.error("Gemini scoring error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to score writing" },
            { status: 500 }
        );
    }
}

