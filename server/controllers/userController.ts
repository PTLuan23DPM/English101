/**
 * User Controller
 * Handles business logic for users
 */

import { userService } from "../services/userService";

export class UserController {
    /**
     * Get user profile
     */
    async getProfile(userId: string) {
        try {
            const user = await userService.getUserById(userId);

            if (!user) {
                throw new Error("User not found");
            }

            // Remove password from response
            const { password, ...userWithoutPassword } = user;

            return {
                success: true,
                data: userWithoutPassword,
            };
        } catch (error) {
            console.error("[UserController] Error fetching profile:", error);
            throw error;
        }
    }

    /**
     * Update user profile
     */
    async updateProfile(
        userId: string,
        data: {
            name?: string;
            email?: string;
            image?: string;
            currentPassword?: string;
            newPassword?: string;
        },
        currentUser: { name?: string | null; email?: string | null }
    ) {
        try {
            const user = await userService.getUserById(userId);

            if (!user) {
                throw new Error("User not found");
            }

            const updateData: any = {};

            // Update name
            if (data.name && data.name !== currentUser.name) {
                updateData.name = data.name;
            }

            // Update image
            if (data.image) {
                updateData.image = data.image;
            }

            // Update email
            if (data.email && data.email !== user.email) {
                const isEmailTaken = await userService.isEmailTaken(data.email, userId);
                if (isEmailTaken) {
                    throw new Error("Email already in use");
                }
                updateData.email = data.email;
            }

            // Update password
            if (data.newPassword) {
                if (!data.currentPassword) {
                    throw new Error("Current password is required to set a new password");
                }

                if (!user.password) {
                    throw new Error("Cannot update password for OAuth accounts");
                }

                const isPasswordValid = await userService.comparePassword(
                    data.currentPassword,
                    user.password
                );

                if (!isPasswordValid) {
                    throw new Error("Current password is incorrect");
                }

                updateData.password = await userService.hashPassword(data.newPassword);
            }

            // Update user if there are changes
            if (Object.keys(updateData).length > 0) {
                const updatedUser = await userService.updateUser(userId, updateData);

                return {
                    success: true,
                    message: "Profile updated successfully",
                    data: updatedUser,
                };
            }

            return {
                success: true,
                message: "No changes to update",
            };
        } catch (error) {
            console.error("[UserController] Error updating profile:", error);
            throw error;
        }
    }

    /**
     * Get user stats
     */
    async getStats(userId: string) {
        try {
            const stats = await userService.getUserStats(userId);

            return {
                success: true,
                data: stats,
            };
        } catch (error) {
            console.error("[UserController] Error fetching stats:", error);
            throw error;
        }
    }
}

export const userController = new UserController();

