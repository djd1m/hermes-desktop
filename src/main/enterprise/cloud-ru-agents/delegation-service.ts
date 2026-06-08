/**
 * Orchestrates the delegation lifecycle:
 * 1. Validate agent is healthy (catalog)
 * 2. Resolve auth credentials
 * 3. Execute A2A call
 * 4. Return result or structured error
 */

import {
  DelegationErrorCode,
  type DelegationRequest,
  type DelegationResult,
  type DelegationProgressEvent,
} from "./types";
import type { AgentCatalog } from "./agent-catalog";
import { callA2A } from "./a2a-client";

const DEFAULT_TIMEOUT_MS = 120_000;
const MAX_TIMEOUT_MS = 300_000;

export class DelegationService {
  /** Active delegations for cancellation */
  private activeDelegations: Map<string, AbortController> = new Map();

  constructor(
    private catalog: AgentCatalog,
    private getApiKey: () => string | undefined,
  ) {}

  /** Execute a delegation request */
  async delegate(
    request: DelegationRequest,
    onProgress?: (event: DelegationProgressEvent) => void,
  ): Promise<DelegationResult> {
    const startTime = Date.now();

    // 1. Check API key
    const apiKey = this.getApiKey();
    if (!apiKey) {
      return {
        success: false,
        error: DelegationErrorCode.AUTH_MISSING,
        message: "Cloud.ru API key not configured. Set it in Settings → Models → Cloud.ru Foundation Models.",
      };
    }

    // 2. Check catalog has agents
    if (this.catalog.listAll().length === 0) {
      return {
        success: false,
        error: DelegationErrorCode.NOT_CONFIGURED,
        message: "No Cloud.ru AI Agents found. Sign in with cloud.ru and ensure agents are deployed in your project.",
      };
    }

    // 3. Find healthy agent
    const agent = this.catalog.getHealthyAgent(request.agentId);
    if (!agent) {
      const exists = this.catalog
        .listAll()
        .find((a) => a.id === request.agentId);
      if (!exists) {
        return {
          success: false,
          error: DelegationErrorCode.AGENT_NOT_FOUND,
          message: `Agent "${request.agentId}" not found in catalog`,
        };
      }
      return {
        success: false,
        error: DelegationErrorCode.AGENT_NOT_HEALTHY,
        message: `Agent "${exists.name ?? request.agentId}" is ${exists.status} — only running agents can accept tasks`,
      };
    }

    // 4. Execute A2A call
    const timeoutMs = Math.min(
      request.timeoutMs ?? DEFAULT_TIMEOUT_MS,
      MAX_TIMEOUT_MS,
    );

    const delegationId = `${request.agentId}-${Date.now()}`;
    const controller = new AbortController();
    this.activeDelegations.set(delegationId, controller);

    try {
      const result = await callA2A(
        {
          publicUrl: agent.publicUrl,
          task: request.task,
          context: request.context,
          apiKey,
          timeoutMs,
        },
        onProgress,
      );

      return {
        success: true,
        content: result.content,
        truncated: result.truncated,
        durationMs: result.durationMs,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      const isTimeout = message.includes("timed out");

      return {
        success: false,
        error: isTimeout
          ? DelegationErrorCode.TIMEOUT
          : DelegationErrorCode.UNREACHABLE,
        message,
        durationMs: Date.now() - startTime,
      };
    } finally {
      this.activeDelegations.delete(delegationId);
    }
  }

  /** Cancel an in-flight delegation */
  cancel(agentId: string): boolean {
    for (const [id, controller] of this.activeDelegations) {
      if (id.startsWith(agentId)) {
        controller.abort();
        this.activeDelegations.delete(id);
        return true;
      }
    }
    return false;
  }

  /** Cleanup */
  destroy(): void {
    for (const controller of this.activeDelegations.values()) {
      controller.abort();
    }
    this.activeDelegations.clear();
  }
}
