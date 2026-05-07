import { z } from "zod";

export const createApiKeySchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(80, "Name is too long"),
  })
  .strict();

export const apiKeyIdParamsSchema = z
  .object({
    id: z.string().uuid("API key ID must be a valid UUID"),
  })
  .strict();

export type CreateApiKeyInput = z.infer<typeof createApiKeySchema>;
export type ApiKeyIdParams = z.infer<typeof apiKeyIdParamsSchema>;
