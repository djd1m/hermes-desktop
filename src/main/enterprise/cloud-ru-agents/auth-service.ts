/**
 * OIDC Authorization Code + PKCE flow against cloud.ru IAM.
 * Ported from universal-ai-client ext-cloud-ru-agents scaffold.
 *
 * Flow:
 * 1. prepareLogin() → generates PKCE challenge, builds auth URL
 * 2. User authenticates in browser at iam.cloud.ru
 * 3. completeLogin(callbackUrl) → exchanges code for tokens
 * 4. Auto-refresh loop keeps access_token fresh
 */

import { shell } from "electron";
import { randomBytes, createHash } from "crypto";
import type { AuthConfig, TokenData, PkceFlowState, CloudRuAuthState } from "./types";
import { FATAL_REFRESH_ERRORS } from "./types";
import { TokenStore } from "./token-store";
import { extractProjectId, extractDisplayName } from "./jwt-utils";

/** Default OIDC configuration for cloud.ru IAM */
const DEFAULT_AUTH_CONFIG: AuthConfig = {
  authority: "https://iam.cloud.ru/realms/users/protocol/openid-connect",
  clientId: "agent_space",
  redirectUri: "hermes-desktop://auth/callback",
  scope: "openid profile",
};

/** Refresh tokens 60 seconds before expiry */
const REFRESH_MARGIN_S = 60;

export class AuthService {
  private config: AuthConfig;
  private tokenStore: TokenStore;
  private tokenData: TokenData | null = null;
  private refreshTimer: ReturnType<typeof setTimeout> | null = null;
  private projectId: string | null = null;
  private displayName: string | null = null;

  /** Called when auth state changes (for notifying renderer) */
  onAuthStateChanged?: (state: CloudRuAuthState) => void;

  constructor(config?: Partial<AuthConfig>, appDataPath?: string) {
    this.config = { ...DEFAULT_AUTH_CONFIG, ...config };
    this.tokenStore = new TokenStore(appDataPath);
  }

  /** Restore tokens from encrypted store on app startup */
  async initialize(): Promise<void> {
    const stored = await this.tokenStore.load();
    if (stored) {
      this.tokenData = stored;
      this.projectId = stored.accessToken
        ? extractProjectId(stored.accessToken)
        : null;
      this.displayName = stored.accessToken
        ? extractDisplayName(stored.accessToken)
        : null;

      // Check if token is still valid
      if (this.isAuthenticated()) {
        this.scheduleRefresh();
      } else if (stored.refreshToken) {
        // Try to refresh expired token
        try {
          await this.refreshToken();
        } catch {
          await this.clearSession();
        }
      }
    }
  }

  // ─── PKCE Helpers ───────────────────────────────────────────────

  /** Generate PKCE code verifier (43 random bytes → base64url = 58 chars) */
  private generateCodeVerifier(): string {
    return randomBytes(43).toString("base64url");
  }

  /** SHA-256 hash of verifier → base64url code challenge */
  private generateCodeChallenge(verifier: string): string {
    return createHash("sha256").update(verifier).digest("base64url");
  }

  // ─── Login Flow ─────────────────────────────────────────────────

  /** Initiate OIDC login: generate PKCE, open browser to IAM */
  async prepareLogin(): Promise<{ authorizationUrl: string }> {
    const codeVerifier = this.generateCodeVerifier();
    const codeChallenge = this.generateCodeChallenge(codeVerifier);
    const state = randomBytes(16).toString("hex");

    // Persist PKCE state for callback
    const pkceState: PkceFlowState = {
      codeVerifier,
      state,
      createdAt: Date.now(),
    };
    await this.tokenStore.savePkceState(pkceState);

    const params = new URLSearchParams({
      response_type: "code",
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      scope: this.config.scope,
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
      state,
    });

    const authorizationUrl = `${this.config.authority}/auth?${params}`;
    return { authorizationUrl };
  }

  /** Open system browser for OIDC login */
  async initiateLogin(): Promise<void> {
    const { authorizationUrl } = await this.prepareLogin();
    await shell.openExternal(authorizationUrl);
  }

  /** Handle OIDC callback: exchange code for tokens */
  async completeLogin(callbackUrl: string): Promise<CloudRuAuthState> {
    const url = new URL(callbackUrl);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const error = url.searchParams.get("error");

    if (error) {
      const desc = url.searchParams.get("error_description") ?? error;
      return this.errorState(`Login failed: ${desc}`);
    }

    if (!code || !state) {
      return this.errorState("Invalid callback: missing code or state");
    }

    // Load and validate PKCE state
    const pkceState = await this.tokenStore.loadPkceState();
    if (!pkceState) {
      return this.errorState("Login session expired — please try again");
    }
    if (pkceState.state !== state) {
      return this.errorState("State mismatch — possible CSRF attack");
    }
    // Reject PKCE states older than 10 minutes
    if (Date.now() - pkceState.createdAt > 10 * 60 * 1000) {
      return this.errorState("Login session expired — please try again");
    }

    // Exchange code for tokens
    const tokenResponse = await fetch(
      `${this.config.authority}/token`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          client_id: this.config.clientId,
          code,
          redirect_uri: this.config.redirectUri,
          code_verifier: pkceState.codeVerifier,
        }),
      },
    );

    if (!tokenResponse.ok) {
      const body = await tokenResponse.text();
      return this.errorState(`Token exchange failed: ${body}`);
    }

    const data = await tokenResponse.json();
    const tokenData: TokenData = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      idToken: data.id_token,
      expiresAt: data.expires_in
        ? Math.floor(Date.now() / 1000) + data.expires_in
        : undefined,
      tokenType: data.token_type,
      scope: data.scope,
    };

    this.tokenData = tokenData;
    this.projectId = extractProjectId(tokenData.accessToken);
    this.displayName = extractDisplayName(tokenData.accessToken);

    await this.tokenStore.save(tokenData);
    this.scheduleRefresh();
    this.notifyStateChanged();

    return this.getState();
  }

  // ─── Token Refresh ──────────────────────────────────────────────

  /** Refresh access token using refresh_token */
  async refreshToken(): Promise<void> {
    if (!this.tokenData?.refreshToken) {
      throw new Error("No refresh token available");
    }

    const response = await fetch(
      `${this.config.authority}/token`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          client_id: this.config.clientId,
          refresh_token: this.tokenData.refreshToken,
        }),
      },
    );

    if (!response.ok) {
      const body = await response.text();
      // Check for fatal errors that require re-login
      const isFatal = FATAL_REFRESH_ERRORS.some((e) => body.includes(e));
      if (isFatal) {
        await this.clearSession();
        this.notifyStateChanged();
        throw new Error("Session expired — please sign in again");
      }
      throw new Error(`Token refresh failed: ${body}`);
    }

    const data = await response.json();
    this.tokenData = {
      ...this.tokenData,
      accessToken: data.access_token,
      refreshToken: data.refresh_token ?? this.tokenData.refreshToken,
      idToken: data.id_token ?? this.tokenData.idToken,
      expiresAt: data.expires_in
        ? Math.floor(Date.now() / 1000) + data.expires_in
        : this.tokenData.expiresAt,
    };

    this.projectId = extractProjectId(this.tokenData.accessToken);
    this.displayName = extractDisplayName(this.tokenData.accessToken);

    await this.tokenStore.save(this.tokenData);
    this.scheduleRefresh();
    this.notifyStateChanged();
  }

  /** Schedule auto-refresh 60s before token expiry */
  private scheduleRefresh(): void {
    this.cancelRefreshTimer();
    if (!this.tokenData?.expiresAt) return;

    const nowS = Math.floor(Date.now() / 1000);
    const refreshAtS = this.tokenData.expiresAt - REFRESH_MARGIN_S;
    const delayMs = Math.max((refreshAtS - nowS) * 1000, 1000);

    this.refreshTimer = setTimeout(async () => {
      try {
        await this.refreshToken();
      } catch {
        // Refresh failed — session cleared in refreshToken()
      }
    }, delayMs);
  }

  private cancelRefreshTimer(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  // ─── State ──────────────────────────────────────────────────────

  /** Ensure access token is valid; refresh if needed */
  async ensureValidAccessToken(): Promise<string> {
    if (!this.tokenData?.accessToken) {
      throw new Error("Not authenticated — please sign in with cloud.ru");
    }
    if (
      this.tokenData.expiresAt &&
      this.tokenData.expiresAt < Math.floor(Date.now() / 1000) + 10
    ) {
      await this.refreshToken();
    }
    return this.tokenData!.accessToken;
  }

  /** Check if currently authenticated */
  isAuthenticated(): boolean {
    if (!this.tokenData?.accessToken) return false;
    if (this.tokenData.expiresAt) {
      return this.tokenData.expiresAt > Math.floor(Date.now() / 1000);
    }
    return true;
  }

  /** Get auth state for UI */
  getState(): CloudRuAuthState {
    return {
      isAuthenticated: this.isAuthenticated(),
      isLoading: false,
      projectId: this.projectId,
      displayName: this.displayName,
      expiresAt: this.tokenData?.expiresAt ?? null,
      error: null,
    };
  }

  /** Get project ID (extracted from JWT) */
  getProjectId(): string | null {
    return this.projectId;
  }

  // ─── Logout ─────────────────────────────────────────────────────

  /** Clear tokens and cancel refresh timer */
  async logout(): Promise<void> {
    // Try IAM logout endpoint if we have an id_token
    if (this.tokenData?.idToken) {
      try {
        const params = new URLSearchParams({
          id_token_hint: this.tokenData.idToken,
          post_logout_redirect_uri: this.config.redirectUri,
        });
        await fetch(`${this.config.authority}/logout?${params}`, {
          method: "GET",
        });
      } catch {
        // IAM logout is best-effort
      }
    }

    await this.clearSession();
    this.notifyStateChanged();
  }

  private async clearSession(): Promise<void> {
    this.tokenData = null;
    this.projectId = null;
    this.displayName = null;
    this.cancelRefreshTimer();
    await this.tokenStore.clear();
  }

  private errorState(error: string): CloudRuAuthState {
    return {
      isAuthenticated: false,
      isLoading: false,
      projectId: null,
      displayName: null,
      expiresAt: null,
      error,
    };
  }

  private notifyStateChanged(): void {
    this.onAuthStateChanged?.(this.getState());
  }

  /** Cleanup on app quit */
  destroy(): void {
    this.cancelRefreshTimer();
  }
}
