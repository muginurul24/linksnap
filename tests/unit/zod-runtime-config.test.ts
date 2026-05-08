import { afterEach, describe, expect, it } from "vitest";
import {
  configureZodForRuntime,
  z,
} from "../../src/lib/validations/zod";

const originalFunction = globalThis.Function;
const originalWindowDescriptor = Object.getOwnPropertyDescriptor(
  globalThis,
  "window",
);

function resetZodJitless(): void {
  delete z.config().jitless;
}

function setBrowserWindow(): void {
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {},
    writable: true,
  });
}

function restoreGlobals(): void {
  Object.defineProperty(globalThis, "Function", {
    configurable: true,
    value: originalFunction,
    writable: true,
  });

  if (originalWindowDescriptor) {
    Object.defineProperty(globalThis, "window", originalWindowDescriptor);
    return;
  }

  Reflect.deleteProperty(globalThis, "window");
}

afterEach(() => {
  restoreGlobals();
  resetZodJitless();
});

describe("Zod runtime config", () => {
  it("should keep server-side validation on the default Zod runtime", () => {
    resetZodJitless();

    configureZodForRuntime();

    expect(z.config().jitless).toBeUndefined();
  });

  it("should disable Zod JIT parsing in browser runtimes for strict CSP", () => {
    resetZodJitless();
    setBrowserWindow();

    configureZodForRuntime();

    expect(z.config().jitless).toBe(true);
  });

  it("should parse client-side schemas without touching the Function constructor", () => {
    let functionCalls = 0;
    setBrowserWindow();
    configureZodForRuntime();

    const functionConstructor = function BlockedFunction() {
      functionCalls += 1;
      throw new EvalError("Function constructor blocked by CSP");
    } as unknown as FunctionConstructor;
    Object.defineProperty(globalThis, "Function", {
      configurable: true,
      value: functionConstructor,
      writable: true,
    });

    const parsed = z.object({ name: z.string() }).safeParse({ name: "Campaign" });

    expect(parsed.success).toBe(true);
    expect(functionCalls).toBe(0);
  });
});
