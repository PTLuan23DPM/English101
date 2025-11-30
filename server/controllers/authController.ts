/**
 * Auth Controller
 * Handles business logic for authentication
 */

import { userService } from "../services/userService";

export class AuthController {
    /**
     * Register new user
     */
    async register(data: { name?: string; email: string; password: string }) {
        try {
            // Validation
            if (!data.email || !data.password) {
                throw new Error("Email and password are required");
            }

            if (data.password.length < 8) {
                throw new Error("Password must be at least 8 characters");
            }

            // Check if user already exists
            const existingUser = await userService.getUserByEmail(data.email);
            if (existingUser) {
                throw new Error("User with this email already exists");
            }

            // Create user
            const user = await userService.createUser({
                name: data.name || data.email.split("@")[0],
                email: data.email,
                password: data.password,
            });

            return {
                success: true,
                message: "User created successfully",
                data: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                },
            };
        } catch (error) {
            console.error("[AuthController] Error registering user:", error);
            throw error;
        }
    }
}

export const authController = new AuthController();

