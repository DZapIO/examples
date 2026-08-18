/**
 * Minimal REST helper for backend endpoints the SDK doesn't cover yet.
 *
 * Everything else in this app goes through the DZap SDK singleton. Limit orders
 * can't: the linked SDK build predates the feature — its `zapPathAction` has no
 * `limitOrder`, its `zapStepAction` only knows `execute` (so `dZap.zap()` cannot
 * run the `sign` + `broadcast` steps a limit order returns), and its
 * `ZapRouteRequestPositionDetails` is `{ nftId }` with no limit-price fields.
 * Until the SDK catches up, those endpoints are called directly.
 */

const DEFAULT_BASE_URL = "https://staging.dzap.io/v1";

/** Accepts a base with or without the `/v1` suffix and always yields one with it. */
const normalizeBaseUrl = (url: string) => {
  const trimmed = url.replace(/\/+$/, "");
  return trimmed.endsWith("/v1") ? trimmed : `${trimmed}/v1`;
};

// The same backend the SDK talks to: Vite's `define` substitutes this at build
// time from ZAP_API_URL, so there's one place to point at a local backend.
const configuredBaseUrl = process.env.ZAP_API_URL;

export const API_BASE_URL = configuredBaseUrl
  ? normalizeBaseUrl(configuredBaseUrl)
  : DEFAULT_BASE_URL;

/** Every backend route wraps its result as `{ status, data }` (see handleServiceCall). */
type ApiEnvelope<T> = { status: string; data: T; message?: string };

/** Calls a backend route and unwraps its envelope, throwing the server message on failure. */
export async function apiRequest<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "x-api-key": (import.meta.env.VITE_DZAP_API_KEY as string) ?? "",
      ...init?.headers,
    },
  });

  const body = (await response
    .json()
    .catch(() => null)) as ApiEnvelope<T> | null;

  if (!response.ok || !body || body.status === "error") {
    throw new Error(
      body?.message ?? `Request to ${path} failed (${response.status})`
    );
  }

  return body.data;
}

/** POST JSON to a backend route. */
export const postJson = <T>(path: string, payload: unknown) =>
  apiRequest<T>(path, { method: "POST", body: JSON.stringify(payload) });
