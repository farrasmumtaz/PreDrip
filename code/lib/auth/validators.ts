import { z } from "zod";
import bcrypt from "bcryptjs";

const passwordSchema = z
  .string()
  .min(8, "Password minimal 8 karakter.")
  .max(72, "Password maksimal 72 karakter.")
  .regex(/[A-Z]/, "Password wajib memiliki minimal 1 huruf besar.")
  .regex(/[a-z]/, "Password wajib memiliki minimal 1 huruf kecil.")
  .regex(/[0-9]/, "Password wajib memiliki minimal 1 angka.")
  .refine((value) => !bcrypt.truncates(value), "Password maksimal 72 byte UTF-8.");

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Nama minimal 2 karakter.").max(120),
  email: z.string().trim().email("Format email tidak valid.").max(255),
  password: passwordSchema,
  homeAddress: z.string().trim().max(255).optional(),
});

export const loginSchema = z.object({
  email: z.string().trim().email("Format email tidak valid.").max(255),
  password: z.string().min(1, "Password wajib diisi.").max(72).refine((value) => !bcrypt.truncates(value), "Password maksimal 72 byte UTF-8."),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email("Format email tidak valid.").max(255),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(32, "Token reset tidak valid."),
  password: passwordSchema,
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
