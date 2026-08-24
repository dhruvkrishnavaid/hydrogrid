import { z } from "zod";

// The 9 agreed MVP water-quality parameters
export const WaterQualityReadingSchema = z.object({
  ph: z.number().describe("pH value (standard range 0-14)"),
  turbidity: z.number().describe("Turbidity in NTU"),
  heavyMetals: z.number().describe("Heavy metals contamination index/level"),
  dissolvedOxygen: z.number().describe("Dissolved Oxygen in mg/L"),
  tds: z.number().describe("Total Dissolved Solids in ppm / mg/L"),
  electricalConductivity: z
    .number()
    .describe(
      "Electrical Conductivity (supporting/observational parameter) in µS/cm",
    ),
  temperature: z.number().describe("Water temperature in °C"),
  flowRate: z.number().describe("Flow rate in L/min"),
  hardness: z.number().describe("Water hardness in mg/L CaCO3 equivalent"),
});
export type WaterQualityReading = z.infer<typeof WaterQualityReadingSchema>;

export const StageReadingSchema = z.object({
  source: WaterQualityReadingSchema,
  output: WaterQualityReadingSchema,
  timestamp: z.string().datetime(),
});
export type StageReading = z.infer<typeof StageReadingSchema>;
