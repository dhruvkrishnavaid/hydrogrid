import postgres from "@prisma/orm-postgres/runtime";

import type { Contract } from "../../../generated/prisma8/contract.d";
import contractJson from "../../../generated/prisma8/contract.json" with { type: "json" };

function toDateString(val: any): string {
  if (!val) return val;
  if (val instanceof Date) return val.toISOString();
  if (typeof val === "string") return new Date(val).toISOString();
  return String(val);
}

function normalizeDatesInData(data: any): any {
  if (!data || typeof data !== "object") return data;
  const result: any = { ...data };
  for (const [k, v] of Object.entries(result)) {
    if (v instanceof Date) {
      result[k] = toDateString(v);
    }
  }
  return result;
}

function createModelDelegate(collection: any) {
  return {
    async findMany(args?: any) {
      let q = collection;
      if (args?.where) {
        const simpleWhere: any = {};
        const rangePredicates: Array<(f: any) => any> = [];
        for (const [key, val] of Object.entries(args.where)) {
          if (val && typeof val === "object" && !(val instanceof Date)) {
            const range = val as any;
            if (range.gte !== undefined) {
              const str = toDateString(range.gte);
              rangePredicates.push((f: any) => f[key].gte(str));
            }
            if (range.lte !== undefined) {
              const str = toDateString(range.lte);
              rangePredicates.push((f: any) => f[key].lte(str));
            }
            if (range.gt !== undefined) {
              const str = toDateString(range.gt);
              rangePredicates.push((f: any) => f[key].gt(str));
            }
            if (range.lt !== undefined) {
              const str = toDateString(range.lt);
              rangePredicates.push((f: any) => f[key].lt(str));
            }
          } else {
            simpleWhere[key] = val;
          }
        }
        if (Object.keys(simpleWhere).length > 0) {
          q = q.where(simpleWhere);
        }
        for (const pred of rangePredicates) {
          q = q.where(pred);
        }
      }
      if (args?.orderBy) {
        const [field, dir] = Object.entries(args.orderBy)[0];
        q = q.orderBy((f: any) =>
          dir === "desc" ? f[field].desc() : f[field].asc(),
        );
      }
      if (typeof args?.take === "number") {
        q = q.limit(args.take);
      }
      return await q.all();
    },

    async findUnique(args: { where: any }) {
      return await collection.where(args.where).first();
    },

    async findFirst(args?: { where?: any; select?: any }) {
      let q = collection;
      if (args?.where) {
        q = q.where(args.where);
      }
      return await q.first();
    },

    async create(args: { data: any }) {
      return await collection.create(normalizeDatesInData(args.data));
    },

    async update(args: { where: any; data: any }) {
      return await collection
        .where(args.where)
        .update(normalizeDatesInData(args.data));
    },

    async upsert(args: { where: any; update: any; create: any }) {
      const existing = await collection.where(args.where).first();
      if (existing) {
        return await collection
          .where(args.where)
          .update(normalizeDatesInData(args.update));
      } else {
        return await collection.create(normalizeDatesInData(args.create));
      }
    },
  };
}

export interface PrismaClientCompat {
  site: ReturnType<typeof createModelDelegate>;
  device: ReturnType<typeof createModelDelegate>;
  siteMembership: ReturnType<typeof createModelDelegate>;
  qualityConfiguration: ReturnType<typeof createModelDelegate>;
  event: ReturnType<typeof createModelDelegate>;
  alert: ReturnType<typeof createModelDelegate>;
  sensorCalibration: ReturnType<typeof createModelDelegate>;
  filterMaintenance: ReturnType<typeof createModelDelegate>;
  $disconnect?: () => Promise<void>;
}

declare global {
  // eslint-disable-next-line no-var
  var __prisma8Client: PrismaClientCompat | undefined;
}

export function isPrismaConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

export function getPrismaClient(): PrismaClientCompat | null {
  const rawUrl = process.env.DATABASE_URL;
  if (!rawUrl) {
    return null;
  }

  if (!globalThis.__prisma8Client) {
    let url = rawUrl;
    if (url.includes(".render.com") && !url.includes("sslmode=")) {
      url += (url.includes("?") ? "&" : "?") + "sslmode=require";
    }

    const db = postgres<Contract>({
      contractJson,
      url,
    });

    globalThis.__prisma8Client = {
      site: createModelDelegate(db.orm.public.Site),
      device: createModelDelegate(db.orm.public.Device),
      siteMembership: createModelDelegate(db.orm.public.SiteMembership),
      qualityConfiguration: createModelDelegate(
        db.orm.public.QualityConfiguration,
      ),
      event: createModelDelegate(db.orm.public.Event),
      alert: createModelDelegate(db.orm.public.Alert),
      sensorCalibration: createModelDelegate(db.orm.public.SensorCalibration),
      filterMaintenance: createModelDelegate(db.orm.public.FilterMaintenance),
      $disconnect: async () => {
        await db.close?.();
      },
    };
  }

  return globalThis.__prisma8Client;
}
