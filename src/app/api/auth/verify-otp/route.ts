import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { email, otp } = await req.json();

    if (!email || !otp) {
      return NextResponse.json(
        { error: "Email and OTP are required" },
        { status: 400 }
      );
    }

    // Find the password reset request
    const resetRequest = await prisma.passwordReset.findFirst({
      where: {
        email,
        otp,
      },
    });

    if (!resetRequest) {
      return NextResponse.json(
        { error: "Invalid reset code" },
        { status: 400 }
      );
    }

    // Check if OTP has expired
    if (new Date() > resetRequest.expiresAt) {
      await prisma.passwordReset.delete({
        where: { id: resetRequest.id },
      });
      return NextResponse.json(
        { error: "Reset code has expired. Please request a new one." },
        { status: 400 }
      );
    }

    // Check if already verified
    if (resetRequest.verified) {
      return NextResponse.json(
        { error: "This code has already been used" },
        { status: 400 }
      );
    }

    // Mark as verified
    await prisma.passwordReset.update({
      where: { id: resetRequest.id },
      data: { verified: true },
    });

    return NextResponse.json({
      message: "OTP verified successfully",
    });
  } catch (error) {
    console.error("Verify OTP error:", error);
    return NextResponse.json(
      { error: "Failed to verify OTP" },
      { status: 500 }
    );
  }
}
