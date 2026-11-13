function integer(env, key, fallback, min, max) {
  const value = Number(env[key] ?? fallback);
  if (!Number.isInteger(value) || value < min || value > max) throw new Error(`Invalid ${key}`);
  return value;
}
export function bookingConfig(env = process.env) {
  const aiUrl = env.AI_ENGINE_URL || '';
  if (aiUrl && !['http:', 'https:'].includes(new URL(aiUrl).protocol)) throw new Error('Invalid AI_ENGINE_URL');
  return {
    maxAttempts: integer(env, 'MAX_ASSIGNMENT_ATTEMPTS', 4, 1, 50),
    offerTimeoutMs: integer(env, 'OFFER_TIMEOUT_SECONDS', 20, 1, 3600) * 1000,
    workerIntervalMs: integer(env, 'OFFER_WORKER_INTERVAL_MS', 1000, 100, 60000),
    aiTimeoutMs: integer(env, 'AI_REQUEST_TIMEOUT_MS', 1500, 10, 10000),
    maxPickupKm: integer(env, 'MAX_PICKUP_KM', 12, 1, 100),
    aiUrl,
  };
}
