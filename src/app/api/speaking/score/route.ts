import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get("audio") as File;
    const referenceText = formData.get("referenceText") as string;
    const mode = formData.get("mode") as string; // "roleplay", "shadowing", "dubbing"

    if (!audioFile || !referenceText) {
      return NextResponse.json(
        { error: "Audio file and reference text are required" },
        { status: 400 }
      );
    }

    // Convert File to buffer
    const arrayBuffer = await audioFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Call Python speaking scorer service (unified service on port 8080)
    const pythonServiceUrl = process.env.PYTHON_SERVICE_URL || "http://localhost:8080";
    
    // Check if service is available first
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
      const healthCheck = await fetch(`${pythonServiceUrl}/health`, {
        method: "GET",
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!healthCheck.ok) {
        return NextResponse.json(
          { error: "Speaking service is not available", details: "Health check failed" },
          { status: 503 }
        );
      }
    } catch (healthError) {
      console.error("Health check failed:", healthError);
      const errorMessage = healthError instanceof Error ? healthError.message : "Connection failed";
        return NextResponse.json(
          { 
            error: "Speaking service is not running", 
            details: `Please start the Python service (ai_scorer.py) on port 8080. Error: ${errorMessage}` 
          },
          { status: 503 }
        );
    }
    
    // Create FormData for Python service
    // Note: In Node.js, we need to use a different approach for FormData
    const formDataForPython = new FormData();
    formDataForPython.append("audio", audioFile);
    formDataForPython.append("prompt", referenceText);
    formDataForPython.append("referenceText", referenceText);
    formDataForPython.append("mode", mode || "roleplay");

    try {
      const response = await fetch(`${pythonServiceUrl}/score-speech`, {
        method: "POST",
        body: formDataForPython,
      });

      if (!response.ok) {
        let errorText = "Unknown error";
        let errorData = null;
        
        try {
          const contentType = response.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            errorData = await response.json();
            errorText = errorData.error || errorData.message || JSON.stringify(errorData);
          } else {
            errorText = await response.text();
          }
        } catch (e) {
          errorText = `HTTP ${response.status}: ${response.statusText}`;
        }
        
        console.error("Python service error:", {
          status: response.status,
          statusText: response.statusText,
          error: errorText,
          data: errorData
        });
        
        return NextResponse.json(
          { 
            error: errorData?.error || "Scoring failed", 
            details: errorData?.details || errorText,
            status: response.status 
          },
          { status: response.status || 500 }
        );
      }

      const result = await response.json();
      return NextResponse.json(result);
    } catch (fetchError) {
      console.error("Fetch error:", fetchError);
      return NextResponse.json(
        { error: "Failed to connect to scoring service", details: fetchError instanceof Error ? fetchError.message : "Connection error" },
        { status: 503 }
      );
    }

  } catch (error) {
    console.error("Error scoring speaking:", error);
    return NextResponse.json(
      { error: "Failed to score speaking", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

