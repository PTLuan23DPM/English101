import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";

export async function GET() {
    try {
        const filePath = join(process.cwd(), "data", "placement-test-questions.json");
        const fileContents = await readFile(filePath, "utf8");
        const questionsData = JSON.parse(fileContents);

        return NextResponse.json(questionsData);
    } catch (error) {
        console.error("Failed to load questions:", error);
        return NextResponse.json(
            { error: "Failed to load questions" },
            { status: 500 }
        );
    }
}

