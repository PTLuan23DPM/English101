import { NextRequest, NextResponse } from "next/server";

const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || "http://localhost:5001";
const SAPLING_API_KEY = process.env.SAPLING_API_KEY;

/**
 * Convert Sapling API response to our format
 * Sapling returns an array of edits with format:
 * { start: number, end: number, replacement: string, error_type: string }
 */
function convertSaplingResponse(saplingData: any, text: string) {
  // Sapling can return edits as array or object with edits property
  const edits = Array.isArray(saplingData) ? saplingData : (saplingData.edits || []);
  const issues: any[] = [];

  edits.forEach((edit: any) => {
    const start = edit.start || 0;
    const end = edit.end || start + 1;
    const length = end - start;
    const errorType = edit.error_type || "Grammar";
    
    // Map Sapling error types to our types
    // Sapling error types: 'R:ORTH', 'R:GRAM', 'R:STYLE', etc.
    let type = "Grammar";
    if (errorType.includes("ORTH") || errorType.includes("SPELL")) {
      type = "Spelling";
    } else if (errorType.includes("GRAM")) {
      type = "Grammar";
    } else if (errorType.includes("STYLE")) {
      type = "Style";
    } else if (errorType.includes("PUNCT")) {
      type = "Punctuation";
    }

    // Get context around the error
    const contextStart = Math.max(0, start - 20);
    const contextEnd = Math.min(text.length, end + 20);
    const contextText = text.substring(contextStart, contextEnd);

    issues.push({
      type,
      message: edit.general_error_type || errorType.replace("R:", "") || "Grammar error",
      short_message: errorType.replace("R:", "") || "Error",
      offset: start,
      length: length,
      sentence_index: 0, // Can be calculated if needed
      severity: errorType.includes("ORTH") ? "error" : "warning",
      context: {
        text: contextText,
        offset: start - contextStart, // Relative offset in context
        length: length,
      },
      replacements: edit.replacement
        ? [{ value: edit.replacement.trim() }] // Trim replacement to remove extra spaces
        : (edit.replacements?.map((r: string) => ({ value: r.trim() })) || []),
    });
  });

  return {
    issues,
    issue_count: issues.length,
    language: "en-US",
    using_sapling: true,
  };
}

/**
 * Basic grammar check fallback
 */
function basicGrammarCheck(text: string) {
  const issues: any[] = [];
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);

  sentences.forEach((sentence, index) => {
    const trimmed = sentence.trim();
    if (trimmed.length > 0 && trimmed[0] === trimmed[0].toLowerCase()) {
      const offset = text.indexOf(trimmed);
      if (offset !== -1) {
        issues.push({
          type: "Capitalization",
          message: "Sentence should start with a capital letter",
          short_message: "Capitalization error",
          offset,
          length: 1,
          sentence_index: index,
          severity: "error",
          context: {
            text: trimmed.substring(0, 50),
            offset,
            length: 1,
          },
          replacements: [
            { value: trimmed[0].toUpperCase() + trimmed.substring(1) },
          ],
        });
      }
    }
  });

  return {
    issues,
    issue_count: issues.length,
    language: "en-US",
    using_fallback: true,
  };
}

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
    const { text, language = "en-US" } = body;

    if (!text || text.trim().length === 0) {
      return NextResponse.json(
        { error: "No text provided" },
        { status: 400 }
      );
    }

    // Priority 1: Try Sapling API (if API key is configured)
    if (SAPLING_API_KEY) {
      try {
        const saplingResponse = await fetch("https://api.sapling.ai/api/v1/edits", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            key: SAPLING_API_KEY,
            text: text,
            session_id: "english101",
          }),
          signal: AbortSignal.timeout(15000), // 15 seconds timeout
        });

        if (saplingResponse.ok) {
          const saplingData = await saplingResponse.json();
          const result = convertSaplingResponse(saplingData, text);
          return NextResponse.json(result);
        } else {
          console.warn(`Sapling API returned ${saplingResponse.status}, trying fallback`);
        }
      } catch (saplingError: any) {
        console.warn("Sapling API error:", saplingError.message);
        // Continue to fallback
      }
    }

    // Priority 2: Try Python service (LanguageTool)
    try {
      const response = await fetch(`${PYTHON_SERVICE_URL}/grammar-check`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          language,
        }),
        signal: AbortSignal.timeout(30000), // 30 seconds timeout
      });

      if (response.ok) {
        const result = await response.json();
        return NextResponse.json(result);
      } else {
        throw new Error(`Python service returned ${response.status}`);
      }
    } catch (fetchError: any) {
      console.warn("Python service error:", fetchError.message);

      // If service is not available, use basic grammar check
      if (
        fetchError.name === "AbortError" ||
        fetchError.message?.includes("fetch failed") ||
        fetchError.message?.includes("ECONNREFUSED") ||
        fetchError.code === "ECONNREFUSED"
      ) {
        console.log("Python service unavailable, using basic grammar check");
        const result = basicGrammarCheck(text);
        return NextResponse.json(result);
      }

      // For other errors, try basic check as last resort
      const result = basicGrammarCheck(text);
      return NextResponse.json(result);
    }
  } catch (error: any) {
    console.error("Error in grammar check API:", error);
    // Last resort: basic check
    try {
      const textToCheck = body?.text || "";
      const result = basicGrammarCheck(textToCheck);
      return NextResponse.json(result);
    } catch (fallbackError) {
      return NextResponse.json(
        { error: "Grammar check failed", details: error?.message },
        { status: 500 }
      );
    }
  }
}

