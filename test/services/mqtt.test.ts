import { describe, expect, it } from "bun:test";

import { getServerConfig } from "../../src/server/config";
import {
  getLatestTelemetry,
  subscribeToSiteEvents,
} from "../../src/server/services";
import {
  handleMqttMessage,
  normalizeMqttBrokerUrl,
  parseMqttTopic,
} from "../../src/server/services/mqtt";

describe("MQTT Data Entry & Topic Routing", () => {
  it("parses telemetry topics correctly", () => {
    const siteId = "00000000-0000-0000-0000-000000000001";

    const standard = parseMqttTopic(`hydrogrid/sites/${siteId}/telemetry`);
    expect(standard.type).toBe("telemetry");
    expect(standard.siteId).toBe(siteId);

    const alias = parseMqttTopic(`hydrogrid/${siteId}/telemetry`);
    expect(alias.type).toBe("telemetry");
    expect(alias.siteId).toBe(siteId);
  });

  it("parses calibration topics correctly", () => {
    const siteId = "site-cal-test";
    const result = parseMqttTopic(`hydrogrid/sites/${siteId}/calibration`);
    expect(result.type).toBe("calibration");
    expect(result.siteId).toBe(siteId);
  });

  it("parses device heartbeat topics correctly", () => {
    const siteId = "site-heartbeat-test";
    const deviceId = "dev-esp32-node-0";
    const result = parseMqttTopic(
      `hydrogrid/sites/${siteId}/devices/${deviceId}/heartbeat`,
    );
    expect(result.type).toBe("heartbeat");
    expect(result.siteId).toBe(siteId);
    expect(result.deviceId).toBe(deviceId);
  });

  it("returns unknown for unsupported topics", () => {
    expect(parseMqttTopic("unknown/topic").type).toBe("unknown");
    expect(parseMqttTopic("hydrogrid/sites").type).toBe("unknown");
  });

  it("safely ignores non-JSON message payloads without throwing", async () => {
    const invalidBuffer = Buffer.from("invalid-non-json-string");
    await expect(
      handleMqttMessage(
        "hydrogrid/sites/00000000-0000-0000-0000-000000000001/telemetry",
        invalidBuffer,
      ),
    ).resolves.toBeUndefined();
  });

  it("processes valid telemetry payload over MQTT topic and updates state", async () => {
    const siteId = "00000000-0000-0000-0000-000000000001";
    const events: Array<{ type: string; data: unknown }> = [];

    const unsubscribe = subscribeToSiteEvents(siteId, (evt) => {
      events.push(evt);
    });

    const payload = {
      ph: 7.4,
      turbidity: 1.1,
      heavyMetals: 0.002,
      dissolvedOxygen: 7.0,
      tds: 180,
      electricalConductivity: 290,
      temperature: 23.5,
      flowRate: 44.5,
      hardness: 110,
    };

    const topic = `hydrogrid/sites/${siteId}/telemetry`;
    await handleMqttMessage(topic, Buffer.from(JSON.stringify(payload)));

    // Verify site telemetry state was updated
    const latest = getLatestTelemetry(siteId);
    expect(latest).toBeDefined();
    expect(latest?.reading.turbidity).toBe(1.1);
    expect(latest?.reading.temperature).toBe(23.5);
    expect(latest?.safety?.qualityGate).toBe("PASS");

    // Verify SSE events were broadcasted
    expect(events.some((e) => e.type === "water-quality.updated")).toBe(true);
    expect(events.some((e) => e.type === "water-safety.updated")).toBe(true);
    expect(events.some((e) => e.type === "quality-gate.changed")).toBe(true);

    unsubscribe();
  });

  it("processes flat leak telemetry payload over MQTT topic and detects leak", async () => {
    const siteId = "00000000-0000-0000-0000-000000000001";
    const events: Array<{ type: string; data: unknown }> = [];

    const unsubscribe = subscribeToSiteEvents(siteId, (evt) => {
      events.push(evt);
    });

    const leakPayload = {
      ph: 7.2,
      turbidity: 1.0,
      heavyMetals: 0.001,
      dissolvedOxygen: 7.1,
      tds: 190,
      electricalConductivity: 300,
      temperature: 24.0,
      flowRate: 30.0,
      hardness: 115,
      flowMismatchPercent: 25.0, // > 15% threshold
    };

    const topic = `hydrogrid/sites/${siteId}/telemetry`;
    await handleMqttMessage(topic, Buffer.from(JSON.stringify(leakPayload)));

    const latest = getLatestTelemetry(siteId);
    expect(latest?.safety?.qualityGate).toBe("FAIL");
    expect(latest?.safety?.waterRelease).toBe("BLOCKED");

    expect(events.some((e) => e.type === "leak.detected")).toBe(true);

    unsubscribe();
  });
});

describe("MQTT Server Config Schema", () => {
  it("reads MQTT configuration properties from environment variables", () => {
    const originalUrl = process.env.MQTT_BROKER_URL;
    const originalClient = process.env.MQTT_CLIENT_ID;

    process.env.MQTT_BROKER_URL = "mqtt://127.0.0.1:1883";
    process.env.MQTT_CLIENT_ID = "test-client";
    process.env.MQTT_ENABLED = "true";

    const config = getServerConfig();
    expect(config.MQTT_BROKER_URL).toBe("mqtt://127.0.0.1:1883");
    expect(config.MQTT_CLIENT_ID).toBe("test-client");
    expect(config.MQTT_ENABLED).toBe(true);

    // Cleanup
    process.env.MQTT_BROKER_URL = originalUrl;
    process.env.MQTT_CLIENT_ID = originalClient;
    delete process.env.MQTT_ENABLED;
  });

  it("normalizes HiveMQ Cloud and standard broker URLs", () => {
    // Naked host from HiveMQ Cloud dashboard
    expect(
      normalizeMqttBrokerUrl(
        "b0bfb699a26b4ad985fe54c437738240.s1.eu.hivemq.cloud",
      ),
    ).toBe("mqtts://b0bfb699a26b4ad985fe54c437738240.s1.eu.hivemq.cloud:8883");

    // Insecure mqtt:// scheme pointing to HiveMQ Cloud gets upgraded to mqtts:8883
    expect(
      normalizeMqttBrokerUrl(
        "mqtt://b0bfb699a26b4ad985fe54c437738240.s1.eu.hivemq.cloud",
      ),
    ).toBe("mqtts://b0bfb699a26b4ad985fe54c437738240.s1.eu.hivemq.cloud:8883");

    // Host with port 8883 but missing scheme
    expect(
      normalizeMqttBrokerUrl(
        "b0bfb699a26b4ad985fe54c437738240.s1.eu.hivemq.cloud:8883",
      ),
    ).toBe("mqtts://b0bfb699a26b4ad985fe54c437738240.s1.eu.hivemq.cloud:8883");

    // Standard local or third-party brokers
    expect(normalizeMqttBrokerUrl("localhost:1883")).toBe(
      "mqtt://localhost:1883",
    );
    expect(normalizeMqttBrokerUrl("mqtts://broker.example.com:8883")).toBe(
      "mqtts://broker.example.com:8883",
    );
  });
});
