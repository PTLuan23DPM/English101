import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: pathArray } = await params;
    const filename = pathArray.join("/");

    if (!filename) {
      return NextResponse.json(
        { error: "Filename parameter is required" },
        { status: 400 }
      );
    }

    // Path to the speaking audio files
    const basePaths = [
      path.join("c:", "Users", "ADMIN", "Desktop", "listening_file", "Speaking"),
      path.join("c:", "Users", "ADMIN", "Desktop", "listening_file", "Beginner"),
    ];

    let filePath: string | null = null;

    // Try each base path
    for (const basePath of basePaths) {
      const testPath = path.join(basePath, filename);
      if (fs.existsSync(testPath)) {
        filePath = testPath;
        break;
      }
    }

    if (!filePath || !fs.existsSync(filePath)) {
      return NextResponse.json(
        { error: "Audio file not found" },
        { status: 404 }
      );
    }

    // Read audio file
    const audioBuffer = fs.readFileSync(filePath);

    // Determine content type
    const ext = path.extname(filename).toLowerCase();
    const contentType =
      ext === ".mp3"
        ? "audio/mpeg"
        : ext === ".wav"
        ? "audio/wav"
        : ext === ".webm"
        ? "audio/webm"
        : "audio/mpeg";

    // Return audio file
    return new NextResponse(audioBuffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Length": audioBuffer.length.toString(),
        "Accept-Ranges": "bytes",
      },
    });
  } catch (error) {
    console.error("Error serving audio file:", error);
    return NextResponse.json(
      { error: "Failed to serve audio file" },
      { status: 500 }
    );
  }
}

