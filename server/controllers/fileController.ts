/**
 * File Controller
 * Handles business logic for file operations
 */

import { fileService } from "../services/fileService";

export class FileController {
    /**
     * Upload profile image
     */
    async uploadProfileImage(userId: string, file: File) {
        try {
            const imageUrl = await fileService.uploadProfileImage(userId, file);

            return {
                success: true,
                data: {
                    imageUrl,
                    message: "Image uploaded successfully",
                },
            };
        } catch (error: any) {
            console.error("[FileController] Error uploading image:", error);
            throw error;
        }
    }
}

export const fileController = new FileController();

