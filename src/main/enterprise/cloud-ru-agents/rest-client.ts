/**
 * HTTP client with Bearer token injection and 401 auto-retry.
 * Used for Cloud.ru Console APIs that require OIDC access_token.
 */

/** WAF headers required by cloud.ru console APIs */
const CLOUDRU_WAF_HEADERS = {
  "front-initiator-namespace": "agent-space",
  "X-Requested-With": "XMLHttpRequest",
  Origin: "https://console.cloud.ru",
  Referer: "https://console.cloud.ru/",
} as const;

export class RestClient {
  constructor(
    private baseUrl: string,
    private getAccessToken: () => Promise<string>,
    private onAuthError?: () => void,
  ) {}

  /** Make an authenticated request with auto-retry on 401 */
  async fetch(path: string, init?: RequestInit): Promise<Response> {
    const token = await this.getAccessToken();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...CLOUDRU_WAF_HEADERS,
      ...((init?.headers as Record<string, string>) ?? {}),
    };

    const url = `${this.baseUrl}${path}`;
    const res = await globalThis.fetch(url, { ...init, headers });

    // Auto-retry once on 401 with refreshed token
    if (res.status === 401) {
      try {
        const newToken = await this.getAccessToken(); // triggers refresh
        const retryHeaders = { ...headers, Authorization: `Bearer ${newToken}` };
        return globalThis.fetch(url, { ...init, headers: retryHeaders });
      } catch {
        this.onAuthError?.();
        throw new Error("Authentication failed after retry");
      }
    }

    return res;
  }

  /** GET request */
  async get(path: string): Promise<Response> {
    return this.fetch(path, { method: "GET" });
  }

  /** POST request with JSON body */
  async post(path: string, body: unknown): Promise<Response> {
    return this.fetch(path, {
      method: "POST",
      body: JSON.stringify(body),
    });
  }
}
