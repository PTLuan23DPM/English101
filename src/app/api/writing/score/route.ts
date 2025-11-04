import { NextRequest, NextResponse } from "next/server";

const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || "http://localhost:5001";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text, prompt } = body;

    if (!text || text.trim().length === 0) {
      return NextResponse.json(
        { error: "No text provided" },
        { status: 400 }
      );
    }

    // Try to call Python service
    try {
      const response = await fetch(`${PYTHON_SERVICE_URL}/score`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          prompt: prompt || "",
        }),
        // Add timeout
        signal: AbortSignal.timeout(30000), // 30 seconds timeout
      });

      if (!response.ok) {
        throw new Error(`Python service returned ${response.status}`);
      }

      const result = await response.json();
      return NextResponse.json(result);
    } catch (fetchError: any) {
      console.error("Python service error:", fetchError);

      // If service is not available, return fallback scoring
      if (
        fetchError.name === "AbortError" ||
        fetchError.message?.includes("fetch failed") ||
        fetchError.message?.includes("ECONNREFUSED") ||
        fetchError.code === "ECONNREFUSED"
      ) {
        console.log("Python service unavailable, using fallback scoring");

        // Fallback scoring based on text analysis
        const wordCount = text.split(/\s+/).filter((w) => w.length > 0).length;
        const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
        const uniqueWords = new Set(
          text
            .toLowerCase()
            .split(/\s+/)
            .filter((w) => w.length > 0)
        ).size;
        const lexicalDiversity = uniqueWords / wordCount;

        // Calculate base score
        let score_10 = 5.0;
        if (wordCount >= 250) score_10 += 1.5;
        else if (wordCount >= 200) score_10 += 1.0;
        else if (wordCount >= 150) score_10 += 0.5;
        else score_10 -= 1.0;

        if (lexicalDiversity > 0.6) score_10 += 1.0;
        else if (lexicalDiversity > 0.5) score_10 += 0.5;
        else if (lexicalDiversity < 0.4) score_10 -= 0.5;

        const avgSentenceLength = wordCount / sentences.length;
        if (avgSentenceLength >= 15 && avgSentenceLength <= 25) score_10 += 0.5;
        else if (avgSentenceLength < 10) score_10 -= 0.5;

        score_10 = Math.max(3.0, Math.min(9.0, score_10));

        // Determine CEFR level
        let cefr_level = "A1";
        let cefr_description = "Beginner";
        if (score_10 >= 9.4) {
          cefr_level = "C2";
          cefr_description = "Proficient";
        } else if (score_10 >= 7.8) {
          cefr_level = "C1";
          cefr_description = "Advanced";
        } else if (score_10 >= 6.1) {
          cefr_level = "B2";
          cefr_description = "Upper Intermediate";
        } else if (score_10 >= 4.4) {
          cefr_level = "B1";
          cefr_description = "Intermediate";
        } else if (score_10 >= 3.3) {
          cefr_level = "A2";
          cefr_description = "Elementary";
        }

        return NextResponse.json({
          score_10: Math.round(score_10 * 10) / 10,
          overall_score: Math.round(score_10 * 10) / 10,
          cefr_level,
          cefr_description,
          detailed_scores: {
            task_response: {
              score: Math.round(score_10 * 10) / 10,
              feedback: [
                wordCount >= 200
                  ? "✓ Good word count"
                  : "⚠️ Try to write more to fully develop your ideas",
                "Using fallback scoring (Python service unavailable)",
              ],
            },
            coherence_cohesion: {
              score: Math.round(score_10 * 10) / 10,
              feedback: [
                sentences.length >= 10
                  ? "✓ Good sentence variety"
                  : "⚠️ Try to vary your sentence structure",
                "Using fallback scoring",
              ],
            },
            lexical_resource: {
              score: Math.round(score_10 * 10) / 10,
              feedback: [
                lexicalDiversity > 0.5
                  ? "✓ Good vocabulary diversity"
                  : "⚠️ Try to use more varied vocabulary",
                "Using fallback scoring",
              ],
            },
            grammatical_range: {
              score: Math.round(score_10 * 10) / 10,
              feedback: [
                avgSentenceLength >= 15
                  ? "✓ Good sentence complexity"
                  : "⚠️ Try to use more complex sentence structures",
                "Using fallback scoring",
              ],
            },
          },
          word_count: wordCount,
          statistics: {
            words: wordCount,
            characters: text.length,
            sentences: sentences.length,
            paragraphs: text.split("\n\n").filter((p) => p.trim()).length,
            unique_words: uniqueWords,
          },
          using_fallback: true,
          service_available: false,
        });
      }

      // For other errors, return error response
      return NextResponse.json(
        {
          error: "Scoring service error",
          message: fetchError.message,
          service_available: false,
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("Error in scoring API:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error.message,
      },
      { status: 500 }
    );
  }
}

