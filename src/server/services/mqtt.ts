import * as mqtt from "mqtt";

import { getServerConfig } from "../config";
import { broadcastSiteEvent } from "./event-bus";
import {
  processCalibrationIngestion,
  processTelemetryIngestion,
} from "./ingestion";

export interface MqttStatus {
  enabled: boolean;
  connected: boolean;
  brokerUrl?: string;
  clientId?: string;
  subscribedTopics: Array<string>;
  lastMessageAt?: string;
  messagesReceived: number;
}

const DEFAULT_SUB_TOPICS = [
  "hydrogrid/sites/+/telemetry",
  "hydrogrid/+/telemetry",
  "hydrogrid/sites/+/calibration",
  "hydrogrid/sites/+/devices/+/heartbeat",
];

declare global {
  var __hydrogridMqttClient: mqtt.MqttClient | null | undefined;
  var __hydrogridMqttConnecting: boolean | undefined;
  var __hydrogridMqttConnectedBrokerUrl: string | undefined;
  var __hydrogridMqttMessagesReceivedCount: number | undefined;
  var __hydrogridMqttLastMessageTimestamp: string | undefined;
}

function getMqttClient(): mqtt.MqttClient | null {
  return globalThis.__hydrogridMqttClient ?? null;
}

function setMqttClient(client: mqtt.MqttClient | null) {
  globalThis.__hydrogridMqttClient = client;
}

function isMqttConnecting(): boolean {
  return globalThis.__hydrogridMqttConnecting ?? false;
}

function setMqttConnecting(val: boolean) {
  globalThis.__hydrogridMqttConnecting = val;
}

function getConnectedBrokerUrl(): string | undefined {
  return globalThis.__hydrogridMqttConnectedBrokerUrl;
}

function setConnectedBrokerUrl(url: string | undefined) {
  globalThis.__hydrogridMqttConnectedBrokerUrl = url;
}

function getMessagesReceivedCount(): number {
  return globalThis.__hydrogridMqttMessagesReceivedCount ?? 0;
}

function incrementMessagesReceivedCount() {
  globalThis.__hydrogridMqttMessagesReceivedCount =
    (globalThis.__hydrogridMqttMessagesReceivedCount ?? 0) + 1;
}

function getLastMessageTimestamp(): string | undefined {
  return globalThis.__hydrogridMqttLastMessageTimestamp;
}

function setLastMessageTimestamp(ts: string) {
  globalThis.__hydrogridMqttLastMessageTimestamp = ts;
}

/**
 * Normalizes user-configured broker URLs to valid MQTT connection strings.
 * Automatically enforces secure TLS (mqtts:// and port 8883) for cloud brokers like HiveMQ Cloud.
 */
export function normalizeMqttBrokerUrl(rawUrl: string): string {
  let url = rawUrl.trim();

  // If pointing to HiveMQ Cloud (*.hivemq.cloud), enforce mqtts on port 8883
  if (url.includes("hivemq.cloud")) {
    url = url.replace(/^(mqtt|tcp):\/\//i, "");
    if (!/^(mqtts|tls|ssl|wss):\/\//i.test(url)) {
      url = `mqtts://${url}`;
    }

    try {
      const urlObj = new URL(url);
      if (!urlObj.port) {
        urlObj.port = urlObj.protocol === "wss:" ? "8884" : "8883";
      }
      return `${urlObj.protocol}//${urlObj.host}`;
    } catch {
      if (!/:\d+$/.test(url)) {
        url = `${url}:8883`;
      }
      return url;
    }
  }

  // Generic broker URLs: if missing protocol, default to mqtt://
  if (!/^[a-zA-Z0-9+-.]+:\/\//.test(url)) {
    url = `mqtt://${url}`;
  }

  return url;
}

/**
 * Parses MQTT topics to extract siteId, deviceId, and action.
 */
export function parseMqttTopic(topic: string): {
  type: "telemetry" | "calibration" | "heartbeat" | "unknown";
  siteId?: string;
  deviceId?: string;
} {
  // hydrogrid/sites/:siteId/telemetry
  const siteTelemetryMatch = topic.match(
    /^hydrogrid\/sites\/([^/]+)\/telemetry$/,
  );
  if (siteTelemetryMatch) {
    return { type: "telemetry", siteId: siteTelemetryMatch[1] };
  }

  // hydrogrid/:siteId/telemetry (short alias)
  const aliasTelemetryMatch = topic.match(/^hydrogrid\/([^/]+)\/telemetry$/);
  if (aliasTelemetryMatch) {
    return { type: "telemetry", siteId: aliasTelemetryMatch[1] };
  }

  // hydrogrid/sites/:siteId/calibration
  const calibrationMatch = topic.match(
    /^hydrogrid\/sites\/([^/]+)\/calibration$/,
  );
  if (calibrationMatch) {
    return { type: "calibration", siteId: calibrationMatch[1] };
  }

  // hydrogrid/sites/:siteId/devices/:deviceId/heartbeat
  const heartbeatMatch = topic.match(
    /^hydrogrid\/sites\/([^/]+)\/devices\/([^/]+)\/heartbeat$/,
  );
  if (heartbeatMatch) {
    return {
      type: "heartbeat",
      siteId: heartbeatMatch[1],
      deviceId: heartbeatMatch[2],
    };
  }

  return { type: "unknown" };
}

/**
 * Handles incoming MQTT message payload according to matched topic.
 */
export async function handleMqttMessage(
  topic: string,
  payloadBuffer: Buffer | Uint8Array,
): Promise<void> {
  incrementMessagesReceivedCount();
  setLastMessageTimestamp(new Date().toISOString());

  let payloadJson: unknown;
  try {
    const rawString = payloadBuffer.toString();
    payloadJson = JSON.parse(rawString);
  } catch {
    console.warn(`[MQTT] Ignored non-JSON message on topic: ${topic}`);
    return;
  }

  const parsed = parseMqttTopic(topic);

  switch (parsed.type) {
    case "telemetry": {
      if (!parsed.siteId) return;
      try {
        await processTelemetryIngestion(parsed.siteId, payloadJson, {
          source: "MQTT",
          onValveChange: (siteId, valveState, reason) => {
            publishMqttValveActuation(siteId, valveState, reason);
          },
        });
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        console.error(
          `[MQTT] Error processing telemetry for site ${parsed.siteId}:`,
          errorMsg,
        );
      }
      break;
    }

    case "calibration": {
      if (!parsed.siteId) return;
      try {
        await processCalibrationIngestion(parsed.siteId, payloadJson, {
          source: "MQTT",
        });
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        console.error(
          `[MQTT] Error processing calibration for site ${parsed.siteId}:`,
          errorMsg,
        );
      }
      break;
    }

    case "heartbeat": {
      if (!parsed.siteId || !parsed.deviceId) return;
      broadcastSiteEvent(parsed.siteId, "device.status-changed", {
        siteId: parsed.siteId,
        deviceId: parsed.deviceId,
        status: "ONLINE",
        lastHeartbeat: new Date().toISOString(),
        payload: payloadJson,
      });
      break;
    }

    default:
      // Unknown or unsupported topic
      break;
  }
}

/**
 * Initializes and starts the MQTT client if configured in environment variables.
 */
export function startMqttClient(): mqtt.MqttClient | null {
  const config = getServerConfig();
  const rawBrokerUrl = config.MQTT_BROKER_URL;
  const isExplicitlyEnabled = config.MQTT_ENABLED;

  if (!rawBrokerUrl && !isExplicitlyEnabled) {
    return null;
  }

  if (!rawBrokerUrl) {
    console.warn(
      "[MQTT] MQTT_ENABLED is true, but MQTT_BROKER_URL is missing. Skipping MQTT connection.",
    );
    return null;
  }

  const brokerUrl = normalizeMqttBrokerUrl(rawBrokerUrl);

  const currentClient = getMqttClient();
  const currentBroker = getConnectedBrokerUrl();

  // If already connected to this exact broker, return existing client
  if (currentClient && currentBroker === brokerUrl) {
    return currentClient;
  }

  // If connected to a different broker (e.g. env changed from localhost to HiveMQ), close the previous one
  if (currentClient) {
    try {
      currentClient.end(true);
    } catch {
      // ignore
    }
    setMqttClient(null);
    setMqttConnecting(false);
  }

  if (isMqttConnecting()) {
    return null;
  }

  setMqttConnecting(true);
  setConnectedBrokerUrl(brokerUrl);

  const baseClientId = config.MQTT_CLIENT_ID || "hydrogrid-server";
  const clientId = `${baseClientId}-${Math.random().toString(16).substring(2, 8)}`;

  const options: mqtt.IClientOptions = {
    clientId,
    clean: true,
    reconnectPeriod: 5000,
    connectTimeout: 30000,
  };

  if (config.MQTT_USERNAME) {
    options.username = config.MQTT_USERNAME;
  }
  if (config.MQTT_PASSWORD) {
    options.password = config.MQTT_PASSWORD;
  }

  try {
    const client = mqtt.connect(brokerUrl, options);
    setMqttClient(client);

    client.on("connect", () => {
      setMqttConnecting(false);
      console.log(
        `[MQTT] Connected to broker: ${brokerUrl} (Client ID: ${clientId})`,
      );

      // Subscribe to data entry topics with QoS 1
      client.subscribe(DEFAULT_SUB_TOPICS, { qos: 1 }, (err) => {
        if (err) {
          console.error("[MQTT] Subscription error:", err);
        } else {
          console.log(
            `[MQTT] Subscribed to topics: ${DEFAULT_SUB_TOPICS.join(", ")}`,
          );
        }
      });
    });

    client.on("message", (topic, payload) => {
      void handleMqttMessage(topic, payload);
    });

    client.on("error", (err) => {
      console.warn(`[MQTT] Connection error to ${brokerUrl}:`, err.message);
    });

    client.on("offline", () => {
      console.warn("[MQTT] Broker offline, awaiting reconnection...");
    });

    client.on("close", () => {
      // Disconnected
    });

    return client;
  } catch (err: unknown) {
    setMqttConnecting(false);
    setConnectedBrokerUrl(undefined);
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("[MQTT] Failed to initialize MQTT client:", errorMsg);
    return null;
  }
}

/**
 * Publishes a valve actuation command over MQTT for edge node execution.
 */
export function publishMqttValveActuation(
  siteId: string,
  valveState: "OPEN" | "CLOSED",
  reason: string,
): boolean {
  return publishMqtt(`hydrogrid/sites/${siteId}/actuators/valve`, {
    siteId,
    actuator: "12V_SOLENOID_SHUTOFF_VALVE",
    state: valveState,
    reason,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Generic helper to publish an MQTT message.
 */
export function publishMqtt(
  topic: string,
  payload: unknown,
  options?: mqtt.IClientPublishOptions,
): boolean {
  const client = getMqttClient();
  if (!client || !client.connected) {
    return false;
  }

  try {
    const stringPayload =
      typeof payload === "string" ? payload : JSON.stringify(payload);

    client.publish(topic, stringPayload, options ?? { qos: 1 });
    return true;
  } catch (err) {
    console.error(`[MQTT] Failed to publish message to topic ${topic}:`, err);
    return false;
  }
}

/**
 * Returns the current runtime status of the MQTT client.
 */
export function getMqttStatus(): MqttStatus {
  const config = getServerConfig();
  const rawBrokerUrl = config.MQTT_BROKER_URL;
  const brokerUrl = rawBrokerUrl
    ? normalizeMqttBrokerUrl(rawBrokerUrl)
    : undefined;
  const isEnabled = Boolean(config.MQTT_ENABLED || rawBrokerUrl);
  const client = getMqttClient();

  return {
    enabled: isEnabled,
    connected: Boolean(client && client.connected),
    brokerUrl,
    clientId: config.MQTT_CLIENT_ID,
    subscribedTopics: DEFAULT_SUB_TOPICS,
    lastMessageAt: getLastMessageTimestamp(),
    messagesReceived: getMessagesReceivedCount(),
  };
}

/**
 * Gracefully terminates the MQTT client connection.
 */
export function stopMqttClient(): Promise<void> {
  return new Promise((resolve) => {
    const client = getMqttClient();
    if (!client) {
      resolve();
      return;
    }

    client.end(false, {}, () => {
      setMqttClient(null);
      setMqttConnecting(false);
      setConnectedBrokerUrl(undefined);
      resolve();
    });
  });
}
