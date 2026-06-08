/**
 * Cloud.ru AI Agents catalog — discovers agents and checks health.
 * Uses OIDC access_token (Level 1 auth) for management API calls.
 */

import type { CloudAgentInfo } from "./types";
import type { RestClient } from "./rest-client";

/** Sync interval: 15 seconds (matching autoclaw reference) */
const SYNC_INTERVAL_MS = 15_000;

/** Cloud.ru AI Factory agent API base path */
const AGENTS_API_PREFIX = "/u-api/ai-agents/v1";

export class AgentCatalog {
  private agents: Map<string, CloudAgentInfo> = new Map();
  private syncTimer: ReturnType<typeof setInterval> | null = null;
  private lastSyncError: string | null = null;
  private lastSyncAt: number | null = null;

  constructor(private restClient: RestClient) {}

  /** Sync agents from Cloud.ru AI Factory API */
  async sync(projectId: string): Promise<CloudAgentInfo[]> {
    try {
      const res = await this.restClient.get(
        `${AGENTS_API_PREFIX}/${projectId}/agents`,
      );

      if (!res.ok) {
        const body = await res.text();
        this.lastSyncError = `API error ${res.status}: ${body}`;
        return this.listAll();
      }

      const data = await res.json();
      const agents: CloudAgentInfo[] = (data.agents ?? data ?? []).map(
        (a: Record<string, unknown>) => ({
          id: String(a.id ?? a.agent_id ?? ""),
          name: String(a.name ?? a.display_name ?? "Unknown"),
          description: a.description ? String(a.description) : undefined,
          status: normalizeStatus(String(a.status ?? "unknown")),
          publicUrl: String(a.public_url ?? a.publicUrl ?? a.endpoint ?? ""),
          model: a.model ? String(a.model) : undefined,
          createdAt: String(a.created_at ?? a.createdAt ?? ""),
          tags: Array.isArray(a.tags) ? a.tags.map(String) : undefined,
        }),
      );

      // Update local catalog
      this.agents.clear();
      for (const agent of agents) {
        this.agents.set(agent.id, agent);
      }

      this.lastSyncError = null;
      this.lastSyncAt = Date.now();
      return agents;
    } catch (err) {
      this.lastSyncError =
        err instanceof Error ? err.message : "Unknown sync error";
      return this.listAll();
    }
  }

  /** Start periodic sync */
  startPolling(projectId: string): void {
    this.stopPolling();
    // Initial sync
    this.sync(projectId).catch(() => {});
    // Periodic sync
    this.syncTimer = setInterval(() => {
      this.sync(projectId).catch(() => {});
    }, SYNC_INTERVAL_MS);
  }

  /** Stop periodic sync */
  stopPolling(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
  }

  /** Get agent by ID (only if running) */
  getHealthyAgent(agentId: string): CloudAgentInfo | null {
    const agent = this.agents.get(agentId);
    if (!agent || agent.status !== "running") return null;
    return agent;
  }

  /** List all agents */
  listAll(): CloudAgentInfo[] {
    return Array.from(this.agents.values());
  }

  /** List only healthy (running) agents */
  listHealthy(): CloudAgentInfo[] {
    return this.listAll().filter((a) => a.status === "running");
  }

  /** Get sync status */
  getSyncStatus(): {
    agentCount: number;
    healthyCount: number;
    lastSyncAt: number | null;
    lastSyncError: string | null;
  } {
    return {
      agentCount: this.agents.size,
      healthyCount: this.listHealthy().length,
      lastSyncAt: this.lastSyncAt,
      lastSyncError: this.lastSyncError,
    };
  }

  /** Cleanup */
  destroy(): void {
    this.stopPolling();
    this.agents.clear();
  }
}

/** Normalize agent status string to known enum values */
function normalizeStatus(
  s: string,
): CloudAgentInfo["status"] {
  const lower = s.toLowerCase();
  if (lower === "running" || lower === "active" || lower === "healthy")
    return "running";
  if (lower === "stopped" || lower === "inactive" || lower === "paused")
    return "stopped";
  if (lower === "deploying" || lower === "starting" || lower === "provisioning")
    return "deploying";
  return "error";
}
