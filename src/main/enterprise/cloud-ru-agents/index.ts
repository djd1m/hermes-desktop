/**
 * Cloud.ru AI Agents integration — IPC handler registration.
 *
 * Registers IPC handlers for:
 * - Auth: cloud-ru:auth:{login,callback,logout,status,refresh}
 * - Catalog: cloud-ru:agents:catalog, cloud-ru:agents:sync-status
 * - Delegation: cloud-ru:agents:delegate, cloud-ru:agents:cancel
 */

import { ipcMain, BrowserWindow, app } from "electron";
import { AuthService } from "./auth-service";
import { AgentCatalog } from "./agent-catalog";
import { RestClient } from "./rest-client";
import { DelegationService } from "./delegation-service";
import type { DelegationRequest, DelegationProgressEvent } from "./types";

/** Cloud.ru AI Factory console API base URL */
const CLOUDRU_CONSOLE_API = "https://console.cloud.ru";

let authService: AuthService | null = null;
let agentCatalog: AgentCatalog | null = null;
let delegationService: DelegationService | null = null;

/**
 * Resolve the Cloud.ru API key from HD's env/config system.
 * Uses the same mechanism as other providers — readEnv() IPC.
 */
function getCloudRuApiKey(): string | undefined {
  return process.env.CLOUD_RU_API_KEY || undefined;
}

/**
 * Initialize Cloud.ru AI Agents integration.
 * Called from enterprise/index.ts during app startup.
 */
export async function initCloudRuAgents(): Promise<void> {
  const appDataPath = app.getPath("userData");

  // Initialize auth service
  authService = new AuthService(undefined, appDataPath);
  await authService.initialize();

  // Initialize REST client (uses OIDC token for console APIs)
  const restClient = new RestClient(
    CLOUDRU_CONSOLE_API,
    () => authService!.ensureValidAccessToken(),
    () => {
      // On auth error, notify renderer
      const win = BrowserWindow.getAllWindows()[0];
      if (win) {
        win.webContents.send("cloud-ru:auth:state-changed", authService!.getState());
      }
    },
  );

  // Initialize agent catalog
  agentCatalog = new AgentCatalog(restClient);

  // Initialize delegation service
  delegationService = new DelegationService(agentCatalog, getCloudRuApiKey);

  // Notify renderer on auth state changes
  authService.onAuthStateChanged = (state) => {
    const win = BrowserWindow.getAllWindows()[0];
    if (win) {
      win.webContents.send("cloud-ru:auth:state-changed", state);
    }

    // Start/stop catalog sync based on auth state
    if (state.isAuthenticated && state.projectId) {
      agentCatalog!.startPolling(state.projectId);
    } else {
      agentCatalog!.stopPolling();
    }
  };

  // Register deep-link protocol handler for OIDC callback
  registerProtocolHandler();

  // ─── Auth IPC Handlers ──────────────────────────────────────────

  ipcMain.handle("cloud-ru:auth:login", async () => {
    try {
      await authService!.initiateLogin();
      return { success: true };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  });

  ipcMain.handle("cloud-ru:auth:callback", async (_e, callbackUrl: string) => {
    try {
      const state = await authService!.completeLogin(callbackUrl);
      return state;
    } catch (err) {
      return {
        isAuthenticated: false,
        isLoading: false,
        projectId: null,
        displayName: null,
        expiresAt: null,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  });

  ipcMain.handle("cloud-ru:auth:logout", async () => {
    await authService!.logout();
    agentCatalog!.stopPolling();
    return { success: true };
  });

  ipcMain.handle("cloud-ru:auth:status", () => {
    return authService!.getState();
  });

  ipcMain.handle("cloud-ru:auth:refresh", async () => {
    try {
      await authService!.refreshToken();
      return authService!.getState();
    } catch (err) {
      return {
        isAuthenticated: false,
        isLoading: false,
        projectId: null,
        displayName: null,
        expiresAt: null,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  });

  // ─── Catalog IPC Handlers ──────────────────────────────────────

  ipcMain.handle("cloud-ru:agents:catalog", () => {
    if (!agentCatalog) return [];
    return agentCatalog.listAll();
  });

  ipcMain.handle("cloud-ru:agents:healthy", () => {
    if (!agentCatalog) return [];
    return agentCatalog.listHealthy();
  });

  ipcMain.handle("cloud-ru:agents:sync-status", () => {
    if (!agentCatalog) return { agentCount: 0, healthyCount: 0, lastSyncAt: null, lastSyncError: null };
    return agentCatalog.getSyncStatus();
  });

  ipcMain.handle("cloud-ru:agents:force-sync", async () => {
    if (!agentCatalog || !authService) return [];
    const projectId = authService.getProjectId();
    if (!projectId) return [];
    return agentCatalog.sync(projectId);
  });

  // ─── Delegation IPC Handlers ───────────────────────────────────

  ipcMain.handle(
    "cloud-ru:agents:delegate",
    async (_e, request: DelegationRequest) => {
      if (!delegationService) {
        return { success: false, error: "NOT_CONFIGURED", message: "Cloud.ru Agents not initialized" };
      }

      // Send progress events to renderer
      const win = BrowserWindow.getAllWindows()[0];
      const onProgress = (event: DelegationProgressEvent) => {
        if (win) {
          win.webContents.send("cloud-ru:agents:delegation-progress", event);
        }
      };

      return delegationService.delegate(request, onProgress);
    },
  );

  ipcMain.handle("cloud-ru:agents:cancel", (_e, agentId: string) => {
    if (!delegationService) return false;
    return delegationService.cancel(agentId);
  });

  // ─── Start catalog sync if already authenticated ───────────────

  if (authService.isAuthenticated()) {
    const projectId = authService.getProjectId();
    if (projectId) {
      agentCatalog.startPolling(projectId);
    }
  }

  // ─── Cleanup on app quit ───────────────────────────────────────

  app.on("will-quit", () => {
    authService?.destroy();
    agentCatalog?.destroy();
    delegationService?.destroy();
  });

  console.log("[enterprise] cloud-ru-agents: initialized");
}

/** Register hermes-desktop:// protocol handler for OIDC callback */
function registerProtocolHandler(): void {
  // Handle deep-link callback: hermes-desktop://auth/callback?code=...&state=...
  app.on("open-url", (_event, url) => {
    if (url.startsWith("hermes-desktop://auth/callback")) {
      authService?.completeLogin(url).then((state) => {
        const win = BrowserWindow.getAllWindows()[0];
        if (win) {
          win.webContents.send("cloud-ru:auth:state-changed", state);
          // Focus the window after login
          if (win.isMinimized()) win.restore();
          win.focus();
        }
      });
    }
  });

  // Register as default protocol handler (for fresh installs)
  if (!app.isDefaultProtocolClient("hermes-desktop")) {
    app.setAsDefaultProtocolClient("hermes-desktop");
  }
}
