import { NextRequest, NextResponse } from "next/server";
import { readFile, readdir } from "fs/promises";
import { join } from "path";

// Get listening files directory - try multiple possible locations
function getListeningFilesDir(): string {
  const possiblePaths = [
    join(process.cwd(), "..", "listening_file"),
    join(process.cwd(), "listening_file"),
    join(process.cwd(), "..", "..", "listening_file"),
  ];
  
  for (const path of possiblePaths) {
    try {
      const fs = require("fs");
      if (fs.existsSync(path)) {
        return path;
      }
    } catch {
      // Continue to next path
    }
  }
  
  // Default fallback
  return join(process.cwd(), "..", "listening_file");
}

const LISTENING_FILES_DIR = getListeningFilesDir();

interface LessonFile {
  filename: string;
  segments: Array<{
    start: number;
    end: number;
    text: string;
  }>;
  fullTranscript?: string;
  dictationGaps?: Array<{
    id: string;
    before: string;
    after: string;
    answer: string;
    timestamp: number;
    difficulty: "easy" | "hard";
  }>;
}

/**
 * Get a specific listening lesson by ID
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ lessonId: string }> }
) {
  try {
    const { lessonId } = await params;

    // Search for the lesson file across all directories
    const levels = ["Beginner", "Intermediate", "Advanced"];
    let lessonData: LessonFile | null = null;
    let filePath: string | null = null;
    let level: string | null = null;
    let category: string | null = null;

    for (const levelDir of levels) {
      const levelPath = join(LISTENING_FILES_DIR, levelDir);
      try {
        const entries = await readdir(levelPath, { withFileTypes: true });

        for (const entry of entries) {
          if (entry.isDirectory()) {
            // Check subdirectory (category)
            const categoryPath = join(levelPath, entry.name);
            try {
              const files = await readdir(categoryPath);
              for (const file of files) {
                if (file.endsWith(".json")) {
                  const id = file
                    .replace(".json", "")
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, "-")
                    .replace(/^-+|-+$/g, "");

                  if (id === lessonId) {
                    filePath = join(categoryPath, file);
                    level = levelDir;
                    category = entry.name;
                    break;
                  }
                }
              }
            } catch (error) {
              // Not a directory or can't read
            }
          } else if (entry.isFile() && entry.name.endsWith(".json")) {
            const id = entry.name
              .replace(".json", "")
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/^-+|-+$/g, "");

            if (id === lessonId) {
              filePath = join(levelPath, entry.name);
              level = levelDir;
              break;
            }
          }
        }
      } catch (error) {
        // Level directory doesn't exist
        continue;
      }

      if (filePath) break;
    }

    if (!filePath || !level) {
      return NextResponse.json(
        { error: "Lesson not found" },
        { status: 404 }
      );
    }

    const fileContent = await readFile(filePath, "utf-8");
    lessonData = JSON.parse(fileContent);

    // Generate audio URL - use filename from JSON or derive from file path
    let audioFilename = lessonData.filename;
    if (!audioFilename) {
      // Try to find MP3 file in same directory
      const baseName = filePath.replace(".json", "");
      audioFilename = `${baseName.split(/[/\\]/).pop()}.mp3`;
    }
    
    // Clean filename (remove any path separators)
    audioFilename = audioFilename.split(/[/\\]/).pop() || audioFilename;
    
    const audioUrl = category
      ? `/api/listening/audio/${encodeURIComponent(level)}/${encodeURIComponent(category)}/${encodeURIComponent(audioFilename)}`
      : `/api/listening/audio/${encodeURIComponent(level)}/${encodeURIComponent(audioFilename)}`;

    // Extract title from filename (remove .json extension and clean up)
    const rawTitle = filePath.split(/[/\\]/).pop()?.replace(".json", "") || lessonId;
    // Clean title: remove underscores, fix spacing
    const title = rawTitle
      .replace(/_/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    // Format response
    const response = {
      id: lessonId,
      title: title,
      level,
      category: category || undefined,
      filename: lessonData.filename || audioFilename,
      audioUrl,
      segments: lessonData.segments.map((seg, idx) => ({
        id: `seg-${idx}`,
        start: seg.start,
        end: seg.end,
        text: seg.text,
      })),
      fullTranscript: lessonData.fullTranscript,
      vocabulary: extractVocabulary(lessonData),
      dictation: lessonData.dictationGaps && lessonData.dictationGaps.length > 0
        ? lessonData.dictationGaps
        : extractDictationGaps(lessonData), // Fallback to generating if not in JSON
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching listening lesson:", error);
    return NextResponse.json(
      { error: "Failed to fetch lesson" },
      { status: 500 }
    );
  }
}

/**
 * Extract vocabulary from segments (first few unique words)
 */
function extractVocabulary(lessonData: LessonFile): Array<{
  word: string;
  meaning: string;
}> {
  // Simple extraction - in production, this should come from the JSON file
  const words = new Set<string>();
  lessonData.segments.forEach((seg) => {
    const textWords = seg.text
      .toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 4);
    textWords.slice(0, 3).forEach((w) => words.add(w));
  });

  return Array.from(words)
    .slice(0, 5)
    .map((word) => ({
      word: word.charAt(0).toUpperCase() + word.slice(1),
      meaning: `Definition of ${word}`,
    }));
}

/**
 * Extract dictation gaps from segments
 * Creates gaps from important words in each segment
 */
function extractDictationGaps(lessonData: LessonFile): Array<{
  id: string;
  before: string;
  after: string;
  answer: string;
  timestamp: number;
  difficulty: "easy" | "hard";
}> {
  const gaps: Array<{
    id: string;
    before: string;
    after: string;
    answer: string;
    timestamp: number;
    difficulty: "easy" | "hard";
  }> = [];

  // Common function words to skip (these are usually easy to hear)
  const skipWords = new Set([
    "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with", "by",
    "is", "are", "was", "were", "be", "been", "have", "has", "had", "do", "does", "did",
    "will", "would", "can", "could", "should", "may", "might", "this", "that", "these", "those",
    "i", "you", "he", "she", "it", "we", "they", "me", "him", "her", "us", "them"
  ]);

  // Process segments to create meaningful gaps
  lessonData.segments.forEach((seg, segIdx) => {
    const text = seg.text.trim();
    if (!text || text.length < 10) return; // Skip very short segments

    const words = text.split(/\s+/);
    if (words.length < 3) return; // Need at least 3 words

    // Find important words (nouns, verbs, adjectives) - words that are not in skipWords
    const importantWords: Array<{ word: string; index: number }> = [];
    words.forEach((word, wordIdx) => {
      const cleanWord = word.toLowerCase().replace(/[^\w]/g, "");
      if (cleanWord.length >= 4 && !skipWords.has(cleanWord)) {
        importantWords.push({ word: words[wordIdx], index: wordIdx });
      }
    });

    // Create 1-2 gaps per segment from important words
    if (importantWords.length > 0) {
      // Select 1-2 important words to create gaps
      const numGaps = Math.min(importantWords.length, 2);
      const selectedWords = importantWords.slice(0, numGaps);

      selectedWords.forEach((selected, gapIdx) => {
        const wordIdx = selected.index;
        const before = words.slice(0, wordIdx).join(" ");
        const after = words.slice(wordIdx + 1).join(" ");
        const answer = selected.word.replace(/[^\w\s]/g, ""); // Remove punctuation from answer

        if (answer.length >= 3) {
          gaps.push({
            id: `gap-${segIdx}-${gapIdx}`,
            before: before || "",
            after: after || "",
            answer: answer,
            timestamp: seg.start,
            difficulty: answer.length > 6 || /[^a-z]/i.test(answer) ? "hard" : "easy",
          });
        }
      });
    } else {
      // Fallback: if no important words found, use middle word
      const midIdx = Math.floor(words.length / 2);
      const gapWord = words[midIdx].replace(/[^\w\s]/g, "");
      if (gapWord.length >= 3) {
        gaps.push({
          id: `gap-${segIdx}-0`,
          before: words.slice(0, midIdx).join(" "),
          after: words.slice(midIdx + 1).join(" "),
          answer: gapWord,
          timestamp: seg.start,
          difficulty: gapWord.length > 6 ? "hard" : "easy",
        });
      }
    }
  });

  // Limit to reasonable number of gaps (15-20 for a full lesson)
  return gaps.slice(0, 20);
}

