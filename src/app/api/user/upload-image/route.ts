import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

/**
 * Upload profile image
 * POST /api/user/upload-image
 */
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user || !session.user.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const formData = await req.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json(
                { error: "No file provided" },
                { status: 400 }
            );
        }

        // Validate file type
        const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
        if (!allowedTypes.includes(file.type)) {
            return NextResponse.json(
                { error: "Invalid file type. Only JPEG, PNG, and WebP are allowed" },
                { status: 400 }
            );
        }

        // Validate file size (max 5MB)
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (file.size > maxSize) {
            return NextResponse.json(
                { error: "File size too large. Maximum size is 5MB" },
                { status: 400 }
            );
        }

        // Create uploads directory if it doesn't exist
        const uploadsDir = join(process.cwd(), "public", "uploads", "profiles");
        if (!existsSync(uploadsDir)) {
            await mkdir(uploadsDir, { recursive: true });
        }

        // Generate unique filename
        const userId = session.user.id;
        const timestamp = Date.now();
        const extension = file.name.split(".").pop();
        const filename = `${userId}-${timestamp}.${extension}`;
        const filepath = join(uploadsDir, filename);

        // Convert file to buffer and save
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        await writeFile(filepath, buffer);

        // Return public URL
        const imageUrl = `/uploads/profiles/${filename}`;

        return NextResponse.json({
            success: true,
            imageUrl,
            message: "Image uploaded successfully",
        });
    } catch (error) {
        console.error("[Upload Image API] Error:", error);
        return NextResponse.json(
            { error: "Failed to upload image" },
            { status: 500 }
        );
    }
}

