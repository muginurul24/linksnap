import { Resend } from "resend";

let resend: Resend | null = null;

function getResend(): Resend {
  resend ??= new Resend(process.env.RESEND_API_KEY);
  return resend;
}

export async function sendVerificationEmail({
  to,
  otp,
}: {
  to: string;
  otp: string;
}): Promise<void> {
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
