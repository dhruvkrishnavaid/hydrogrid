import type { Site } from "../../lib/schemas/database";
import { getPrismaClient } from "../db/prisma";

export interface InsertSite {
  name: string;
  village: string;
  district: string;
  state: string;
  latitude: number;
  longitude: number;
  status?: "ONLINE" | "OFFLINE" | "DEGRADED";
}

export interface UpdateSite {
  name?: string;
  village?: string;
  district?: string;
  state?: string;
  latitude?: number;
  longitude?: number;
  status?: "ONLINE" | "OFFLINE" | "DEGRADED";
}

export const DEFAULT_DEMO_SITE: Site = {
  id: "00000000-0000-0000-0000-000000000001",
  name: "Node Zero — IIITD Pilot",
  village: "IIIT-Delhi Campus (Okhla)",
  district: "South East Delhi",
  state: "Delhi",
  latitude: 28.5459,
  longitude: 77.2732,
  status: "ONLINE",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

function mapSite(raw: any): Site {
  return {
    id: raw.id,
    name: raw.name,
    village: raw.village,
    district: raw.district,
    state: raw.state,
    latitude: raw.latitude,
    longitude: raw.longitude,
    status: raw.status,
    created_at:
      raw.createdAt instanceof Date
        ? raw.createdAt.toISOString()
        : String(raw.createdAt || new Date().toISOString()),
    updated_at:
      raw.updatedAt instanceof Date
        ? raw.updatedAt.toISOString()
        : String(raw.updatedAt || new Date().toISOString()),
  };
}

export async function getSites(): Promise<Array<Site>> {
  const prisma = getPrismaClient();
  if (!prisma) {
    return [DEFAULT_DEMO_SITE];
  }

  try {
    const sites = await prisma.site.findMany({
      orderBy: { createdAt: "asc" },
    });

    if (!sites || sites.length === 0) {
      return [DEFAULT_DEMO_SITE];
    }

    return sites.map(mapSite);
  } catch (err) {
    console.error("Error fetching sites with Prisma:", err);
    return [DEFAULT_DEMO_SITE];
  }
}

export async function getSiteById(id: string): Promise<Site | null> {
  if (id === DEFAULT_DEMO_SITE.id) {
    return DEFAULT_DEMO_SITE;
  }

  const prisma = getPrismaClient();
  if (!prisma) {
    return DEFAULT_DEMO_SITE;
  }

  try {
    const site = await prisma.site.findUnique({
      where: { id },
    });

    if (!site) {
      return DEFAULT_DEMO_SITE;
    }

    return mapSite(site);
  } catch (err) {
    console.error("Error fetching site by id with Prisma:", err);
    return DEFAULT_DEMO_SITE;
  }
}

export async function createSite(site: InsertSite): Promise<Site | null> {
  const prisma = getPrismaClient();
  if (!prisma) {
    return null;
  }

  try {
    const created = await prisma.site.create({
      data: {
        name: site.name,
        village: site.village,
        district: site.district,
        state: site.state,
        latitude: site.latitude,
        longitude: site.longitude,
        status: site.status ?? "ONLINE",
      },
    });

    return mapSite(created);
  } catch (err) {
    console.error("Error creating site with Prisma:", err);
    return null;
  }
}

export async function updateSite(
  id: string,
  update: UpdateSite,
): Promise<Site | null> {
  const prisma = getPrismaClient();
  if (!prisma) {
    return null;
  }

  try {
    const updated = await prisma.site.update({
      where: { id },
      data: {
        ...(update.name !== undefined && { name: update.name }),
        ...(update.village !== undefined && { village: update.village }),
        ...(update.district !== undefined && { district: update.district }),
        ...(update.state !== undefined && { state: update.state }),
        ...(update.latitude !== undefined && { latitude: update.latitude }),
        ...(update.longitude !== undefined && { longitude: update.longitude }),
        ...(update.status !== undefined && { status: update.status }),
      },
    });

    return mapSite(updated);
  } catch (err) {
    console.error("Error updating site with Prisma:", err);
    return null;
  }
}
