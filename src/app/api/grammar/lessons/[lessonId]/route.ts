import { NextRequest, NextResponse } from "next/server";
import { readdir, readFile } from "fs/promises";
import { join } from "path";

const GRAMMAR_FILES_DIR = join(process.cwd(), "grammar_file");

async function getGrammarFilesDir(): Promise<string> {
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

export async function GET(
  req: NextRequest,
  { params }: { params: { lessonId: string } }
) {
  try {
    const lessonId = params.lessonId;
    const baseDir = await getGrammarFilesDir();

    async function findLesson(dir: string): Promise<any> {
      try {
        const entries = await readdir(dir, { withFileTypes: true });

        for (const entry of entries) {
          const entryPath = join(dir, entry.name);

          if (entry.isFile() && entry.name.endsWith(".json")) {
            const fileId = entry.name.replace(".json", "");
            if (fileId === lessonId || fileId.includes(lessonId)) {
              const fileContent = await readFile(entryPath, "utf-8");
              return JSON.parse(fileContent);
            }
          } else if (entry.isDirectory()) {
            const result = await findLesson(entryPath);
            if (result) return result;
          }
        }
      } catch (error) {
        console.error(`Error reading directory ${dir}:`, error);
      }
      return null;
    }

    const lesson = await findLesson(baseDir);

    if (!lesson) {
      return NextResponse.json(
        { error: "Lesson not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(lesson);
  } catch (error) {
    console.error("Error fetching grammar lesson:", error);
    return NextResponse.json(
      { error: "Failed to fetch lesson" },
      { status: 500 }
    );
  }
}

