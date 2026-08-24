import { describe, expect, it } from "bun:test";

import { extractBearerToken } from "../../src/server/auth/token";

describe("Bearer Token Extraction", () => {
  it("returns null when Authorization header is missing", () => {
    const request = new Request("http://localhost:3000/api/test/auth");
    expect(extractBearerToken(request)).toBeNull();
  });

  it("returns null when Authorization header is empty string", () => {
    const request = new Request("http://localhost:3000/api/test/auth", {
      headers: { Authorization: "" },
    });
    expect(extractBearerToken(request)).toBeNull();
  });

  it("returns null for non-Bearer schemes (Basic, Token, etc.)", () => {
    const basicReq = new Request("http://localhost:3000/api/test/auth", {
      headers: { Authorization: "Basic dXNlcjpwYXNz" },
    });
    expect(extractBearerToken(basicReq)).toBeNull();

    const customReq = new Request("http://localhost:3000/api/test/auth", {
      headers: { Authorization: "CustomAuth xyz123" },
    });
    expect(extractBearerToken(customReq)).toBeNull();
  });

  it("returns null when Bearer prefix has no token", () => {
    const emptyBearer = new Request("http://localhost:3000/api/test/auth", {
      headers: { Authorization: "Bearer" },
    });
    expect(extractBearerToken(emptyBearer)).toBeNull();

    const whitespaceBearer = new Request(
      "http://localhost:3000/api/test/auth",
      {
        headers: { Authorization: "Bearer   " },
      },
    );
    expect(extractBearerToken(whitespaceBearer)).toBeNull();
  });

  it("extracts valid token from standard 'Bearer <token>'", () => {
    const token =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.doNotLeak";
    const request = new Request("http://localhost:3000/api/test/auth", {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(extractBearerToken(request)).toBe(token);
  });

  it("handles case-insensitive Bearer prefix ('bearer', 'BEARER', 'BeArEr')", () => {
    const token = "my-sample-access-token";

    const lowerReq = new Request("http://localhost:3000/api/test/auth", {
      headers: { Authorization: `bearer ${token}` },
    });
    expect(extractBearerToken(lowerReq)).toBe(token);

    const upperReq = new Request("http://localhost:3000/api/test/auth", {
      headers: { Authorization: `BEARER ${token}` },
    });
    expect(extractBearerToken(upperReq)).toBe(token);

    const mixedReq = new Request("http://localhost:3000/api/test/auth", {
      headers: { Authorization: `BeArEr ${token}` },
    });
    expect(extractBearerToken(mixedReq)).toBe(token);
  });

  it("handles leading and trailing whitespace in header and token", () => {
    const token = "clean-jwt-token";
    const request = new Request("http://localhost:3000/api/test/auth", {
      headers: { Authorization: `  Bearer    ${token}   ` },
    });
    expect(extractBearerToken(request)).toBe(token);
  });

  it("supports mock requests with plain object headers", () => {
    const token = "plain-object-token";
    const mockRequest = {
      headers: {
        authorization: `Bearer ${token}`,
      },
    } as unknown as Request;

    expect(extractBearerToken(mockRequest)).toBe(token);
  });
});
