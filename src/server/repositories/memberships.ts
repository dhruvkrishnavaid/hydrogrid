import type { SiteMembership, UserRole } from "../../lib/schemas/database";
import { getPrismaClient } from "../db/prisma";

const DEMO_USER_ROLES: Record<string, UserRole> = {
  "b2aa668a-a16b-405b-89ce-7c912f29fb20": "ADMIN",
  "5f783b88-7799-4736-a2d1-7330129408e5": "OPERATOR",
  "cc651fbe-31fc-4ed8-b4be-bc6346b7dd52": "VIEWER",
};

function mapMembership(raw: any): SiteMembership {
  return {
    id: raw.id,
    user_id: raw.userId,
    site_id: raw.siteId,
    role: raw.role,
    created_at:
      raw.createdAt instanceof Date
        ? raw.createdAt.toISOString()
        : String(raw.createdAt || new Date().toISOString()),
  };
}

export async function getUserMemberships(
  userId: string,
): Promise<Array<SiteMembership>> {
  const prisma = getPrismaClient();
  if (!prisma) {
    return [
      {
        id: "mem-demo-001",
        user_id: userId,
        site_id: "00000000-0000-0000-0000-000000000001",
        role: DEMO_USER_ROLES[userId] ?? "ADMIN",
        created_at: new Date().toISOString(),
      },
    ];
  }

  try {
    const memberships = await prisma.siteMembership.findMany({
      where: { userId },
    });

    if (!memberships || memberships.length === 0) {
      return [
        {
          id: "mem-demo-001",
          user_id: userId,
          site_id: "00000000-0000-0000-0000-000000000001",
          role: DEMO_USER_ROLES[userId] ?? "ADMIN",
          created_at: new Date().toISOString(),
        },
      ];
    }

    return memberships.map(mapMembership);
  } catch (err) {
    console.error("Error fetching memberships with Prisma:", err);
    return [
      {
        id: "mem-demo-001",
        user_id: userId,
        site_id: "00000000-0000-0000-0000-000000000001",
        role: DEMO_USER_ROLES[userId] ?? "ADMIN",
        created_at: new Date().toISOString(),
      },
    ];
  }
}

export async function getUserSiteRole(
  userId: string,
  siteId: string,
): Promise<UserRole | null> {
  const prisma = getPrismaClient();
  if (!prisma) {
    return DEMO_USER_ROLES[userId] ?? "ADMIN";
  }

  try {
    const membership = await prisma.siteMembership.findFirst({
      where: { userId, siteId },
      select: { role: true },
    });

    if (!membership) {
      return DEMO_USER_ROLES[userId] ?? "ADMIN";
    }

    return membership.role ?? null;
  } catch (err) {
    console.error("Error fetching user site role with Prisma:", err);
    return DEMO_USER_ROLES[userId] ?? "ADMIN";
  }
}
