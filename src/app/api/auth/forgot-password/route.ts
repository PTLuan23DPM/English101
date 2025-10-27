import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Generate random 6-digit OTP
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json(
        { error: "No account found with this email" },
        { status: 404 }
      );
    }

    // Generate OTP
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Delete old OTPs for this email
    await prisma.passwordReset.deleteMany({
      where: { email },
    });

    // Save OTP to database
    await prisma.passwordReset.create({
      data: {
        email,
        otp,
        expiresAt,
      },
    });

    // TODO: Send email with OTP using nodemailer or email service
    // For now, we'll just log it
    console.log(`[OTP for ${email}]: ${otp}`);
    
    // In production, use a service like Resend, SendGrid, or nodemailer:
    // await sendEmail({
    //   to: email,
    //   subject: "Password Reset Code - English101",
    //   text: `Your password reset code is: ${otp}\n\nThis code will expire in 10 minutes.`,
    // });

    return NextResponse.json(
      {
        message: "OTP sent successfully",
        // Remove this in production! Only for development
        dev_otp: process.env.NODE_ENV === "development" ? otp : undefined,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

