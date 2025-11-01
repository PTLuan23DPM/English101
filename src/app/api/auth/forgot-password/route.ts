import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

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
      });
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

    // TODO: Send email with OTP
    // For now, log it to console (in production, use a proper email service)
    console.log(`Password Reset OTP for ${email}: ${otp}`);
    console.log(`OTP expires at: ${expiresAt.toISOString()}`);

    return NextResponse.json({
      message: "Reset code sent successfully",
      // In development, you might want to include the OTP for testing
      ...(process.env.NODE_ENV === "development" && { dev_otp: otp }),
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}
