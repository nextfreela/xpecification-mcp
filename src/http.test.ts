import { describe, expect, it } from "vitest";
import type { IncomingMessage, ServerResponse } from "node:http";

import { applyCors } from "./http.js";

interface MockRes {
  statusCode: number;
  headers: Record<string, string>;
  ended: boolean;
  body?: string;
  setHeader: (key: string, value: string) => void;
  end: (body?: string) => void;
}

function mockReq(headers: Record<string, string> = {}): IncomingMessage {
  return {
    headers,
    method: "POST",
    url: "/mcp",
  } as unknown as IncomingMessage;
}

function mockRes(): MockRes & ServerResponse {
  const headers: Record<string, string> = {};
  const res: MockRes = {
    statusCode: 200,
    headers,
    ended: false,
    body: undefined,
    setHeader: (k: string, v: string) => {
      headers[k.toLowerCase()] = v;
    },
    end: (body?: string) => {
      res.ended = true;
      if (typeof body === "string") res.body = body;
    },
  };
  return res as unknown as MockRes & ServerResponse;
}

describe("applyCors", () => {
  it("permits requests with no Origin header (same-origin / non-browser)", () => {
    const req = mockReq();
    const res = mockRes();
    expect(applyCors(req, res, [])).toBe(true);
    expect(res.ended).toBe(false);
    expect(res.headers["access-control-allow-origin"]).toBeUndefined();
  });

  it("rejects an unknown origin with 403 by default", () => {
    const req = mockReq({ origin: "https://attacker.example" });
    const res = mockRes();
    expect(applyCors(req, res, [])).toBe(false);
    expect(res.statusCode).toBe(403);
    expect(res.body).toContain("CORS_ORIGIN_NOT_ALLOWED");
  });

  it("allows an origin that's in the allowlist", () => {
    const req = mockReq({ origin: "https://app.example" });
    const res = mockRes();
    expect(applyCors(req, res, ["https://app.example"])).toBe(true);
    expect(res.headers["access-control-allow-origin"]).toBe(
      "https://app.example",
    );
    expect(res.headers["vary"]).toBe("Origin");
  });

  it("rejects an origin not in the allowlist even when one entry matches a sibling", () => {
    const req = mockReq({ origin: "https://attacker.example" });
    const res = mockRes();
    expect(applyCors(req, res, ["https://app.example"])).toBe(false);
    expect(res.statusCode).toBe(403);
  });

  it("permits any origin when '*' is allowlisted", () => {
    const req = mockReq({ origin: "https://random.example" });
    const res = mockRes();
    expect(applyCors(req, res, ["*"])).toBe(true);
    expect(res.headers["access-control-allow-origin"]).toBe("*");
  });

  it("exposes mcp-session-id on permitted responses", () => {
    const req = mockReq({ origin: "https://app.example" });
    const res = mockRes();
    applyCors(req, res, ["https://app.example"]);
    expect(res.headers["access-control-expose-headers"]).toContain(
      "mcp-session-id",
    );
  });
});
