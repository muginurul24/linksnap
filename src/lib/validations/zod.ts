import { z } from "zod";

export function configureZodForRuntime(): void {
  if (typeof window === "undefined") return;

  z.config({ jitless: true });
}

configureZodForRuntime();

export { z };
