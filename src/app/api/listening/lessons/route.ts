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
}

/**
 * Get all listening lessons from JSON files
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const level = searchParams.get("level"); // Beginner, Intermediate, Advanced
    const category = searchParams.get("category"); // Arts & Culture, Health & Lifestyle, etc.

    const lessons: Array<{
      id: string;
      title: string;
      level: string;
      category?: string;
      filename: string;
      audioUrl: string;
      duration?: number;
      segmentCount: number;
      hasTranscript: boolean;
    }> = [];

    // Determine base directory
    let baseDir = LISTENING_FILES_DIR;
    if (level) {
      baseDir = join(baseDir, level);
    }

    // If category is specified, add it to path
    if (category && level) {
      baseDir = join(baseDir, category);
    }

    // Read directory
    try {
      const entries = await readdir(baseDir, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isFile() && entry.name.endsWith(".json")) {
          try {
            const filePath = join(baseDir, entry.name);
            const fileContent = await readFile(filePath, "utf-8");
            const lessonData: LessonFile = JSON.parse(fileContent);

            // Extract title from filename (remove .json extension and clean up)
            const rawTitle = entry.name.replace(".json", "");
            const title = rawTitle
              .replace(/_/g, " ")
              .replace(/\s+/g, " ")
              .trim();

            // Generate ID from filename
            const id = rawTitle
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/^-+|-+$/g, "");

            // Determine level and category from path
            const pathParts = baseDir.split(/[/\\]/);
            const levelFromPath =
              pathParts[pathParts.length - (category ? 2 : 1)] || "Unknown";
            const categoryFromPath = category || undefined;

            // Calculate duration from segments
            const duration =
              lessonData.segments.length > 0
                ? Math.max(...lessonData.segments.map((s) => s.end))
                : undefined;

            // Generate audio URL (assuming MP3 files are in same directory)
            let audioFilename = lessonData.filename;
            if (!audioFilename) {
              audioFilename = entry.name.replace(".json", ".mp3");
            }
            // Clean filename (remove path if present)
            audioFilename = audioFilename.split(/[/\\]/).pop() || audioFilename;
            const audioUrl = `/api/listening/audio/${encodeURIComponent(levelFromPath)}/${encodeURIComponent(audioFilename)}`;

            lessons.push({
              id,
              title,
              level: levelFromPath,
              category: categoryFromPath,
              filename: entry.name,
              audioUrl,
              duration,
              segmentCount: lessonData.segments.length,
              hasTranscript: !!lessonData.fullTranscript,
            });
          } catch (error) {
            console.error(`Error reading ${entry.name}:`, error);
          }
        } else if (entry.isDirectory() && !level) {
          // If no level specified, recursively read subdirectories
          const subDir = join(baseDir, entry.name);
          try {
            const subEntries = await readdir(subDir, { withFileTypes: true });
            for (const subEntry of subEntries) {
              if (subEntry.isFile() && subEntry.name.endsWith(".json")) {
                try {
                  const filePath = join(subDir, subEntry.name);
                  const fileContent = await readFile(filePath, "utf-8");
                  const lessonData: LessonFile = JSON.parse(fileContent);

                  const rawTitle = subEntry.name.replace(".json", "");
                  const title = rawTitle
                    .replace(/_/g, " ")
                    .replace(/\s+/g, " ")
                    .trim();
                  
                  const id = rawTitle
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, "-")
                    .replace(/^-+|-+$/g, "");

                  const pathParts = subDir.split(/[/\\]/);
                  const levelFromPath = pathParts[pathParts.length - 2] || "Unknown";
                  const categoryFromPath = entry.name;

                  const duration =
                    lessonData.segments.length > 0
                      ? Math.max(...lessonData.segments.map((s) => s.end))
                      : undefined;

                  let audioFilename = lessonData.filename;
                  if (!audioFilename) {
                    audioFilename = subEntry.name.replace(".json", ".mp3");
                  }
                  // Clean filename (remove path if present)
                  audioFilename = audioFilename.split(/[/\\]/).pop() || audioFilename;
                  const audioUrl = `/api/listening/audio/${encodeURIComponent(levelFromPath)}/${encodeURIComponent(categoryFromPath)}/${encodeURIComponent(audioFilename)}`;

                  lessons.push({
                    id,
                    title,
                    level: levelFromPath,
                    category: categoryFromPath,
                    filename: subEntry.name,
                    audioUrl,
                    duration,
                    segmentCount: lessonData.segments.length,
                    hasTranscript: !!lessonData.fullTranscript,
                  });
                } catch (error) {
                  console.error(`Error reading ${subEntry.name}:`, error);
                }
              }
            }
          } catch (error) {
            console.error(`Error reading subdirectory ${entry.name}:`, error);
          }
        }
      }
    } catch (error) {
      // Directory might not exist
      console.error(`Error reading directory ${baseDir}:`, error);
    }

    // Sort lessons: Beginner -> Intermediate -> Advanced, then by title
    const levelOrder = { Beginner: 1, Intermediate: 2, Advanced: 3 };
    lessons.sort((a, b) => {
      const levelDiff = (levelOrder[a.level as keyof typeof levelOrder] || 999) - 
                       (levelOrder[b.level as keyof typeof levelOrder] || 999);
      if (levelDiff !== 0) return levelDiff;
      
      // Within same level, sort by category if available, then by title
      if (a.category && b.category) {
        const catDiff = a.category.localeCompare(b.category);
        if (catDiff !== 0) return catDiff;
      }
      
      return a.title.localeCompare(b.title);
    });

    return NextResponse.json({ lessons });
  } catch (error) {
    console.error("Error fetching listening lessons:", error);
    return NextResponse.json(
      { error: "Failed to fetch lessons" },
      { status: 500 }
    );
  }
}

