import { SetMetadata } from "@nestjs/common";

export const IDEMPOTENT_KEY = "is_idempotent_operation";

export interface IdempotentOptions {
  /**
   * If true, requests without Idempotency-Key will be rejected with 400 Bad Request.
   * If false, requests without the header proceed without idempotency caching.
   * Default: true.
   */
  required?: boolean;

  /**
   * Time to live for completed responses in seconds. Default: 86400 (24 hours).
   */
  ttlSeconds?: number;

  /**
   * Header name to extract the idempotency key from. Default: 'idempotency-key'.
   */
  headerName?: string;
}

export const Idempotent = (options: IdempotentOptions = {}) =>
  SetMetadata(IDEMPOTENT_KEY, {
    required: options.required ?? true,
    ttlSeconds: options.ttlSeconds ?? 86400,
    headerName: options.headerName?.toLowerCase() ?? "idempotency-key",
  });
