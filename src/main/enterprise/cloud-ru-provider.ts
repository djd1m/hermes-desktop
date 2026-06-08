/**
 * Cloud.ru Foundation Models provider registration.
 *
 * Cloud.ru Foundation Models API is OpenAI-compatible, so we only need
 * to register the base URL and env-key mapping. No custom transport needed.
 *
 * Endpoint: https://foundation-models.api.cloud.ru/v1
 * Auth: Bearer token (service-account API key)
 * Default model: ai-sage/GigaChat3-10B-A1.8B
 *
 * This file is part of the enterprise extension layer and does NOT
 * modify upstream files. It extends PROVIDER_BASE_URLS at runtime.
 */

import { PROVIDER_BASE_URLS } from "../provider-registry";

/** Enterprise provider definitions — appended to the upstream registry at init. */
const ENTERPRISE_PROVIDERS: Record<string, string> = {
  "cloud-ru": "https://foundation-models.api.cloud.ru/v1",
};

/**
 * Register enterprise providers into the upstream PROVIDER_BASE_URLS map.
 * Safe to call multiple times — skips already-registered entries.
 */
export function registerEnterpriseProviders(): void {
  for (const [id, url] of Object.entries(ENTERPRISE_PROVIDERS)) {
    if (!(id in PROVIDER_BASE_URLS)) {
      PROVIDER_BASE_URLS[id] = url;
    }
  }
}
