/// <reference types="vite/client" />

interface Window {
  ethereum?: import("ethers").providers.ExternalProvider;
}

/**
 * Not the real Node `process` — Vite's `define` (see vite.config.ts) replaces
 * the literal text `process.env.ZAP_API_URL` at build time with the configured
 * backend URL. Declared here so app code can read the same var the SDK does.
 */
declare const process: {
  env: {
    ZAP_API_URL?: string;
  };
};
