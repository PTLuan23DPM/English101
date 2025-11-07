import { Resend } from "resend";
import { getEnv } from "./env";

// Initialize Resend with validated environment variables
let resend: Resend | null = null;

try {
  const env = getEnv();
  if (env.RESEND_API_KEY) {
    resend = new Resend(env.RESEND_API_KEY);
  }
} catch (error) {
  console.warn("Environment validation failed, email service may not work:", error);
}

// Get FROM email - Resend requires verified domain or uses onboarding@resend.dev for testing
function getFromEmail(): string {
  try {
    const env = getEnv();
    if (env.FROM_EMAIL) {
      return env.FROM_EMAIL;
    }
    // Default to Resend's test email if no domain is configured
    return "onboarding@resend.dev";
  } catch {
    return "onboarding@resend.dev";
  }
}

function getFromName(): string {
  try {
    const env = getEnv();
    return env.FROM_NAME || "English101";
  } catch {
    return "English101";
  }
}

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    const env = getEnv();
    const fromEmail = getFromEmail();
    const fromName = getFromName();

    // In development without API key, log email instead of sending
    if (env.NODE_ENV === "development" && !env.RESEND_API_KEY) {
      console.log("📧 Email (dev mode - not sent):");
      console.log("From:", `${fromName} <${fromEmail}>`);
      console.log("To:", options.to);
      console.log("Subject:", options.subject);
      console.log("Body:", options.text || options.html);
      return true;
    }

    if (!resend) {
      console.warn("⚠️ Resend API key not configured. Email not sent.");
      console.warn("   Set RESEND_API_KEY in your .env file to enable email sending.");
      return false;
    }

    const { data, error } = await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });

    if (error) {
      console.error("❌ Email send error:", error);
      return false;
    }

    console.log("✅ Email sent successfully:", data?.id || "unknown");
    return true;
  } catch (error) {
    console.error("❌ Email service error:", error);
    return false;
  }
}

export async function sendPasswordResetEmail(
  email: string,
  otp: string
): Promise<boolean> {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">🎓 English101</h1>
        </div>
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
          <h2 style="color: #333; margin-top: 0;">Password Reset Request</h2>
          <p>You requested to reset your password. Use the code below to reset your password:</p>
          <div style="background: white; border: 2px dashed #667eea; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
            <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #667eea; font-family: monospace;">
              ${otp}
            </div>
          </div>
          <p style="color: #666; font-size: 14px;">This code will expire in 15 minutes.</p>
          <p style="color: #666; font-size: 14px;">If you didn't request this, please ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #999; font-size: 12px; text-align: center;">
            © ${new Date().getFullYear()} English101. All rights reserved.
          </p>
        </div>
      </body>
    </html>
  `;

  const text = `
Password Reset Request

You requested to reset your password. Use the code below to reset your password:

${otp}

This code will expire in 15 minutes.

If you didn't request this, please ignore this email.

© ${new Date().getFullYear()} English101. All rights reserved.
  `;

  return sendEmail({
    to: email,
    subject: "Password Reset Code - English101",
    html,
    text,
  });
}

