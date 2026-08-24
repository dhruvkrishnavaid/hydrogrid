import type { UserRole } from "../../lib/schemas/database";
import { getUserSiteRole } from "../repositories/memberships";

const ROLE_HIERARCHY: Record<UserRole, number> = {
  ADMIN: 3,
  OPERATOR: 2,
  VIEWER: 1,
};

export function hasRequiredRole(
  userRole: UserRole,
  requiredRole: UserRole = "VIEWER",
): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

export async function checkUserSiteAccess(
  userId: string,
  siteId: string,
  requiredRole: UserRole = "VIEWER",
): Promise<boolean> {
  const role = await getUserSiteRole(userId, siteId);
  if (!role) {
    return false;
  }
  return hasRequiredRole(role, requiredRole);
}

export { getUserSiteRole };
