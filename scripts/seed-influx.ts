import { Point } from "@influxdata/influxdb-client";

import { serverConfig } from "../src/server/config";
import {
  getInfluxQueryApi,
  getInfluxWriteApi,
  isInfluxDBConfigured,
} from "../src/server/db/influx";
import { evaluateWaterSafety } from "../src/server/services/water-safety";

async function main() {
  console.log("🌊 HydroGrid InfluxDB Historical Seeder Starting...");

  if (!isInfluxDBConfigured()) {
    console.error(
      "❌ InfluxDB is not configured. Check your environment variables.",
    );
    process.exit(1);
  }

  console.log(`📍 InfluxDB URL: ${serverConfig.INFLUXDB_URL}`);
  console.log(`🏢 Organization: ${serverConfig.INFLUXDB_ORG}`);
  console.log(`🪣 Bucket: ${serverConfig.INFLUXDB_BUCKET}`);

  const writeApi = getInfluxWriteApi();
  if (!writeApi) {
    console.error("❌ Failed to initialize InfluxDB Write API.");
    process.exit(1);
  }

  const siteId = "00000000-0000-0000-0000-000000000001";
  const intervalMinutes = 5;
  const now =
    Math.floor(Date.now() / (intervalMinutes * 60 * 1000)) *
    (intervalMinutes * 60 * 1000);
  const totalHours = 48;
  const totalPoints = (totalHours * 60) / intervalMinutes; // 576 points

  console.log(
    `⏳ Generating ${totalPoints} historical telemetry records (48h window, 5m cadence)...`,
  );

  const points: Array<Point> = [];

  for (let i = totalPoints; i >= 0; i--) {
    const timestampMs = now - i * intervalMinutes * 60 * 1000;
    const pointDate = new Date(timestampMs);
    const hoursAgo = i * (intervalMinutes / 60);

    // Diurnal temperature cycle (22°C night, 27°C afternoon peak)
    const diurnalTemp =
      24.5 + 2.5 * Math.sin((pointDate.getHours() - 9) * (Math.PI / 12));
    const tempNoise = (Math.random() - 0.5) * 0.4;
    const temperature = Number((diurnalTemp + tempNoise).toFixed(1));

    // Natural demand-based flow generation: baseline 30–35 L/min (well below 45 L/min rated capacity)
    // Diurnal demand pattern: higher morning/evening, lower at night
    const demandHour = pointDate.getHours();
    const demandCycle =
      0.4 + 0.6 * Math.abs(Math.sin((demandHour - 3) * (Math.PI / 12)));
    const baseFlowRate = 30.0 + demandCycle * 5.5; // 30.0 – 35.5 L/min range
    const flowNoise = (Math.random() - 0.5) * 1.4;
    let flowRate = Number(
      Math.max(27.0, Math.min(44.5, baseFlowRate + flowNoise)).toFixed(1),
    );

    // Occasional high-demand burst (~8% of points) → 38–42 L/min
    if (Math.random() < 0.08) {
      flowRate = Number((38.0 + Math.random() * 4.0).toFixed(1));
    }

    let ph = Number((7.35 + (Math.random() - 0.5) * 0.15).toFixed(2));
    let turbidity = Number((1.05 + (Math.random() - 0.5) * 0.25).toFixed(2));
    let heavyMetals = Number((0.002 + Math.random() * 0.001).toFixed(4));
    const dissolvedOxygen = Number(
      (7.6 + (Math.random() - 0.5) * 0.3).toFixed(1),
    );
    let tds = Number((210 + (Math.random() - 0.5) * 20).toFixed(0));
    let electricalConductivity = Number((tds * 1.48).toFixed(0));
    const hardness = Number((138 + (Math.random() - 0.5) * 10).toFixed(0));
    // Episode 1: Acid Mine Drainage (AMD) Influx & Automated Neutralization (18h to 15h ago)
    if (hoursAgo >= 15.0 && hoursAgo <= 18.0) {
      const peakFactor = 1 - Math.abs(hoursAgo - 16.5) / 1.5; // 0 to 1 peak at 16.5h ago
      ph = Number(
        (7.35 - peakFactor * 1.65 + (Math.random() - 0.5) * 0.1).toFixed(2),
      ); // Dips down to ~5.7
      turbidity = Number((1.05 + peakFactor * 2.9).toFixed(2)); // Rises to ~3.95 NTU
      heavyMetals = Number((0.002 + peakFactor * 0.0065).toFixed(4)); // Bumps to ~0.0085 ppm
      tds = Number((210 + peakFactor * 175).toFixed(0)); // Rises to ~385 ppm
      electricalConductivity = Number((tds * 1.55).toFixed(0));
      // Flow stays in normal demand range during AMD – this is a contamination event, not a surge
    }

    // Episode 2: Late-night low-demand trough (38h to 36h ago) → dips to ~25 L/min
    if (hoursAgo >= 36.0 && hoursAgo <= 38.0) {
      const troughFactor = 1 - Math.abs(hoursAgo - 37.0) / 1.0;
      flowRate = Number(
        (30.0 - troughFactor * 5.5 + (Math.random() - 0.5) * 0.8).toFixed(1),
      ); // ~24–26 L/min at trough
    }

    // Episode 3: Pre-dawn low-demand dip (9.5h to 8h ago) → dips to ~25 L/min again
    if (hoursAgo >= 8.0 && hoursAgo <= 9.5) {
      const troughFactor = 1 - Math.abs(hoursAgo - 8.75) / 0.75;
      flowRate = Number(
        (30.0 - troughFactor * 5.8 + (Math.random() - 0.5) * 0.6).toFixed(1),
      ); // ~24–25.5 L/min
    }

    // Episode 4: Morning demand peak (12h to 11h ago) → flow rises to ~40 L/min
    if (hoursAgo >= 11.0 && hoursAgo <= 12.0) {
      const peakFactor = 1 - Math.abs(hoursAgo - 11.5) / 0.5;
      flowRate = Number(
        (35.0 + peakFactor * 6.0 + (Math.random() - 0.5) * 0.8).toFixed(1),
      ); // ~39–41 L/min
    }

    const reading = {
      ph,
      turbidity,
      heavyMetals,
      dissolvedOxygen,
      tds,
      electricalConductivity,
      temperature,
      flowRate,
      hardness,
    };

    const safety = evaluateWaterSafety(reading);

    const point = new Point("water_quality")
      .tag("site_id", siteId)
      .tag("device_id", "00000000-0000-0000-0000-000000000101")
      .floatField("ph", ph)
      .floatField("turbidity", turbidity)
      .floatField("heavyMetals", heavyMetals)
      .floatField("dissolvedOxygen", dissolvedOxygen)
      .floatField("tds", tds)
      .floatField("electricalConductivity", electricalConductivity)
      .floatField("temperature", temperature)
      .floatField("flowRate", flowRate)
      .floatField("hardness", hardness)
      .intField("safety_score", safety.score)
      .stringField("safety_status", safety.status)
      .stringField("quality_gate", safety.qualityGate)
      .stringField("water_release", safety.waterRelease)
      .timestamp(pointDate);

    points.push(point);
  }

  console.log(
    `📤 Writing ${points.length} points to InfluxDB bucket '${serverConfig.INFLUXDB_BUCKET}'...`,
  );

  // Write points in chunks of 100
  const chunkSize = 100;
  for (let c = 0; c < points.length; c += chunkSize) {
    const chunk = points.slice(c, c + chunkSize);
    writeApi.writePoints(chunk);
    process.stdout.write(
      `  ... written ${Math.min(c + chunkSize, points.length)}/${points.length} points\r`,
    );
  }
  console.log("\n💾 Flushing write buffer to cloud...");
  await writeApi.close();
  console.log("✅ InfluxDB write pipeline flushed and closed successfully!");

  // Verify by querying back
  console.log("🔍 Verifying telemetry rows from InfluxDB...");
  const queryApi = getInfluxQueryApi();
  if (queryApi) {
    const verifyFlux = `
      from(bucket: "${serverConfig.INFLUXDB_BUCKET}")
        |> range(start: -48h)
        |> filter(fn: (r) => r._measurement == "water_quality" and r.site_id == "${siteId}")
        |> count()
    `;
    try {
      const rows = await queryApi.collectRows(verifyFlux);
      console.log(
        `✨ Verification successful! Total records stored across fields:`,
        rows.length > 0 ? (rows[0] as Record<string, unknown>)._value : 0,
      );
    } catch (err) {
      console.warn("Notice during count verification query:", err);
    }
  }

  console.log(
    "🎉 Seeding complete! All historical time-series data is live in InfluxDB.",
  );
}

main().catch((err) => {
  console.error("❌ Seeding failed with error:", err);
  process.exit(1);
});
