import { NextRequest, NextResponse } from "next/server";
import { readFile, readdir, access } from "fs/promises";
import { join } from "path";
import { constants } from "fs";

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
 * Check if MP3 file exists
 */
async function audioFileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Find MP3 file for a JSON lesson file
 * Handles various naming patterns: underscores vs quotes, different quote styles, etc.
 */
async function findAudioFile(
  jsonPath: string,
  jsonFilename: string,
  lessonData: LessonFile,
  level: string,
  category?: string
): Promise<string | null> {
  const { dirname } = require("path");
  const dir = dirname(jsonPath);
  
  // Try multiple possible MP3 filenames
  const candidates: string[] = [];
  const baseName = jsonFilename.replace(".json", "");
  
  // 1. Use filename from JSON if available
  if (lessonData.filename) {
    const cleanFilename = lessonData.filename.split(/[/\\]/).pop() || lessonData.filename;
    candidates.push(join(dir, cleanFilename));
  }
  
  // 2. Exact match: replace .json with .mp3
  candidates.push(join(dir, baseName + ".mp3"));
  
  // 3. Replace underscores with single quotes (common pattern)
  candidates.push(join(dir, baseName.replace(/_/g, "'") + ".mp3"));
  
  // 4. Replace underscores with spaces
  candidates.push(join(dir, baseName.replace(/_/g, " ") + ".mp3"));
  
  // 5. Replace single quotes with underscores (reverse)
  candidates.push(join(dir, baseName.replace(/'/g, "_") + ".mp3"));
  
  // 6. Try with leading/trailing underscores/quotes removed
  const trimmedBase = baseName.replace(/^[_']+|[_']+$/g, "");
  candidates.push(join(dir, trimmedBase + ".mp3"));
  candidates.push(join(dir, "'" + trimmedBase + "'" + ".mp3"));
  candidates.push(join(dir, "_" + trimmedBase + "_" + ".mp3"));
  
  // 7. Try all MP3 files in directory and match by similarity (fuzzy match)
  try {
    const fs = require("fs");
    const files = await readdir(dir);
    const mp3Files = files.filter((f: string) => f.toLowerCase().endsWith(".mp3"));
    
    // Normalize both names for comparison (remove special chars, lowercase)
    const normalize = (str: string) => 
      str.toLowerCase()
         .replace(/[^a-z0-9]/g, "")
         .replace(/\s+/g, "");
    
    const normalizedBase = normalize(baseName);
    
    for (const mp3File of mp3Files) {
      const normalizedMp3 = normalize(mp3File.replace(".mp3", ""));
      // If normalized names match (or are very similar), use this MP3
      if (normalizedMp3 === normalizedBase || 
          normalizedMp3.includes(normalizedBase) || 
          normalizedBase.includes(normalizedMp3)) {
        candidates.push(join(dir, mp3File));
      }
    }
  } catch (error) {
    // If directory read fails, continue with other candidates
  }
  
  // Remove duplicates
  const uniqueCandidates = Array.from(new Set(candidates));
  
  // Check each candidate
  for (const candidate of uniqueCandidates) {
    if (await audioFileExists(candidate)) {
      return candidate;
    }
  }
  
  return null;
}

/**
 * Get all listening lessons from JSON files
 * Only returns lessons that have both JSON and MP3 files
 * 
 * Query parameters:
 * - level: Beginner, Intermediate, Advanced
 * - category: Arts & Culture, Health & Lifestyle, etc.
 * - hasTranscript: true/false - filter by transcript availability
 * - minDuration: minimum duration in seconds
 * - maxDuration: maximum duration in seconds
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const level = searchParams.get("level"); // Beginner, Intermediate, Advanced
    const category = searchParams.get("category"); // Arts & Culture, Health & Lifestyle, etc.
    const hasTranscriptFilter = searchParams.get("hasTranscript"); // true/false
    const minDuration = searchParams.get("minDuration") ? parseInt(searchParams.get("minDuration")!) : undefined;
    const maxDuration = searchParams.get("maxDuration") ? parseInt(searchParams.get("maxDuration")!) : undefined;

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

    /**
     * Recursively scan directory for JSON files
     */
    async function scanDirectory(
      dir: string,
      currentLevel?: string,
      currentCategory?: string
    ): Promise<void> {
      try {
        const entries = await readdir(dir, { withFileTypes: true });

        for (const entry of entries) {
          const entryPath = join(dir, entry.name);

          if (entry.isFile() && entry.name.endsWith(".json")) {
            try {
              const fileContent = await readFile(entryPath, "utf-8");
              const lessonData: LessonFile = JSON.parse(fileContent);

              // Extract title from filename
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
              const pathParts = entryPath.split(/[/\\]/);
              let levelFromPath = currentLevel;
              let categoryFromPath = currentCategory;

              // Try to extract level from path (Beginner, Intermediate, Advanced)
              if (!levelFromPath) {
                for (let i = pathParts.length - 1; i >= 0; i--) {
                  const part = pathParts[i];
                  if (["Beginner", "Intermediate", "Advanced"].includes(part)) {
                    levelFromPath = part;
                    break;
                  }
                }
              }

              // Try to extract category from path (if not at root level)
              if (!categoryFromPath && levelFromPath) {
                const levelIndex = pathParts.indexOf(levelFromPath);
                if (levelIndex >= 0 && levelIndex < pathParts.length - 2) {
                  // Category is the directory after level
                  categoryFromPath = pathParts[levelIndex + 1];
                }
              }

              // Apply level filter if specified
              if (level && levelFromPath !== level) {
                continue;
              }

              // Apply category filter if specified
              if (category && categoryFromPath !== category) {
                continue;
              }

              // Calculate duration from segments
              const duration =
                lessonData.segments.length > 0
                  ? Math.max(...lessonData.segments.map((s) => s.end))
                  : undefined;

              // Verify MP3 file exists
              const audioFilePath = await findAudioFile(
                entryPath,
                entry.name,
                lessonData,
                levelFromPath || "Unknown",
                categoryFromPath
              );

              if (!audioFilePath) {
                console.warn(`Skipping ${entry.name}: No MP3 file found`);
                continue; // Skip lessons without audio
              }

              // Extract audio filename for URL
              const audioFilename = audioFilePath.split(/[/\\]/).pop() || "";
              let audioUrl: string;
              if (categoryFromPath) {
                audioUrl = `/api/listening/audio/${encodeURIComponent(levelFromPath || "Unknown")}/${encodeURIComponent(categoryFromPath)}/${encodeURIComponent(audioFilename)}`;
              } else {
                audioUrl = `/api/listening/audio/${encodeURIComponent(levelFromPath || "Unknown")}/${encodeURIComponent(audioFilename)}`;
              }

              const hasTranscript = !!lessonData.fullTranscript;

              // Apply filters
              if (hasTranscriptFilter !== null) {
                const filterValue = hasTranscriptFilter === "true";
                if (hasTranscript !== filterValue) {
                  continue; // Skip if doesn't match transcript filter
                }
              }

              if (minDuration !== undefined && duration !== undefined && duration < minDuration) {
                continue; // Skip if duration too short
              }

              if (maxDuration !== undefined && duration !== undefined && duration > maxDuration) {
                continue; // Skip if duration too long
              }

              lessons.push({
                id,
                title,
                level: levelFromPath || "Unknown",
                category: categoryFromPath,
                filename: entry.name,
                audioUrl,
                duration,
                segmentCount: lessonData.segments.length,
                hasTranscript,
              });
            } catch (error) {
              console.error(`Error reading ${entry.name}:`, error);
            }
          } else if (entry.isDirectory()) {
            // Recursively scan subdirectories
            // Update level if this directory is a level directory
            let nextLevel = currentLevel;
            if (["Beginner", "Intermediate", "Advanced"].includes(entry.name)) {
              nextLevel = entry.name;
            }

            // Update category if we're inside a level directory
            let nextCategory = currentCategory;
            if (nextLevel && !nextCategory && entry.name !== nextLevel) {
              nextCategory = entry.name;
            }

            await scanDirectory(entryPath, nextLevel, nextCategory);
          }
        }
      } catch (error) {
        console.error(`Error reading directory ${dir}:`, error);
      }
    }

    // Start recursive scan from base directory
    const baseDir = level
      ? category
        ? join(LISTENING_FILES_DIR, level, category)
        : join(LISTENING_FILES_DIR, level)
      : LISTENING_FILES_DIR;

    await scanDirectory(baseDir, level || undefined, category || undefined);

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

