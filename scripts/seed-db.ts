import { getPrismaClient } from "../src/server/db/prisma";

async function seed() {
  console.log("🌱 Starting HydroGrid PostgreSQL seeding with Prisma...");

  const prisma = getPrismaClient();
  if (!prisma) {
    console.error(
      "❌ Prisma Client could not be initialized. Check DATABASE_URL in your .env file.",
    );
    process.exit(1);
  }

  const siteId = "00000000-0000-0000-0000-000000000001";

  // 1. Seed Site
  console.log("📍 Seeding Site...");
  const site = await prisma.site.upsert({
    where: { id: siteId },
    update: {
      name: "Node Zero — IIITD Pilot",
      village: "IIIT-Delhi Campus (Okhla)",
      district: "South East Delhi",
      state: "Delhi",
      latitude: 28.5459,
      longitude: 77.2732,
      status: "ONLINE",
    },
    create: {
      id: siteId,
      name: "Node Zero — IIITD Pilot",
      village: "IIIT-Delhi Campus (Okhla)",
      district: "South East Delhi",
      state: "Delhi",
      latitude: 28.5459,
      longitude: 77.2732,
      status: "ONLINE",
    },
  });
  console.log(`✅ Site seeded: ${site.name} (${site.id})`);

  // 2. Seed Devices
  console.log("📱 Seeding Devices...");
  const devices = [
    {
      id: "00000000-0000-0000-0000-000000000101",
      siteId,
      name: "Node Zero",
      type: "SOURCE_SENSOR_NODE" as const,
      status: "ONLINE" as const,
      firmwareVersion: "v1.0.0-prototype",
    },
    {
      id: "00000000-0000-0000-0000-000000000102",
      siteId,
      name: "Purification Core PLC",
      type: "PURIFICATION_CONTROLLER" as const,
      status: "ONLINE" as const,
      firmwareVersion: "v3.0.0",
    },
    {
      id: "00000000-0000-0000-0000-000000000103",
      siteId,
      name: "Distribution Flow Monitor",
      type: "DISTRIBUTION_NODE" as const,
      status: "ONLINE" as const,
      firmwareVersion: "v1.8.2",
    },
  ];

  for (const dev of devices) {
    await prisma.device.upsert({
      where: { id: dev.id },
      update: {
        name: dev.name,
        type: dev.type,
        status: dev.status,
        firmwareVersion: dev.firmwareVersion,
        lastSeenAt: new Date(),
      },
      create: {
        id: dev.id,
        siteId: dev.siteId,
        name: dev.name,
        type: dev.type,
        status: dev.status,
        firmwareVersion: dev.firmwareVersion,
        lastSeenAt: new Date(),
      },
    });
  }
  console.log(`✅ ${devices.length} Devices seeded.`);

  // 3. Seed Site Memberships (Admin, Operator, Viewer)
  console.log("👥 Seeding Site Memberships...");
  const memberships = [
    {
      id: "00000000-0000-0000-0000-000000000201",
      userId: "b2aa668a-a16b-405b-89ce-7c912f29fb20",
      siteId,
      role: "ADMIN" as const,
    },
    {
      id: "00000000-0000-0000-0000-000000000202",
      userId: "5f783b88-7799-4736-a2d1-7330129408e5",
      siteId,
      role: "OPERATOR" as const,
    },
    {
      id: "00000000-0000-0000-0000-000000000203",
      userId: "cc651fbe-31fc-4ed8-b4be-bc6346b7dd52",
      siteId,
      role: "VIEWER" as const,
    },
  ];

  for (const mem of memberships) {
    await prisma.siteMembership.upsert({
      where: {
        userId_siteId: {
          userId: mem.userId,
          siteId: mem.siteId,
        },
      },
      update: {
        role: mem.role,
      },
      create: {
        id: mem.id,
        userId: mem.userId,
        siteId: mem.siteId,
        role: mem.role,
      },
    });
  }
  console.log(`✅ ${memberships.length} Memberships seeded.`);

  // 4. Seed Quality Configuration
  console.log("⚙️ Seeding Quality Configuration...");
  await prisma.qualityConfiguration.upsert({
    where: { siteId },
    update: {
      minPh: 6.5,
      maxPh: 8.5,
      maxTds: 500.0,
      maxTurbidity: 5.0,
      maxFlowMismatchPercent: 5.0,
    },
    create: {
      siteId,
      minPh: 6.5,
      maxPh: 8.5,
      maxTds: 500.0,
      maxTurbidity: 5.0,
      maxFlowMismatchPercent: 5.0,
    },
  });
  console.log("✅ Quality configuration seeded.");

  // 5. Seed Initial Calibrations
  console.log("🧪 Seeding Sensor Calibrations...");
  const sensorNames = [
    "ph_sensor",
    "turbidity_sensor",
    "tds_sensor",
    "temp_sensor",
    "flow_sensor",
  ];

  for (const sensor of sensorNames) {
    const existing = await prisma.sensorCalibration.findFirst({
      where: { siteId, sensor },
    });
    if (!existing) {
      await prisma.sensorCalibration.create({
        data: {
          siteId,
          deviceId: devices[0].id,
          sensor,
          status: "HEALTHY",
          offset: 0.0,
          lastCalibratedAt: new Date(),
          nextCalibrationAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });
    }
  }
  console.log("✅ Sensor calibrations seeded.");

  // 6. Seed Initial Filter Maintenance
  console.log("🔧 Seeding Filter Maintenance...");
  const filterTypes = ["SEDIMENT", "CARBON", "CALCITE", "UV"] as const;

  for (const filterType of filterTypes) {
    const existing = await prisma.filterMaintenance.findFirst({
      where: { siteId, filterType },
    });
    if (!existing) {
      await prisma.filterMaintenance.create({
        data: {
          siteId,
          filterType,
          status: "HEALTHY",
          lifePercent: 92.5,
          lastServicedAt: new Date(),
          nextServiceDueAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
          notes: "Operational baseline established.",
        },
      });
    }
  }
  console.log("✅ Filter maintenance records seeded.");

  // 7. Seed Initial Event & Alert
  console.log("📜 Seeding Initial Events & Alerts...");
  const existingEvent = await prisma.event.findFirst({
    where: { siteId, type: "SYSTEM_INITIALIZATION" },
  });
  let eventId: string | undefined = existingEvent?.id;
  if (!existingEvent) {
    const createdEvent = await prisma.event.create({
      data: {
        siteId,
        deviceId: devices[0].id,
        type: "SYSTEM_INITIALIZATION",
        severity: "INFO",
        message: "Node Zero initialized and synchronized with PostgreSQL.",
        acknowledged: true,
      },
    });
    eventId = createdEvent.id;
  }
  console.log("✅ Initial system event seeded.");

  const existingAlert = await prisma.alert.findFirst({
    where: { siteId, type: "SYSTEM_INFO" },
  });
  if (!existingAlert) {
    await prisma.alert.create({
      data: {
        siteId,
        eventId: eventId || null,
        type: "SYSTEM_INFO",
        severity: "WARNING",
        status: "READ",
        message: "HydroGrid PostgreSQL database connected and operational.",
      },
    });
  }
  console.log("✅ Initial alert seeded.");

  console.log("\n🎉 Database seeding complete!");
}

seed()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
