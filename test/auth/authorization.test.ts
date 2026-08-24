import { describe, expect, it } from "bun:test";

import type { UserRole } from "../../src/lib/schemas/database";
import { hasRequiredRole } from "../../src/server/auth/authorization";

describe("Role Hierarchy & Authorization", () => {
  describe("hasRequiredRole", () => {
    it("ADMIN satisfies ADMIN, OPERATOR, and VIEWER requirements", () => {
      expect(hasRequiredRole("ADMIN", "ADMIN")).toBe(true);
      expect(hasRequiredRole("ADMIN", "OPERATOR")).toBe(true);
      expect(hasRequiredRole("ADMIN", "VIEWER")).toBe(true);
    });

    it("OPERATOR satisfies OPERATOR and VIEWER, but fails ADMIN", () => {
      expect(hasRequiredRole("OPERATOR", "OPERATOR")).toBe(true);
      expect(hasRequiredRole("OPERATOR", "VIEWER")).toBe(true);
      expect(hasRequiredRole("OPERATOR", "ADMIN")).toBe(false);
    });

    it("VIEWER satisfies VIEWER, but fails OPERATOR and ADMIN", () => {
      expect(hasRequiredRole("VIEWER", "VIEWER")).toBe(true);
      expect(hasRequiredRole("VIEWER", "OPERATOR")).toBe(false);
      expect(hasRequiredRole("VIEWER", "ADMIN")).toBe(false);
    });

    it("defaults to VIEWER requirement if requiredRole is omitted", () => {
      expect(hasRequiredRole("ADMIN")).toBe(true);
      expect(hasRequiredRole("OPERATOR")).toBe(true);
      expect(hasRequiredRole("VIEWER")).toBe(true);
    });

    it("safely rejects unknown or invalid roles", () => {
      expect(hasRequiredRole("SUPERADMIN" as UserRole, "VIEWER")).toBe(false);
      expect(hasRequiredRole("GUEST" as UserRole, "VIEWER")).toBe(false);
      expect(hasRequiredRole("" as UserRole, "VIEWER")).toBe(false);
    });
  });
});
