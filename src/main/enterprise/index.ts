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

/**
 * Initialize all enterprise extensions.
 * Called once from src/main/index.ts after standard setup completes.
 */
export function initEnterprise(): void {
  registerEnterpriseProviders();
}
