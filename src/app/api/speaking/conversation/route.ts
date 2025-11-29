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
    // Check both Speaking and Beginner_Speaking folders
    const basePaths = [
      path.join("c:", "Users", "ADMIN", "Desktop", "listening_file", "Speaking"),
      path.join("c:", "Users", "ADMIN", "Desktop", "listening_file", "Beginner_Speaking"),
    ];
    
    let filePath: string | null = null;
    
    // Try each base path
    for (const basePath of basePaths) {
      let testPath = path.join(basePath, filename);
      
      if (fs.existsSync(testPath)) {
        filePath = testPath;
        break;
      }
      
      // Try alternative filename format
      const altFilename = filename.replace(/^Lesson \d+ /, "").replace(/ /g, "_");
      testPath = path.join(basePath, altFilename);
      if (fs.existsSync(testPath)) {
        filePath = testPath;
        break;
      }
      
      // Try with "Lesson X Title.json" format
      const lessonFilename = filename.includes("_speaking") 
        ? filename.replace("_speaking.json", ".json")
        : filename;
      testPath = path.join(basePath, lessonFilename);
      if (fs.existsSync(testPath)) {
        filePath = testPath;
        break;
      }
    }

    // Check if file exists
    if (!filePath || !fs.existsSync(filePath)) {
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
      segments: data.segments || [], // Include segments with speaker names and timestamps
      filename: data.filename || data.original_filename || "", // Include audio filename
    });
  } catch (error) {
    console.error("Error loading conversation:", error);
    return NextResponse.json(
      { error: "Failed to load conversation" },
      { status: 500 }
    );
  }
}

