/**
 * Enterprise extension layer for Hermes Desktop.
 *
 * All custom enterprise features live here to minimize merge conflicts
 * with upstream (fathah/hermes-desktop). Only this module's init()
 * function is called from the upstream codebase (src/main/index.ts).
 *
 * Guidelines:
 * - Keep new features in separate files under src/main/enterprise/
 * - Avoid modifying upstream files — use extension points instead
 * - Register providers, IPC handlers, and screens through this init()
 */

import { registerEnterpriseProviders } from "./cloud-ru-provider";
import { initCloudRuAgents } from "./cloud-ru-agents";

/**
 * Initialize all enterprise extensions.
 * Called once from src/main/index.ts after standard setup completes.
 */
export async function initEnterprise(): Promise<void> {
  // Synchronous: register Cloud.ru FM provider
  registerEnterpriseProviders();

  // Async: initialize Cloud.ru AI Agents (OIDC auth, catalog, delegation)
  try {
    await initCloudRuAgents();
  } catch (err) {
    console.warn("[enterprise] cloud-ru-agents: init failed", err);
    // Module failure does NOT propagate — other features continue
  }
}
