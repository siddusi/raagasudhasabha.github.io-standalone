"use client";

import { PAYPAL_CLIENT_ID } from "@/lib/commerce-config";

declare global {
  interface Window {
    paypal?: any;
  }
}

let loader: Promise<any> | null = null;

/**
 * Load the PayPal JS SDK exactly once per page.
 *
 * `enable-funding=venmo,paylater` turns on the Venmo and Pay Later buttons;
 * the black "Debit or Credit Card" button is part of the standard Buttons
 * component, so a single integration covers PayPal, Venmo, Pay Later and
 * guest card payments without a second provider.
 *
 * `disable-funding=credit` drops the older PayPal Credit tile, which most
 * US non-profits don't want alongside Pay Later.
 */
export function loadPayPal(): Promise<any> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("PayPal SDK is browser-only"));
  }
  if (window.paypal) return Promise.resolve(window.paypal);
  if (loader) return loader;

  loader = new Promise((resolve, reject) => {
    const params = new URLSearchParams({
      "client-id": PAYPAL_CLIENT_ID,
      currency: "USD",
      intent: "capture",
      components: "buttons",
      "enable-funding": "venmo,paylater",
      "disable-funding": "credit",
    });

    const script = document.createElement("script");
    script.src = `https://www.paypal.com/sdk/js?${params.toString()}`;
    script.async = true;
    script.onload = () => {
      if (window.paypal) resolve(window.paypal);
      else reject(new Error("PayPal SDK loaded but window.paypal is missing"));
    };
    script.onerror = () => {
      loader = null; // allow a retry
      reject(new Error("Could not reach PayPal"));
    };
    document.head.appendChild(script);
  });

  return loader;
}
