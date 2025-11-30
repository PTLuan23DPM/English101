import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
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

/**
 * Serve audio files from listening_file directory
 * Path format: /api/listening/audio/[level]/[category?]/[filename]
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: pathArray } = await params;

    if (!pathArray || pathArray.length === 0) {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 });
    }

    // Decode path components and reconstruct file path
    const decodedPath = pathArray.map((p) => decodeURIComponent(p));
    const filePath = join(LISTENING_FILES_DIR, ...decodedPath);

    // Security: Ensure path is within LISTENING_FILES_DIR (normalize paths for comparison)
    const normalizedFilePath = join(LISTENING_FILES_DIR, ...decodedPath);
    const normalizedBaseDir = join(LISTENING_FILES_DIR);
    
    if (!normalizedFilePath.startsWith(normalizedBaseDir)) {
      return NextResponse.json({ error: "Invalid path" }, { status: 403 });
    }

    try {
      const audioBuffer = await readFile(filePath);

      // Determine content type from file extension
      const ext = filePath.split(".").pop()?.toLowerCase();
      let contentType = "audio/mpeg";
      if (ext === "mp3") contentType = "audio/mpeg";
      else if (ext === "wav") contentType = "audio/wav";
      else if (ext === "ogg") contentType = "audio/ogg";
      else if (ext === "m4a") contentType = "audio/mp4";

      return new NextResponse(audioBuffer as any, {
        headers: {
          "Content-Type": contentType,
          "Content-Length": audioBuffer.length.toString(),
          "Accept-Ranges": "bytes",
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    } catch (error) {
      console.error(`Error reading audio file ${filePath}:`, error);
      return NextResponse.json(
        { error: "Audio file not found" },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error("Error serving audio file:", error);
    return NextResponse.json(
      { error: "Failed to serve audio file" },
      { status: 500 }
    );
  }
}

