/**
 * Type definitions for Cloud.ru AI Agents integration.
 * Self-contained — no external package dependencies.
 */

// ─── Auth ───────────────────────────────────────────────────────────

/** OIDC configuration for cloud.ru IAM */
export interface AuthConfig {
  /** OIDC authority URL, e.g. https://iam.cloud.ru/realms/users */
  authority: string;
  /** OAuth client ID, e.g. 'agent_space' */
  clientId: string;
  /** Deep-link redirect URI, e.g. 'hermes-desktop://auth/callback' */
  redirectUri: string;
  /** OAuth scopes */
  scope: string;
}

/** Token data from OIDC token exchange */
export interface TokenData {
  accessToken: string;
  refreshToken?: string;
  idToken?: string;
  /** Unix timestamp (seconds) when access_token expires */
  expiresAt?: number;
  tokenType?: string;
  scope?: string;
}

/** PKCE flow state persisted during login */
export interface PkceFlowState {
  codeVerifier: string;
  state: string;
  createdAt: number;
}

/** Auth state exposed to renderer via IPC */
export interface CloudRuAuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  projectId: string | null;
  displayName: string | null;
  expiresAt: number | null;
  error: string | null;
}

/** Fatal refresh errors that require re-login */
export const FATAL_REFRESH_ERRORS = [
  "invalid_grant",
  "invalid_token",
  "invalid_client",
  "unauthorized_client",
] as const;

// ─── Agent Catalog ──────────────────────────────────────────────────

/** Agent info from Cloud.ru AI Factory catalog */
export interface CloudAgentInfo {
  id: string;
  name: string;
  description?: string;
  status: "running" | "stopped" | "error" | "deploying";
  publicUrl: string;
  model?: string;
  createdAt: string;
  /** Agent capabilities/tags */
  tags?: string[];
}

// ─── Delegation ─────────────────────────────────────────────────────

/** Request to delegate a task to a cloud agent */
export interface DelegationRequest {
  agentId: string;
  task: string;
  context?: string;
  timeoutMs?: number;
}

/** Result of a delegation attempt */
export interface DelegationResult {
  success: boolean;
  content?: string;
  truncated?: boolean;
  error?: DelegationErrorCode;
  message?: string;
  durationMs?: number;
}

/** Delegation error taxonomy (from ADR-004) */
export enum DelegationErrorCode {
  NOT_CONFIGURED = "DELEGATION_NOT_CONFIGURED",
  AGENT_NOT_FOUND = "DELEGATION_AGENT_NOT_FOUND",
  AGENT_NOT_HEALTHY = "DELEGATION_AGENT_NOT_HEALTHY",
  AUTH_MISSING = "DELEGATION_AUTH_MISSING",
  UNREACHABLE = "DELEGATION_UNREACHABLE",
  TIMEOUT = "DELEGATION_TIMEOUT",
  USER_DENIED = "DELEGATION_USER_DENIED",
}

// ─── A2A Protocol ───────────────────────────────────────────────────

/** Options for an A2A call */
export interface A2ACallOptions {
  publicUrl: string;
  task: string;
  context?: string;
  apiKey: string;
  timeoutMs: number;
}

/** Result of an A2A call */
export interface A2AResult {
  content: string;
  truncated: boolean;
  durationMs: number;
}

/** SSE progress event during A2A delegation */
export interface DelegationProgressEvent {
  type: "progress" | "chunk" | "done" | "error";
  content?: string;
  progress?: number;
  error?: string;
}
