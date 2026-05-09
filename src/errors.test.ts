import { describe, expect, it } from "vitest";

import { McpToolError, mapApiError } from "./errors.js";

describe("mapApiError — code priority", () => {
  it("maps VALIDATION_ERROR (422) by status when no body code is set", () => {
    const err = mapApiError(422, { error: { message: "bad input" } });
    expect(err).toBeInstanceOf(McpToolError);
    expect(err.code).toBe("VALIDATION_ERROR");
  });

  it("prefers an explicit details.code over the status mapping", () => {
    const err = mapApiError(400, {
      error: {
        message: "Token isn't scoped to ws_b",
        details: { code: "TOKEN_SCOPE_MISMATCH" },
      },
    });
    expect(err.code).toBe("TOKEN_SCOPE_MISMATCH");
  });

  it("maps SPEC_LOCKED via details.code with the documented remediation", () => {
    const err = mapApiError(403, {
      error: {
        message: "Spec is REVIEWED",
        details: { code: "SPEC_LOCKED" },
      },
    });
    expect(err.code).toBe("SPEC_LOCKED");
    expect(err.remediation).toContain("start_new_version");
  });

  it("maps PRODUCT_TYPE_MISMATCH via details.code", () => {
    const err = mapApiError(400, {
      error: {
        message: "Type filter doesn't fit",
        details: { code: "PRODUCT_TYPE_MISMATCH" },
      },
    });
    expect(err.code).toBe("PRODUCT_TYPE_MISMATCH");
  });

  it("falls back to status when no body is provided", () => {
    expect(mapApiError(429, null).code).toBe("RATE_LIMITED");
    expect(mapApiError(401, null).code).toBe("AUTH_FAILED");
    expect(mapApiError(403, null).code).toBe("TOKEN_SCOPE_MISMATCH");
    expect(mapApiError(404, null).code).toBe("NOT_FOUND");
    expect(mapApiError(409, null).code).toBe("STALE_VERSION");
    expect(mapApiError(500, null).code).toBe("INTERNAL_ERROR");
  });

  it("attaches a non-empty remediation to every error", () => {
    const err = mapApiError(404, null);
    expect(err.remediation.length).toBeGreaterThan(10);
  });

  it("converts to a serializable failure shape", () => {
    const failure = mapApiError(401, null).toFailure();
    expect(failure).toEqual(
      expect.objectContaining({
        code: "AUTH_FAILED",
        remediation: expect.any(String),
      }),
    );
  });
});
