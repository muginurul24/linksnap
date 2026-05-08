import { z } from "zod";

export const adminUpdateUserPlanSchema = z.object({
  plan: z.enum(["FREE", "PRO", "BUSINESS"]),
});

export const adminSuspendUserSchema = z.object({
  action: z.enum(["suspend", "unsuspend"]),
});

export const adminUserListQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((v) => {
      const n = Number(v);
      return Number.isNaN(n) || n < 1 ? 1 : n;
    }),
  limit: z
    .string()
    .optional()
    .transform((v) => {
      const n = Number(v);
      return Number.isNaN(n) || n < 1 ? 20 : Math.min(n, 100);
    }),
  search: z.string().optional(),
  plan: z.enum(["FREE", "PRO", "BUSINESS"]).optional(),
});

export const adminAuditLogQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((v) => {
      const n = Number(v);
      return Number.isNaN(n) || n < 1 ? 1 : n;
    }),
  limit: z
    .string()
    .optional()
    .transform((v) => {
      const n = Number(v);
      return Number.isNaN(n) || n < 1 ? 20 : Math.min(n, 100);
    }),
  action: z.string().optional(),
});

export type AdminUserListQuery = z.infer<typeof adminUserListQuerySchema>;
export type AdminUpdateUserPlanInput = z.infer<typeof adminUpdateUserPlanSchema>;
export type AdminSuspendUserInput = z.infer<typeof adminSuspendUserSchema>;
export type AdminAuditLogQuery = z.infer<typeof adminAuditLogQuerySchema>;
