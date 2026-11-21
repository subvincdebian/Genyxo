"use client";
/**
 * Minimal Stripe.js loader. Card data is entered in Stripe's own iframe and
 * goes straight to Stripe; Genyxo servers only ever see a payment method id.
 * Stripe requires loading Stripe.js from js.stripe.com (never bundled).
 */
export type StripeElement = {
  mount: (target: HTMLElement) => void;
  destroy: () => void;
  on: (event: string, handler: (event: { complete?: boolean }) => void) => void;
};
export type StripeElements = {
  create: (type: "payment", options?: Record<string, unknown>) => StripeElement;
  submit: () => Promise<{ error?: { message?: string } }>;
};
export type StripeClient = {
  elements: (options: Record<string, unknown>) => StripeElements;
  confirmSetup: (options: {
    elements: StripeElements;
    redirect: "if_required";
    confirmParams?: Record<string, unknown>;
  }) => Promise<{
    error?: { message?: string };
    setupIntent?: { id: string; status: string };
  }>;
};
declare global {
  interface Window {
    Stripe?: (key: string, options?: Record<string, unknown>) => StripeClient;
  }
}

let loading: Promise<void> | null = null;
export function loadStripe(publishableKey: string): Promise<StripeClient> {
  if (!/^pk_(?:test|live)_[A-Za-z0-9]+$/.test(publishableKey))
    return Promise.reject(new Error("Card payments are not configured."));
  loading ??= new Promise<void>((resolve, reject) => {
    if (window.Stripe) return resolve();
    const script = document.createElement("script");
    script.src = "https://js.stripe.com/v3/";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      loading = null;
      reject(new Error("Could not reach the payment provider. Try again."));
    };
    document.head.append(script);
  });
  return loading.then(() => {
    if (!window.Stripe) throw new Error("Payment provider unavailable.");
    return window.Stripe(publishableKey);
  });
}
