import { describe, expect, it } from "bun:test";

import { Route } from "../../src/routes/api/test.auth";
import { apiError, apiSuccess } from "../../src/server/utils/response";

describe("/api/test/auth Route Handler", () => {
  const handlers = Route.options.server?.handlers as
    | Record<string, (opts: { request: Request }) => Promise<Response>>
    | undefined;
  const handler = handlers?.GET;

  it("ensures GET handler is defined", () => {
    expect(handler).toBeDefined();
    expect(typeof handler).toBe("function");
  });

  it("returns HTTP 401 with standard error envelope when unauthenticated", async () => {
    if (!handler) return;

    const request = new Request("http://localhost:3000/api/test/auth");
    const response = (await handler({ request }));

    expect(response.status).toBe(401);
    expect(response.headers.get("content-type")).toContain("application/json");

    const body = await response.json();
    expect(body).toEqual({
      error: {
        code: "UNAUTHORIZED",
        message: "Authentication required",
      },
    });
  });

  it("returns HTTP 401 with standard error envelope when given an invalid token", async () => {
    if (!handler) return;

    const request = new Request("http://localhost:3000/api/test/auth", {
      headers: { Authorization: "Bearer invalid.jwt.signature" },
    });
    const response = (await handler({ request }));

    expect(response.status).toBe(401);

    const body = (await response.json()) as { error: { code: string } };
    expect(body).toHaveProperty("error");
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("verifies apiSuccess helper produces { data: ... } envelope with correct status", async () => {
    const mockData = {
      user: { id: "test-id", email: "test@example.com" },
      memberships: [],
    };
    const response = apiSuccess(mockData, 200);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ data: mockData });
  });

  it("verifies apiError helper produces { error: ... } envelope with correct status", async () => {
    const response = apiError("FORBIDDEN", "Site access denied", 403);

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body).toEqual({
      error: {
        code: "FORBIDDEN",
        message: "Site access denied",
      },
    });
  });
});
