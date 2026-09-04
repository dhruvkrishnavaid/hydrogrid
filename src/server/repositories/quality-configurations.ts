import type { QualityConfiguration } from "../../lib/schemas/database";
import { getPrismaClient } from "../db/prisma";

function mapQualityConfig(raw: any): QualityConfiguration {
  return {
    id: raw.id,
    site_id: raw.siteId,
    min_ph: raw.minPh,
    max_ph: raw.maxPh,
    max_tds: raw.maxTds,
    max_turbidity: raw.maxTurbidity,
    max_flow_mismatch_percent: raw.maxFlowMismatchPercent,
    updated_at:
      raw.updatedAt instanceof Date
        ? raw.updatedAt.toISOString()
        : String(raw.updatedAt || new Date().toISOString()),
  };
}

export async function getQualityConfigBySiteId(
  siteId: string,
): Promise<QualityConfiguration | null> {
  const prisma = getPrismaClient();
  if (!prisma) {
    return null;
  }

  try {
    const config = await prisma.qualityConfiguration.findUnique({
      where: { siteId },
    });

    if (!config) {
      return null;
    }

    return mapQualityConfig(config);
  } catch (err) {
    console.error("Error fetching quality config with Prisma:", err);
    return null;
  }
}

export async function upsertQualityConfig(
  siteId: string,
  config: Partial<Omit<QualityConfiguration, "id" | "site_id" | "updated_at">>,
): Promise<QualityConfiguration | null> {
  const prisma = getPrismaClient();
  if (!prisma) {
    return null;
  }

  try {
    const upserted = await prisma.qualityConfiguration.upsert({
      where: { siteId },
      update: {
        ...(config.min_ph !== undefined && { minPh: config.min_ph }),
        ...(config.max_ph !== undefined && { maxPh: config.max_ph }),
        ...(config.max_tds !== undefined && { maxTds: config.max_tds }),
        ...(config.max_turbidity !== undefined && {
          maxTurbidity: config.max_turbidity,
        }),
        ...(config.max_flow_mismatch_percent !== undefined && {
          maxFlowMismatchPercent: config.max_flow_mismatch_percent,
        }),
      },
      create: {
        siteId,
        minPh: config.min_ph ?? 6.5,
        maxPh: config.max_ph ?? 8.5,
        maxTds: config.max_tds ?? 500.0,
        maxTurbidity: config.max_turbidity ?? 5.0,
        maxFlowMismatchPercent: config.max_flow_mismatch_percent ?? 15.0,
      },
    });

    return mapQualityConfig(upserted);
  } catch (err) {
    console.error("Error upserting quality configuration with Prisma:", err);
    return null;
  }
}
