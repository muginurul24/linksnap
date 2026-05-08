import { z } from "zod";

export const emailSchema = z.string().trim().email();

export const passwordSchema = z
  .string()
  .min(8)
  .regex(/[A-Z]/, "Use at least one uppercase letter")
  .regex(/[0-9]/, "Use at least one number")
  .regex(/[^A-Za-z0-9]/, "Use at least one special character");

export const urlSchema = z
  .string()
  .trim()
  .url()
  .refine((value) => {
    const parsed = new URL(value);
    return ["http:", "https:"].includes(parsed.protocol);
  }, "Only HTTP and HTTPS URLs are supported");

export const slugSchema = z
  .string()
  .trim()
  .min(3)
  .max(50)
  .regex(/^[a-z0-9-]+$/, "Use lowercase letters, numbers, and hyphens only");

export function isValidUrl(value: string): boolean {
  return urlSchema.safeParse(value).success;
}

export function passwordScore(value: string): 0 | 1 | 2 | 3 {
  const checks = [value.length >= 8, /[A-Z]/.test(value), /[0-9]/.test(value), /[^A-Za-z0-9]/.test(value)];
  const passed = checks.filter(Boolean).length;
  if (passed <= 1) return 1;
  if (passed === 2 || passed === 3) return 2;
  return 3;
}
