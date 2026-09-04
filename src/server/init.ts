import { startMqttClient } from "./services/mqtt";

let isInitialized = false;

/**
 * Ensures singleton server background services (e.g. MQTT client)
 * are started on server startup.
 */
export function ensureServerInitialized(): void {
  if (isInitialized) {
    return;
  }
  isInitialized = true;

  try {
    startMqttClient();
  } catch (err) {
    console.error("[SERVER_INIT] Error starting background services:", err);
  }
}

// Auto-initialize on module load in server context
if (typeof window === "undefined") {
  ensureServerInitialized();
}
