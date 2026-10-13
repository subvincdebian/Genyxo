export const CIRCUIT_BREAKER_NAMES = {
  OPENROUTER_CHAT: "openrouter-chat",
  OPENROUTER_IMAGE: "openrouter-image",
  FAL_AI: "fal-ai",
  EXTERNAL_HTTP: "external-http",
} as const;

export type CircuitBreakerName =
  (typeof CIRCUIT_BREAKER_NAMES)[keyof typeof CIRCUIT_BREAKER_NAMES];

export interface CircuitBreakerOptions {
  timeout?: number;
  errorThresholdPercentage?: number;
  resetTimeout?: number;
  rollingCountTimeout?: number;
  volumeThreshold?: number;
}

export const DEFAULT_CIRCUIT_BREAKER_OPTIONS: Record<
  string,
  CircuitBreakerOptions
> = {
  [CIRCUIT_BREAKER_NAMES.OPENROUTER_CHAT]: {
    timeout: 45000,
    errorThresholdPercentage: 50,
    resetTimeout: 30000,
    volumeThreshold: 5,
  },
  [CIRCUIT_BREAKER_NAMES.OPENROUTER_IMAGE]: {
    timeout: 30000,
    errorThresholdPercentage: 50,
    resetTimeout: 30000,
    volumeThreshold: 5,
  },
  [CIRCUIT_BREAKER_NAMES.FAL_AI]: {
    timeout: 60000,
    errorThresholdPercentage: 50,
    resetTimeout: 30000,
    volumeThreshold: 5,
  },
  [CIRCUIT_BREAKER_NAMES.EXTERNAL_HTTP]: {
    timeout: 10000,
    errorThresholdPercentage: 50,
    resetTimeout: 15000,
    volumeThreshold: 5,
  },
};
