import { appendFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { Resend } from "resend";

let resend: Resend | null = null;

function getResend(): Resend {
  resend ??= new Resend(process.env.RESEND_API_KEY);
  return resend;
}

async function writeVerificationEmailToFile({
  to,
  otp,
}: {
  to: string;
  otp: string;
}): Promise<void> {
  if (process.env.NODE_ENV === "production") {
    throw new Error("File email delivery is disabled in production.");
  }

  const emailFile = process.env.AUTH_EMAIL_FILE ?? ".e2e/auth-emails.jsonl";
  await mkdir(dirname(emailFile), { recursive: true });
  await appendFile(
    emailFile,
    `${JSON.stringify({
      type: "verification",
      to,
      otp,
      sentAt: new Date().toISOString(),
    })}\n`,
    "utf8",
  );
}

async function writePasswordResetEmailToFile({
  to,
  resetUrl,
}: {
  to: string;
  resetUrl: string;
}): Promise<void> {
  if (process.env.NODE_ENV === "production") {
    throw new Error("File email delivery is disabled in production.");
  }

  const emailFile = process.env.AUTH_EMAIL_FILE ?? ".e2e/auth-emails.jsonl";
  await mkdir(dirname(emailFile), { recursive: true });
  await appendFile(
    emailFile,
    `${JSON.stringify({
      type: "password-reset",
      to,
      resetUrl,
      sentAt: new Date().toISOString(),
    })}\n`,
    "utf8",
  );
}

export async function sendVerificationEmail({
  to,
  otp,
}: {
  to: string;
  otp: string;
}): Promise<void> {
  if (process.env.AUTH_EMAIL_DELIVERY === "file") {
    await writeVerificationEmailToFile({ to, otp });
    return;
  }

  const { error } = await getResend().emails.send({
    from: process.env.RESEND_FROM_EMAIL ?? "LinkSnap <onboarding@resend.dev>",
    to,
    subject: "Verify your LinkSnap email",
    text: `Your LinkSnap verification code is ${otp}. It expires in 10 minutes.`,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function sendPasswordResetEmail({
  to,
  resetUrl,
}: {
  to: string;
  resetUrl: string;
}): Promise<void> {
  if (process.env.AUTH_EMAIL_DELIVERY === "file") {
    await writePasswordResetEmailToFile({ to, resetUrl });
    return;
  }

  const { error } = await getResend().emails.send({
    from: process.env.RESEND_FROM_EMAIL ?? "LinkSnap <onboarding@resend.dev>",
    to,
    subject: "Reset your LinkSnap password",
    text: `Reset your LinkSnap password here: ${resetUrl}. This link expires in 1 hour.`,
  });

  if (error) {
    throw new Error(error.message);
  }
}
