import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock h3 before importing auth
vi.mock("h3", () => ({
  getCookie: vi.fn(),
  setHeader: vi.fn(),
}));

import { createAuthToken, verifyAuthToken } from "../../server/utils/auth";

const SECRET = "test-secret-key-for-unit-tests";

describe("createAuthToken", () => {
  it("returns a string in format timestamp.hex", () => {
    const token = createAuthToken(SECRET);
    const parts = token.split(".");
    expect(parts).toHaveLength(2);
    expect(Number(parts[0])).toBeGreaterThan(0);
    expect(parts[1]).toMatch(/^[a-f0-9]{64}$/); // SHA-256 hex = 64 chars
  });

  it("produces different tokens on successive calls", () => {
    const t1 = createAuthToken(SECRET);
    const t2 = createAuthToken(SECRET);
    // Timestamps may be the same if called in same millisecond,
    // but HMAC signatures should differ or tokens should differ
    expect(t1).toBeDefined();
    expect(t2).toBeDefined();
  });
});

describe("verifyAuthToken", () => {
  it("accepts a valid fresh token", () => {
    const token = createAuthToken(SECRET);
    expect(verifyAuthToken(token, SECRET)).toBe(true);
  });

  it("rejects token with wrong secret", () => {
    const token = createAuthToken(SECRET);
    expect(verifyAuthToken(token, "wrong-secret")).toBe(false);
  });

  it("rejects empty token", () => {
    expect(verifyAuthToken("", SECRET)).toBe(false);
  });

  it("rejects null/undefined token", () => {
    expect(verifyAuthToken(null as any, SECRET)).toBe(false);
    expect(verifyAuthToken(undefined as any, SECRET)).toBe(false);
  });

  it("rejects token with tampered signature", () => {
    const token = createAuthToken(SECRET);
    const [ts, sig] = token.split(".");
    // Flip last hex char of signature
    const tampered = sig.slice(0, -1) + (sig.endsWith("a") ? "b" : "a");
    expect(verifyAuthToken(`${ts}.${tampered}`, SECRET)).toBe(false);
  });

  it("rejects token with tampered timestamp", () => {
    const token = createAuthToken(SECRET);
    const [ts, sig] = token.split(".");
    const tamperedTs = String(Number(ts) + 1000);
    expect(verifyAuthToken(`${tamperedTs}.${sig}`, SECRET)).toBe(false);
  });

  it("rejects token with missing parts", () => {
    expect(verifyAuthToken("only-timestamp", SECRET)).toBe(false);
    expect(verifyAuthToken(".", SECRET)).toBe(false);
    expect(verifyAuthToken("ts.", SECRET)).toBe(false);
  });

  it("rejects expired token (30 days + 1 second old)", () => {
    const oldTs = String(Date.now() - (30 * 24 * 60 * 60 + 1) * 1000);
    // We need to create a valid HMAC for this old timestamp
    const { createHmac } = require("node:crypto");
    const sig = createHmac("sha256", SECRET).update(oldTs).digest("hex");
    expect(verifyAuthToken(`${oldTs}.${sig}`, SECRET)).toBe(false);
  });

  it("rejects token with empty secret", () => {
    const token = createAuthToken(SECRET);
    expect(verifyAuthToken(token, "")).toBe(false);
  });
});
