import { describe, it, expect } from "vitest";
import { loadProxyConfig, validatePrompt, isOversizedBody } from "./proxy";

describe("loadProxyConfig", () => {
  it("returns config when both vars are present and token is real", () => {
    expect(loadProxyConfig({ GATEWAY_URL: "http://localhost:8080", GATEWAY_TOKEN: "abc123" })).toEqual({
      gatewayUrl: "http://localhost:8080",
      token: "abc123",
    });
  });

  it("returns null when GATEWAY_URL is missing", () => {
    expect(loadProxyConfig({ GATEWAY_TOKEN: "abc123" })).toBeNull();
  });

  it("returns null when GATEWAY_TOKEN is missing", () => {
    expect(loadProxyConfig({ GATEWAY_URL: "http://x" })).toBeNull();
  });

  it("returns null for the placeholder value (never use .env.example token)", () => {
    expect(
      loadProxyConfig({ GATEWAY_URL: "http://x", GATEWAY_TOKEN: "replace-me-placeholder" })
    ).toBeNull();
  });
});

describe("validatePrompt", () => {
  it("accepts a non-empty prompt", () => {
    expect(validatePrompt({ prompt: "hello" })).toEqual({ ok: true, prompt: "hello" });
  });

  it("trims surrounding whitespace", () => {
    expect(validatePrompt({ prompt: "  hi  " })).toEqual({ ok: true, prompt: "hi" });
  });

  it("rejects non-object json", () => {
    const r = validatePrompt("nope");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe(400);
  });

  it("rejects missing prompt field with 400", () => {
    const r = validatePrompt({});
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.status).toBe(400);
      expect(r.code).toBe("VALIDATION_FAILED");
    }
  });

  it("rejects empty string prompt with 400", () => {
    const r = validatePrompt({ prompt: "" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe(400);
  });

  it("rejects whitespace-only prompt with 422 INVALID_CONTENT", () => {
    const r = validatePrompt({ prompt: "   " });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.status).toBe(422);
      expect(r.code).toBe("INVALID_CONTENT");
    }
  });

  it("rejects non-string prompt", () => {
    const r = validatePrompt({ prompt: 42 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe(400);
  });
});

describe("isOversizedBody", () => {
  it("is false for small bodies", () => {
    expect(isOversizedBody(100)).toBe(false);
  });

  it("is true for bodies over 1MB", () => {
    expect(isOversizedBody(1024 * 1024 + 1)).toBe(true);
  });

  it("is false exactly at the 1MB limit", () => {
    expect(isOversizedBody(1024 * 1024)).toBe(false);
  });
});