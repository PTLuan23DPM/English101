import { NextRequest, NextResponse } from "next/server";
import { readdir, readFile } from "fs/promises";
import { join } from "path";

const GRAMMAR_FILES_DIR = join(process.cwd(), "grammar_file");

async function getGrammarFilesDir(): Promise<string> {
  // Try multiple possible locations
  const possiblePaths = [
    GRAMMAR_FILES_DIR,
    join(process.cwd(), "..", "grammar_file"),
    join(process.cwd(), "grammar_file"),
  ];

  for (const path of possiblePaths) {
    try {
      await readdir(path);
      return path;
    } catch {
      continue;
    }
  }

  return GRAMMAR_FILES_DIR;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const level = searchParams.get("level"); // A1-A2, B1-B2, C1

    const lessons: Array<{
      id: string;
      title: string;
      level: string;
      introduction: string;
      exampleCount: number;
      exerciseCount: number;
    }> = [];

    const baseDir = await getGrammarFilesDir();

    async function scanDirectory(dir: string, currentLevel?: string): Promise<void> {
      try {
        const entries = await readdir(dir, { withFileTypes: true });

        for (const entry of entries) {
          const entryPath = join(dir, entry.name);

          if (entry.isFile() && entry.name.endsWith(".json")) {
            try {
              const fileContent = await readFile(entryPath, "utf-8");
              const lessonData = JSON.parse(fileContent);

              let levelFromPath = currentLevel;
              if (!levelFromPath) {
                const pathParts = entryPath.split(/[/\\]/);
                for (let i = pathParts.length - 1; i >= 0; i--) {
                  const part = pathParts[i];
                  if (["A1-A2", "B1-B2", "C1"].includes(part)) {
                    levelFromPath = part;
                    break;
                  }
                }
              }

              if (level && levelFromPath !== level) {
                continue;
              }

              lessons.push({
                id: lessonData.id || entry.name.replace(".json", ""),
                title: lessonData.title || entry.name.replace(".json", ""),
                level: levelFromPath || "Unknown",
                introduction: lessonData.introduction?.substring(0, 200) || "",
                exampleCount: lessonData.examples?.length || 0,
                exerciseCount: lessonData.exercises?.length || 0,
              });
            } catch (error) {
              console.error(`Error reading ${entry.name}:`, error);
            }
          } else if (entry.isDirectory()) {
            let nextLevel = currentLevel;
            if (["A1-A2", "B1-B2", "C1"].includes(entry.name)) {
              nextLevel = entry.name;
            }
            await scanDirectory(entryPath, nextLevel);
          }
        }
      } catch (error) {
        console.error(`Error reading directory ${dir}:`, error);
      }
    }

    await scanDirectory(baseDir, level || undefined);

    // Sort lessons by level
    const levelOrder = { "A1-A2": 1, "B1-B2": 2, "C1": 3 };
    lessons.sort((a, b) => {
      const levelDiff =
        (levelOrder[a.level as keyof typeof levelOrder] || 999) -
        (levelOrder[b.level as keyof typeof levelOrder] || 999);
      if (levelDiff !== 0) return levelDiff;
      return a.title.localeCompare(b.title);
    });

    return NextResponse.json({ lessons });
  } catch (error) {
    console.error("Error fetching grammar lessons:", error);
    return NextResponse.json(
      { error: "Failed to fetch lessons" },
      { status: 500 }
    );
  }
}

