import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ApiErrorNotice } from "@/components/dashboard/api-error-notice";
import { ApiClientError } from "@/lib/api/client";

describe("ApiErrorNotice", () => {
  it("should render friendly copy and request id for API errors", () => {
    const markup = renderToStaticMarkup(
      <ApiErrorNotice
        error={
          new ApiClientError({
            code: "CSRF_HEADER_REQUIRED",
            message: "Missing required request header.",
            requestId: "req_123",
            status: 403,
          })
        }
        title="Plan was not updated"
      />,
    );

    expect(markup).toContain("Plan was not updated");
    expect(markup).toContain("This action was blocked by browser security.");
    expect(markup).toContain("Request ID: req_123");
    expect(markup).toContain("Copy");
  });
});
