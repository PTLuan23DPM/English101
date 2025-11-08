import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/lib/email";

// Generate a random 6-digit OTP
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // For security, don't reveal if email exists or not
      return NextResponse.json({
        message: "If an account with that email exists, we've sent a reset code."
      }, { status: 200 });
    }

    // Check for password auth (not Google OAuth)
    if (!user.password) {
      return NextResponse.json(
        { error: "This account uses Google login. Password reset is not available." },
        { status: 400 }
      );
    }

    // Generate OTP
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes from now

    // Delete any existing password reset requests for this email
    await prisma.passwordReset.deleteMany({
      where: { email },
    });

    // Create new password reset record
    await prisma.passwordReset.create({
      data: {
        email,
        otp,
        expiresAt,
        verified: false,
      },
    });

    // Send email with OTP
    const emailSent = await sendPasswordResetEmail(email, otp);

    // In development, include OTP in response for testing
    interface ResponseType {
      message: string;
      dev_otp?: string;
      dev_note?: string;
    }
    const response: ResponseType = {
      message: "Reset code sent successfully",
    };

    if (process.env.NODE_ENV === "development") {
      response.dev_otp = otp;
      if (!emailSent) {
        response.dev_note = "Email service not configured. OTP logged in console above.";
      } else {
        response.dev_note = "Email sent successfully (check your email inbox).";
      }
    } else {
      // In production, always return success for security (don't reveal if email was sent)
      // But log errors for debugging
      if (!emailSent) {
        console.error(`[PRODUCTION] Failed to send password reset email to ${email}`);
      }
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}
