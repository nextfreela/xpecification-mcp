import { describe, expect, it } from "vitest";

import { parseArgs } from "./cli.js";

describe("parseArgs", () => {
  it("defaults to stdio serve", () => {
    const args = parseArgs([]);
    expect(args).toMatchObject({
      command: "serve",
      transport: "stdio",
      port: 7345,
      host: "127.0.0.1",
      corsOrigins: [],
      allowInsecure: false,
      json: false,
    });
  });

  it("--http selects the HTTP transport", () => {
    const args = parseArgs(["--http"]);
    expect(args.transport).toBe("http");
    expect(args.command).toBe("serve");
  });

  it("--port accepts both space and = forms", () => {
    expect(parseArgs(["--http", "--port", "8080"]).port).toBe(8080);
    expect(parseArgs(["--http", "--port=8080"]).port).toBe(8080);
  });

  it("--port rejects non-numeric and out-of-range values", () => {
    expect(() => parseArgs(["--http", "--port", "abc"])).toThrow(/--port/);
    expect(() => parseArgs(["--http", "--port", "70000"])).toThrow(/--port/);
    expect(() => parseArgs(["--http", "--port", "-1"])).toThrow(/--port/);
  });

  it("--cors-origin accumulates across multiple flags", () => {
    const args = parseArgs([
      "--http",
      "--cors-origin",
      "https://app.example",
      "--cors-origin=https://other.example",
    ]);
    expect(args.corsOrigins).toEqual([
      "https://app.example",
      "https://other.example",
    ]);
  });

  it("--check + --json sets command and json flag", () => {
    const args = parseArgs(["--check", "--json"]);
    expect(args.command).toBe("check");
    expect(args.json).toBe(true);
  });

  it("--api-url accepts both forms", () => {
    expect(parseArgs(["--api-url", "https://x.example"]).apiUrl).toBe(
      "https://x.example",
    );
    expect(parseArgs(["--api-url=https://x.example"]).apiUrl).toBe(
      "https://x.example",
    );
  });

  it("rejects unknown arguments", () => {
    expect(() => parseArgs(["--bogus"])).toThrow(/Unknown argument/);
  });

  it("rejects --port without a value", () => {
    expect(() => parseArgs(["--http", "--port"])).toThrow(/--port/);
  });
});
