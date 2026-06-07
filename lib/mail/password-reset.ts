interface PasswordResetEmailParams {
  email: string;
  resetUrl: string;
}

export async function sendPasswordResetEmail({
  email,
  resetUrl,
}: PasswordResetEmailParams): Promise<void> {
  if (process.env.NODE_ENV === "production") {
    throw new Error("SMTP provider belum dikonfigurasi.");
  }

  console.info(`[PreDrip] Password reset untuk ${email}: ${resetUrl}`);
}
