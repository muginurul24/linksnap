import { z } from "zod";

const emailSchema = z
  .string()
  .trim()
  .min(1, "Email is required")
  .email("Enter a valid email address")
  .max(255, "Email is too long")
  .transform((email) => email.toLowerCase());

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password is too long")
  .regex(/[A-Za-z]/, "Password must include a letter")
  .regex(/\d/, "Password must include a number");

export const registerApiSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
  })
  .strict();

export type RegisterApiInput = z.infer<typeof registerApiSchema>;

export const registerSchema = registerApiSchema
  .extend({
    confirmPassword: z.string().min(1, "Confirm your password"),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.password !== data.confirmPassword) {
      ctx.addIssue({
        code: "custom",
        message: "Passwords do not match",
        path: ["confirmPassword"],
      });
    }
  });

export type RegisterInput = z.infer<typeof registerSchema>;

export const verifyEmailSchema = z
  .object({
    email: emailSchema,
    otp: z.string().regex(/^\d{6}$/, "Enter the 6-digit code"),
  })
  .strict();

export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;

export const resendOtpSchema = z
  .object({
    email: emailSchema,
  })
  .strict();

export type ResendOtpInput = z.infer<typeof resendOtpSchema>;

export const loginSchema = z
  .object({
    email: emailSchema,
    password: z.string().min(1, "Password is required"),
  })
  .strict();

export type LoginInput = z.infer<typeof loginSchema>;

export const twoFactorChallengeSchema = loginSchema;

export type TwoFactorChallengeInput = z.infer<typeof twoFactorChallengeSchema>;

export const twoFactorTokenSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, "Enter the 6-digit code");

export const twoFactorVerifySchema = z
  .object({
    token: twoFactorTokenSchema,
  })
  .strict();

export type TwoFactorVerifyInput = z.infer<typeof twoFactorVerifySchema>;

export const twoFactorLoginSchema = z
  .object({
    backupCode: z.string().trim().min(4).max(32).optional(),
    challengeId: z.string().trim().length(64, "Challenge expired or invalid"),
    token: twoFactorTokenSchema.optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (!data.token && !data.backupCode) {
      ctx.addIssue({
        code: "custom",
        message: "Enter a verification code or backup code",
        path: ["token"],
      });
    }
  });

export type TwoFactorLoginInput = z.infer<typeof twoFactorLoginSchema>;

export const twoFactorPasswordSchema = z
  .object({
    password: z.string().min(1, "Password is required"),
  })
  .strict();

export type TwoFactorPasswordInput = z.infer<typeof twoFactorPasswordSchema>;

export const changeEmailSchema = z
  .object({
    email: emailSchema,
    password: z.string().min(1, "Password is required"),
  })
  .strict();

export type ChangeEmailInput = z.infer<typeof changeEmailSchema>;

export const verifyNewEmailSchema = z
  .object({
    email: emailSchema,
    otp: z.string().regex(/^\d{6}$/, "Enter the 6-digit code"),
  })
  .strict();

export type VerifyNewEmailInput = z.infer<typeof verifyNewEmailSchema>;

export const deleteAccountSchema = z
  .object({
    password: z.string().min(1, "Password is required"),
  })
  .strict();

export type DeleteAccountInput = z.infer<typeof deleteAccountSchema>;

export const forgotPasswordSchema = z
  .object({
    email: emailSchema,
  })
  .strict();

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    token: z
      .string()
      .trim()
      .min(32, "Reset token is missing or invalid")
      .max(256, "Reset token is too long"),
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Confirm your password"),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.password !== data.confirmPassword) {
      ctx.addIssue({
        code: "custom",
        message: "Passwords do not match",
        path: ["confirmPassword"],
      });
    }
  });

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Confirm your password"),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.password !== data.confirmPassword) {
      ctx.addIssue({
        code: "custom",
        message: "Passwords do not match",
        path: ["confirmPassword"],
      });
    }
  });

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
