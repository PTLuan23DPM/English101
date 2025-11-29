import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const filename = searchParams.get("file");

    if (!filename) {
      return NextResponse.json(
        { error: "Filename parameter is required" },
        { status: 400 }
      );
    }

    // Path to the speaking JSON files
    // Use absolute path
    // Handle both old and new filename formats
    let filePath = path.join(
      "c:",
      "Users",
      "ADMIN",
      "Desktop",
      "listening_file",
      "Beginner_Speaking",
      filename
    );
    
    // If file doesn't exist, try alternative filename format
    if (!fs.existsSync(filePath)) {
      // Try converting "Lesson X Title_speaking.json" to "X_Title_speaking.json"
      const altFilename = filename.replace(/^Lesson \d+ /, "").replace(/ /g, "_");
      const altPath = path.join(
        "c:",
        "Users",
        "ADMIN",
        "Desktop",
        "listening_file",
        "Beginner_Speaking",
        altFilename
      );
      if (fs.existsSync(altPath)) {
        filePath = altPath;
      }
    }

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        { error: "Conversation file not found" },
        { status: 404 }
      );
    }

    // Read and parse JSON file
    const fileContent = fs.readFileSync(filePath, "utf-8");
    const data = JSON.parse(fileContent);

    return NextResponse.json({
      conversation: data.conversation || [],
      fullText: data.full_text || "",
      title: data.title || "",
      segments: data.segments || [], // Include segments with speaker names
    });
  } catch (error) {
    console.error("Error loading conversation:", error);
    return NextResponse.json(
      { error: "Failed to load conversation" },
      { status: 500 }
    );
  }
}

