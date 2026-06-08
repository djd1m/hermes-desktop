/**
 * Cloud.ru AI Agents tab for the Discover screen.
 * Shows agent catalog, running agents, sign-in UI, and delegation controls.
 */

import { useState, useEffect, useCallback } from "react";
import {
  Cloud,
  LogIn,
  LogOut,
  Activity,
  Server,
  Refresh,
  Zap,
  Send,
  X,
  Check,
} from "../../assets/icons";
import { useI18n } from "../../components/useI18n";

// Types matching the preload bridge definitions
interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  projectId: string | null;
  displayName: string | null;
  expiresAt: number | null;
  error: string | null;
}

interface AgentInfo {
  id: string;
  name: string;
  description?: string;
  status: "running" | "stopped" | "error" | "deploying";
  publicUrl: string;
  model?: string;
  createdAt: string;
  tags?: string[];
}

interface SyncStatus {
  agentCount: number;
  healthyCount: number;
  lastSyncAt: number | null;
  lastSyncError: string | null;
}

interface DelegationResult {
  success: boolean;
  content?: string;
  truncated?: boolean;
  error?: string;
  message?: string;
  durationMs?: number;
}

// Status badge colors
const STATUS_COLORS: Record<string, string> = {
  running: "#22c55e",
  stopped: "#6b7280",
  error: "#ef4444",
  deploying: "#f59e0b",
};

const STATUS_LABELS: Record<string, string> = {
  running: "Running",
  stopped: "Stopped",
  error: "Error",
  deploying: "Deploying",
};

export default function CloudRuAgents(): React.JSX.Element {
  const { t } = useI18n();

  // Auth state
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,
    projectId: null,
    displayName: null,
    expiresAt: null,
    error: null,
  });

  // Agent catalog
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    agentCount: 0,
    healthyCount: 0,
    lastSyncAt: null,
    lastSyncError: null,
  });
  const [loading, setLoading] = useState(false);

  // Delegation
  const [delegateAgent, setDelegateAgent] = useState<AgentInfo | null>(null);
  const [delegateTask, setDelegateTask] = useState("");
  const [delegateContext, setDelegateContext] = useState("");
  const [delegating, setDelegating] = useState(false);
  const [delegationResult, setDelegationResult] = useState<DelegationResult | null>(null);
  const [delegationChunks, setDelegationChunks] = useState("");

  // ─── Load auth state and agents ───────────────────────────────

  const loadAuthStatus = useCallback(async () => {
    try {
      const status = (await window.hermesAPI.cloudRuAuthStatus()) as AuthState;
      setAuthState(status);
    } catch {
      setAuthState((prev) => ({ ...prev, isLoading: false }));
    }
  }, []);

  const loadAgents = useCallback(async () => {
    setLoading(true);
    try {
      const [catalog, status] = await Promise.all([
        window.hermesAPI.cloudRuAgentsCatalog() as Promise<AgentInfo[]>,
        window.hermesAPI.cloudRuAgentsSyncStatus() as Promise<SyncStatus>,
      ]);
      setAgents(catalog);
      setSyncStatus(status);
    } catch {
      // Silently handle — may not be authenticated
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAuthStatus();
  }, [loadAuthStatus]);

  useEffect(() => {
    if (authState.isAuthenticated) {
      loadAgents();
    }
  }, [authState.isAuthenticated, loadAgents]);

  // Listen for auth state changes from main process
  useEffect(() => {
    const unsub = window.hermesAPI.onCloudRuAuthStateChanged((state) => {
      setAuthState(state as AuthState);
    });
    return unsub;
  }, []);

  // Listen for delegation progress
  useEffect(() => {
    const unsub = window.hermesAPI.onCloudRuDelegationProgress((event) => {
      const ev = event as { type: string; content?: string };
      if (ev.type === "chunk" && ev.content) {
        setDelegationChunks((prev) => prev + ev.content);
      }
    });
    return unsub;
  }, []);

  // ─── Auth actions ─────────────────────────────────────────────

  const handleLogin = async (): Promise<void> => {
    setAuthState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      await window.hermesAPI.cloudRuAuthLogin();
    } catch (err) {
      setAuthState((prev) => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : "Login failed",
      }));
    }
  };

  const handleLogout = async (): Promise<void> => {
    await window.hermesAPI.cloudRuAuthLogout();
    setAuthState({
      isAuthenticated: false,
      isLoading: false,
      projectId: null,
      displayName: null,
      expiresAt: null,
      error: null,
    });
    setAgents([]);
  };

  const handleForceSync = async (): Promise<void> => {
    setLoading(true);
    try {
      const updated = (await window.hermesAPI.cloudRuAgentsForceSync()) as AgentInfo[];
      setAgents(updated);
      const status = (await window.hermesAPI.cloudRuAgentsSyncStatus()) as SyncStatus;
      setSyncStatus(status);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  // ─── Delegation ───────────────────────────────────────────────

  const handleDelegate = async (): Promise<void> => {
    if (!delegateAgent || !delegateTask.trim()) return;

    setDelegating(true);
    setDelegationResult(null);
    setDelegationChunks("");

    try {
      const result = (await window.hermesAPI.cloudRuAgentsDelegate({
        agentId: delegateAgent.id,
        task: delegateTask.trim(),
        context: delegateContext.trim() || undefined,
      })) as DelegationResult;
      setDelegationResult(result);
    } catch (err) {
      setDelegationResult({
        success: false,
        error: "UNREACHABLE",
        message: err instanceof Error ? err.message : "Delegation failed",
      });
    } finally {
      setDelegating(false);
    }
  };

  const closeDelegationDialog = (): void => {
    setDelegateAgent(null);
    setDelegateTask("");
    setDelegateContext("");
    setDelegationResult(null);
    setDelegationChunks("");
    setDelegating(false);
  };

  // ─── Helpers ──────────────────────────────────────────────────

  const runningAgents = agents.filter((a) => a.status === "running");
  const otherAgents = agents.filter((a) => a.status !== "running");

  // ─── Render ───────────────────────────────────────────────────

  // Not authenticated — show sign-in prompt
  if (!authState.isAuthenticated && !authState.isLoading) {
    return (
      <div className="cloudru-agents-login">
        <div className="cloudru-agents-login-card">
          <Cloud size={48} className="cloudru-agents-login-icon" />
          <h2 className="cloudru-agents-login-title">
            {t("cloudruAgents.signInTitle") || "Cloud.ru AI Agents"}
          </h2>
          <p className="cloudru-agents-login-desc">
            {t("cloudruAgents.signInDesc") ||
              "Sign in with your cloud.ru account to browse and use AI Agents deployed in your project."}
          </p>
          {authState.error && (
            <div className="cloudru-agents-error">{authState.error}</div>
          )}
          <button
            className="btn btn-primary cloudru-agents-login-btn"
            onClick={handleLogin}
          >
            <LogIn size={16} />
            {t("cloudruAgents.signIn") || "Sign in with cloud.ru"}
          </button>
          <p className="cloudru-agents-login-hint">
            {t("cloudruAgents.signInHint") ||
              "Uses OIDC + PKCE for secure authentication. Your browser will open the cloud.ru login page."}
          </p>
        </div>
      </div>
    );
  }

  // Loading auth
  if (authState.isLoading) {
    return (
      <div className="cloudru-agents-loading">
        <div className="loading-spinner" />
        <p>{t("cloudruAgents.authenticating") || "Authenticating..."}</p>
      </div>
    );
  }

  return (
    <div className="cloudru-agents">
      {/* Delegation Dialog (modal) */}
      {delegateAgent && (
        <div className="discover-overlay" onClick={closeDelegationDialog}>
          <div
            className="discover-modal cloudru-delegation-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="discover-modal-header">
              <div className="discover-modal-title-row">
                <Server size={18} />
                <h3>
                  {delegationResult
                    ? t("cloudruAgents.delegationResult") || "Delegation Result"
                    : t("cloudruAgents.delegateTo") || "Delegate to"}{" "}
                  {!delegationResult && delegateAgent.name}
                </h3>
              </div>
              <button
                className="btn-ghost discover-modal-close"
                onClick={closeDelegationDialog}
              >
                <X size={18} />
              </button>
            </div>

            <div className="discover-modal-content cloudru-delegation-content">
              {!delegationResult ? (
                <>
                  <div className="cloudru-delegation-agent-info">
                    <span
                      className="cloudru-agent-status"
                      style={{ background: STATUS_COLORS[delegateAgent.status] }}
                    />
                    <span>{delegateAgent.name}</span>
                    {delegateAgent.model && (
                      <span className="discover-tag">{delegateAgent.model}</span>
                    )}
                  </div>

                  <label className="cloudru-delegation-label">
                    {t("cloudruAgents.taskLabel") || "Task description"}
                  </label>
                  <textarea
                    className="cloudru-delegation-textarea"
                    placeholder={
                      t("cloudruAgents.taskPlaceholder") ||
                      "Describe the task you want to delegate..."
                    }
                    value={delegateTask}
                    onChange={(e) => setDelegateTask(e.target.value)}
                    rows={4}
                    autoFocus
                  />

                  <label className="cloudru-delegation-label">
                    {t("cloudruAgents.contextLabel") || "Additional context (optional)"}
                  </label>
                  <textarea
                    className="cloudru-delegation-textarea"
                    placeholder={
                      t("cloudruAgents.contextPlaceholder") ||
                      "Provide any additional context..."
                    }
                    value={delegateContext}
                    onChange={(e) => setDelegateContext(e.target.value)}
                    rows={2}
                  />

                  <div className="cloudru-delegation-actions">
                    <button
                      className="btn btn-secondary"
                      onClick={closeDelegationDialog}
                    >
                      {t("cloudruAgents.cancel") || "Cancel"}
                    </button>
                    <button
                      className="btn btn-primary"
                      onClick={handleDelegate}
                      disabled={!delegateTask.trim() || delegating}
                    >
                      {delegating ? (
                        <>
                          <div className="loading-spinner loading-spinner--sm" />
                          {t("cloudruAgents.delegating") || "Delegating..."}
                        </>
                      ) : (
                        <>
                          <Send size={14} />
                          {t("cloudruAgents.delegate") || "Delegate Task"}
                        </>
                      )}
                    </button>
                  </div>

                  {delegating && delegationChunks && (
                    <div className="cloudru-delegation-stream">
                      <pre>{delegationChunks}</pre>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div
                    className={`cloudru-delegation-result ${delegationResult.success ? "success" : "error"}`}
                  >
                    {delegationResult.success ? (
                      <Check size={18} />
                    ) : (
                      <X size={18} />
                    )}
                    <span>
                      {delegationResult.success
                        ? t("cloudruAgents.delegationSuccess") || "Task completed successfully"
                        : delegationResult.message || "Delegation failed"}
                    </span>
                    {delegationResult.durationMs && (
                      <span className="cloudru-delegation-duration">
                        {(delegationResult.durationMs / 1000).toFixed(1)}s
                      </span>
                    )}
                  </div>

                  {delegationResult.content && (
                    <div className="cloudru-delegation-output">
                      <pre>{delegationResult.content}</pre>
                    </div>
                  )}

                  {delegationResult.truncated && (
                    <div className="cloudru-delegation-truncated">
                      {t("cloudruAgents.responseTruncated") ||
                        "Response was truncated to 32K characters"}
                    </div>
                  )}

                  <div className="cloudru-delegation-actions">
                    <button
                      className="btn btn-secondary"
                      onClick={closeDelegationDialog}
                    >
                      {t("cloudruAgents.close") || "Close"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Auth header */}
      <div className="cloudru-agents-auth-bar">
        <div className="cloudru-agents-auth-info">
          <Cloud size={16} />
          <span>
            {authState.displayName || authState.projectId || "cloud.ru"}
          </span>
          {syncStatus.lastSyncAt && (
            <span className="cloudru-agents-sync-info">
              <Activity size={12} />
              {syncStatus.agentCount} {t("cloudruAgents.agents") || "agents"} ·{" "}
              {syncStatus.healthyCount} {t("cloudruAgents.healthy") || "healthy"}
            </span>
          )}
        </div>
        <div className="cloudru-agents-auth-actions">
          <button
            className="btn btn-secondary btn-sm"
            onClick={handleForceSync}
            disabled={loading}
          >
            <Refresh size={14} />
            {t("cloudruAgents.sync") || "Sync"}
          </button>
          <button className="btn btn-secondary btn-sm" onClick={handleLogout}>
            <LogOut size={14} />
            {t("cloudruAgents.signOut") || "Sign out"}
          </button>
        </div>
      </div>

      {/* Sync error */}
      {syncStatus.lastSyncError && (
        <div className="cloudru-agents-error">
          {syncStatus.lastSyncError}
        </div>
      )}

      {loading ? (
        <div className="discover-state">
          <div className="loading-spinner" />
        </div>
      ) : agents.length === 0 ? (
        <div className="discover-state">
          <Server size={28} />
          <p className="discover-empty-title">
            {t("cloudruAgents.noAgents") || "No AI Agents found"}
          </p>
          <p className="discover-empty-text">
            {t("cloudruAgents.noAgentsHint") ||
              "Deploy AI Agents in your cloud.ru project to see them here."}
          </p>
          <button className="btn btn-secondary btn-sm" onClick={handleForceSync}>
            <Refresh size={14} />
            {t("cloudruAgents.refresh") || "Refresh"}
          </button>
        </div>
      ) : (
        <>
          {/* Running Agents section */}
          {runningAgents.length > 0 && (
            <div className="cloudru-agents-section">
              <h3 className="cloudru-agents-section-title">
                <Zap size={16} />
                {t("cloudruAgents.runningAgents") || "Running Agents"}
                <span className="discover-tab-count">
                  {runningAgents.length}
                </span>
              </h3>
              <div className="discover-grid">
                {runningAgents.map((agent) => (
                  <div key={agent.id} className="discover-card cloudru-agent-card">
                    <div className="discover-card-head">
                      <span
                        className="cloudru-agent-status"
                        style={{ background: STATUS_COLORS[agent.status] }}
                      />
                      <span className="discover-card-name">{agent.name}</span>
                      <span className="discover-card-badge cloudru-badge-running">
                        {STATUS_LABELS[agent.status]}
                      </span>
                    </div>
                    {agent.description && (
                      <p className="discover-card-desc">{agent.description}</p>
                    )}
                    <div className="discover-card-meta">
                      {agent.model && <span>{agent.model}</span>}
                    </div>
                    {agent.tags && agent.tags.length > 0 && (
                      <div className="discover-card-tags">
                        {agent.tags.slice(0, 4).map((tg) => (
                          <span key={tg} className="discover-tag">
                            {tg}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="discover-card-footer">
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => setDelegateAgent(agent)}
                      >
                        <Send size={14} />
                        {t("cloudruAgents.useAgent") || "Use Agent"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Other Agents section */}
          {otherAgents.length > 0 && (
            <div className="cloudru-agents-section">
              <h3 className="cloudru-agents-section-title">
                <Server size={16} />
                {t("cloudruAgents.allAgents") || "All Agents"}
                <span className="discover-tab-count">
                  {otherAgents.length}
                </span>
              </h3>
              <div className="discover-grid">
                {otherAgents.map((agent) => (
                  <div
                    key={agent.id}
                    className="discover-card cloudru-agent-card cloudru-agent-card--inactive"
                  >
                    <div className="discover-card-head">
                      <span
                        className="cloudru-agent-status"
                        style={{ background: STATUS_COLORS[agent.status] }}
                      />
                      <span className="discover-card-name">{agent.name}</span>
                      <span className="discover-card-badge">
                        {STATUS_LABELS[agent.status]}
                      </span>
                    </div>
                    {agent.description && (
                      <p className="discover-card-desc">{agent.description}</p>
                    )}
                    <div className="discover-card-meta">
                      {agent.model && <span>{agent.model}</span>}
                    </div>
                    <div className="discover-card-footer">
                      <span className="cloudru-agent-disabled-hint">
                        {t("cloudruAgents.agentNotRunning") ||
                          "Agent is not running"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
