import { z } from "zod";

export const qrCodeQuerySchema = z
  .object({
    format: z.enum(["png", "svg"]).default("png"),
    size: z.coerce.number().int().min(128).max(1024).default(300),
  })
  .strict();

export type QrCodeQuery = z.infer<typeof qrCodeQuerySchema>;
