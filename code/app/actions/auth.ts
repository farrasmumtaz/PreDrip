"use server";

import { Prisma } from "@prisma/client";
import { redirect } from "next/navigation";

import { createSession, destroyCurrentSession } from "@/lib/auth/session";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from "@/lib/auth/validators";
import { addMinutes, createPlainToken, hashToken } from "@/lib/auth/tokens";
import { sendPasswordResetEmail } from "@/lib/mail/password-reset";
import { prisma } from "@/lib/prisma";

function readFormValue(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function redirectWithError(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

function redirectWithSuccess(path: string, message: string): never {
  redirect(`${path}?success=${encodeURIComponent(message)}`);
}

export async function registerAction(formData: FormData): Promise<void> {
  const parsed = registerSchema.safeParse({
    name: readFormValue(formData, "name"),
    email: readFormValue(formData, "email"),
    password: readFormValue(formData, "password"),
    homeAddress: readFormValue(formData, "homeAddress") || undefined,
  });

  if (!parsed.success) {
    redirectWithError("/register", parsed.error.issues[0]?.message ?? "Input tidak valid.");
  }

  const passwordHash = await hashPassword(parsed.data.password);

  try {
    const user = await prisma.user.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email.toLowerCase(),
        passwordHash,
        homeAddress: parsed.data.homeAddress,
      },
      select: {
        id: true,
      },
    });

    await createSession(user.id);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      redirectWithError("/register", "Email sudah terdaftar.");
    }

    throw error;
  }

  redirect("/dashboard");
}

export async function loginAction(formData: FormData): Promise<void> {
  const parsed = loginSchema.safeParse({
    email: readFormValue(formData, "email"),
    password: readFormValue(formData, "password"),
  });

  if (!parsed.success) {
    redirectWithError("/login", parsed.error.issues[0]?.message ?? "Input tidak valid.");
  }

  const user = await prisma.user.findUnique({
    where: {
      email: parsed.data.email.toLowerCase(),
    },
    select: {
      id: true,
      passwordHash: true,
    },
  });

  if (!user) {
    redirectWithError("/login", "Email atau password salah.");
  }

  const isValidPassword = await verifyPassword(
    parsed.data.password,
    user.passwordHash,
  );

  if (!isValidPassword) {
    redirectWithError("/login", "Email atau password salah.");
  }

  await createSession(user.id);
  redirect("/dashboard");
}

export async function logoutAction(): Promise<void> {
  await destroyCurrentSession();
  redirect("/login");
}

export async function forgotPasswordAction(formData: FormData): Promise<void> {
  const parsed = forgotPasswordSchema.safeParse({
    email: readFormValue(formData, "email"),
  });

  if (!parsed.success) {
    redirectWithError(
      "/forgot-password",
      parsed.error.issues[0]?.message ?? "Input tidak valid.",
    );
  }

  const user = await prisma.user.findUnique({
    where: {
      email: parsed.data.email.toLowerCase(),
    },
    select: {
      id: true,
      email: true,
    },
  });

  if (user) {
    const token = createPlainToken();
    const tokenHash = hashToken(token);
    const expiresAt = addMinutes(new Date(), 30);

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    const appUrl = process.env.APP_URL ?? "http://localhost:3000";
    await sendPasswordResetEmail({
      email: user.email,
      resetUrl: `${appUrl}/reset-password?token=${encodeURIComponent(token)}`,
    });
  }

  redirectWithSuccess(
    "/forgot-password",
    "Jika email terdaftar, link reset password sudah dikirim.",
  );
}

export async function resetPasswordAction(formData: FormData): Promise<void> {
  const parsed = resetPasswordSchema.safeParse({
    token: readFormValue(formData, "token"),
    password: readFormValue(formData, "password"),
  });

  if (!parsed.success) {
    redirectWithError(
      "/reset-password",
      parsed.error.issues[0]?.message ?? "Input tidak valid.",
    );
  }

  const tokenHash = hashToken(parsed.data.token);
  const resetToken = await prisma.passwordResetToken.findUnique({
    where: {
      tokenHash,
    },
    select: {
      id: true,
      userId: true,
      expiresAt: true,
      usedAt: true,
    },
  });

  if (!resetToken || resetToken.usedAt || resetToken.expiresAt <= new Date()) {
    redirectWithError("/reset-password", "Token reset tidak valid atau sudah kedaluwarsa.");
  }

  const passwordHash = await hashPassword(parsed.data.password);

  await prisma.$transaction([
    prisma.user.update({
      where: {
        id: resetToken.userId,
      },
      data: {
        passwordHash,
      },
    }),
    prisma.passwordResetToken.update({
      where: {
        id: resetToken.id,
      },
      data: {
        usedAt: new Date(),
      },
    }),
    prisma.session.deleteMany({
      where: {
        userId: resetToken.userId,
      },
    }),
  ]);

  redirectWithSuccess("/login", "Password berhasil direset. Silakan login ulang.");
}
