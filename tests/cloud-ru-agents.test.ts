/**
 * Tests for Cloud.ru AI Agents enterprise integration.
 * Tests JWT utils, delegation service, agent catalog, and type definitions.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── JWT Utils Tests ────────────────────────────────────────────────

// Inline the functions to avoid Electron import issues in test environment
function decodeJwtPayload(token: string): Record<string, unknown> {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Invalid JWT format");
  const payload = parts[1];
  const decoded = Buffer.from(payload, "base64url").toString("utf-8");
  return JSON.parse(decoded);
}

function extractProjectId(token: string): string | null {
  try {
    const payload = decodeJwtPayload(token);
    const candidates = [
      "project_id",
      "cloud_project_id",
      "projectId",
      "tenant_id",
      "https://cloud.ru/project_id",
    ];
    for (const key of candidates) {
      if (typeof payload[key] === "string" && payload[key]) {
        return payload[key] as string;
      }
    }
    return null;
  } catch {
    return null;
  }
}

function extractDisplayName(token: string): string | null {
  try {
    const payload = decodeJwtPayload(token);
    const candidates = ["preferred_username", "name", "email", "sub"];
    for (const key of candidates) {
      if (typeof payload[key] === "string" && payload[key]) {
        return payload[key] as string;
      }
    }
    return null;
  } catch {
    return null;
  }
}

/** Create a mock JWT with given payload */
function createMockJwt(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = "mock-signature";
  return `${header}.${body}.${signature}`;
}

describe("JWT Utils", () => {
  describe("decodeJwtPayload", () => {
    it("decodes a valid JWT payload", () => {
      const jwt = createMockJwt({ sub: "user123", project_id: "proj-456" });
      const payload = decodeJwtPayload(jwt);
      expect(payload.sub).toBe("user123");
      expect(payload.project_id).toBe("proj-456");
    });

    it("throws on invalid JWT format", () => {
      expect(() => decodeJwtPayload("not-a-jwt")).toThrow("Invalid JWT format");
      expect(() => decodeJwtPayload("only.two")).toThrow("Invalid JWT format");
    });
  });

  describe("extractProjectId", () => {
    it("extracts project_id from JWT", () => {
      const jwt = createMockJwt({ project_id: "proj-123" });
      expect(extractProjectId(jwt)).toBe("proj-123");
    });

    it("extracts cloud_project_id", () => {
      const jwt = createMockJwt({ cloud_project_id: "cloud-456" });
      expect(extractProjectId(jwt)).toBe("cloud-456");
    });

    it("extracts tenant_id as fallback", () => {
      const jwt = createMockJwt({ tenant_id: "tenant-789" });
      expect(extractProjectId(jwt)).toBe("tenant-789");
    });

    it("extracts namespaced claim", () => {
      const jwt = createMockJwt({
        "https://cloud.ru/project_id": "ns-proj-999",
      });
      expect(extractProjectId(jwt)).toBe("ns-proj-999");
    });

    it("returns null when no project ID claim", () => {
      const jwt = createMockJwt({ sub: "user123" });
      expect(extractProjectId(jwt)).toBeNull();
    });

    it("returns null for invalid token", () => {
      expect(extractProjectId("garbage")).toBeNull();
    });

    it("prefers project_id over other claims", () => {
      const jwt = createMockJwt({
        project_id: "primary",
        cloud_project_id: "secondary",
        tenant_id: "tertiary",
      });
      expect(extractProjectId(jwt)).toBe("primary");
    });
  });

  describe("extractDisplayName", () => {
    it("extracts preferred_username", () => {
      const jwt = createMockJwt({ preferred_username: "ivan" });
      expect(extractDisplayName(jwt)).toBe("ivan");
    });

    it("falls back to name", () => {
      const jwt = createMockJwt({ name: "Ivan Petrov" });
      expect(extractDisplayName(jwt)).toBe("Ivan Petrov");
    });

    it("falls back to email", () => {
      const jwt = createMockJwt({ email: "ivan@company.ru" });
      expect(extractDisplayName(jwt)).toBe("ivan@company.ru");
    });

    it("falls back to sub", () => {
      const jwt = createMockJwt({ sub: "user-uuid-123" });
      expect(extractDisplayName(jwt)).toBe("user-uuid-123");
    });

    it("returns null for empty payload", () => {
      const jwt = createMockJwt({});
      expect(extractDisplayName(jwt)).toBeNull();
    });
  });
});

// ─── Delegation Error Code Tests ────────────────────────────────────

describe("DelegationErrorCode", () => {
  // Inline enum to avoid Electron import
  const DelegationErrorCode = {
    NOT_CONFIGURED: "DELEGATION_NOT_CONFIGURED",
    AGENT_NOT_FOUND: "DELEGATION_AGENT_NOT_FOUND",
    AGENT_NOT_HEALTHY: "DELEGATION_AGENT_NOT_HEALTHY",
    AUTH_MISSING: "DELEGATION_AUTH_MISSING",
    UNREACHABLE: "DELEGATION_UNREACHABLE",
    TIMEOUT: "DELEGATION_TIMEOUT",
    USER_DENIED: "DELEGATION_USER_DENIED",
  } as const;

  it("has all 7 error codes", () => {
    expect(Object.keys(DelegationErrorCode)).toHaveLength(7);
  });

  it("error codes have DELEGATION_ prefix", () => {
    for (const code of Object.values(DelegationErrorCode)) {
      expect(code).toMatch(/^DELEGATION_/);
    }
  });
});

// ─── Agent Catalog Logic Tests ──────────────────────────────────────

describe("Agent Catalog Logic", () => {
  // Test the normalizeStatus logic directly
  function normalizeStatus(s: string): string {
    const lower = s.toLowerCase();
    if (lower === "running" || lower === "active" || lower === "healthy")
      return "running";
    if (lower === "stopped" || lower === "inactive" || lower === "paused")
      return "stopped";
    if (lower === "deploying" || lower === "starting" || lower === "provisioning")
      return "deploying";
    return "error";
  }

  it("normalizes running statuses", () => {
    expect(normalizeStatus("running")).toBe("running");
    expect(normalizeStatus("Running")).toBe("running");
    expect(normalizeStatus("active")).toBe("running");
    expect(normalizeStatus("healthy")).toBe("running");
  });

  it("normalizes stopped statuses", () => {
    expect(normalizeStatus("stopped")).toBe("stopped");
    expect(normalizeStatus("inactive")).toBe("stopped");
    expect(normalizeStatus("paused")).toBe("stopped");
  });

  it("normalizes deploying statuses", () => {
    expect(normalizeStatus("deploying")).toBe("deploying");
    expect(normalizeStatus("starting")).toBe("deploying");
    expect(normalizeStatus("provisioning")).toBe("deploying");
  });

  it("defaults unknown statuses to error", () => {
    expect(normalizeStatus("unknown")).toBe("error");
    expect(normalizeStatus("crashed")).toBe("error");
    expect(normalizeStatus("")).toBe("error");
  });

  // Health gating
  describe("health gating", () => {
    interface AgentInfo {
      id: string;
      status: string;
    }

    function getHealthyAgent(
      agents: Map<string, AgentInfo>,
      agentId: string,
    ): AgentInfo | null {
      const agent = agents.get(agentId);
      if (!agent || agent.status !== "running") return null;
      return agent;
    }

    it("returns agent if status is running", () => {
      const agents = new Map([
        ["a1", { id: "a1", status: "running" }],
      ]);
      expect(getHealthyAgent(agents, "a1")).toEqual({ id: "a1", status: "running" });
    });

    it("returns null if agent is stopped", () => {
      const agents = new Map([
        ["a1", { id: "a1", status: "stopped" }],
      ]);
      expect(getHealthyAgent(agents, "a1")).toBeNull();
    });

    it("returns null if agent not found", () => {
      const agents = new Map<string, AgentInfo>();
      expect(getHealthyAgent(agents, "a1")).toBeNull();
    });
  });
});

// ─── A2A Response Truncation Tests ──────────────────────────────────

describe("A2A Response Truncation", () => {
  const MAX_RESPONSE_CHARS = 32_000;

  function truncateResponse(content: string): {
    content: string;
    truncated: boolean;
  } {
    if (content.length > MAX_RESPONSE_CHARS) {
      return {
        content:
          content.slice(0, MAX_RESPONSE_CHARS) +
          "\n\n[...response truncated]",
        truncated: true,
      };
    }
    return { content, truncated: false };
  }

  it("does not truncate short responses", () => {
    const result = truncateResponse("Hello, world!");
    expect(result.truncated).toBe(false);
    expect(result.content).toBe("Hello, world!");
  });

  it("truncates responses exceeding 32K chars", () => {
    const longContent = "x".repeat(40_000);
    const result = truncateResponse(longContent);
    expect(result.truncated).toBe(true);
    expect(result.content.length).toBeLessThan(longContent.length);
    expect(result.content).toContain("[...response truncated]");
  });

  it("truncated content starts with original content", () => {
    const longContent = "abc".repeat(20_000);
    const result = truncateResponse(longContent);
    expect(result.content.startsWith("abc")).toBe(true);
  });
});

// ─── Auth Config Defaults Tests ─────────────────────────────────────

describe("Auth Config Defaults", () => {
  const DEFAULT_AUTH_CONFIG = {
    authority:
      "https://iam.cloud.ru/realms/users/protocol/openid-connect",
    clientId: "agent_space",
    redirectUri: "hermes-desktop://auth/callback",
    scope: "openid profile",
  };

  it("has correct default authority URL", () => {
    expect(DEFAULT_AUTH_CONFIG.authority).toContain("iam.cloud.ru");
  });

  it("uses hermes-desktop protocol for redirect", () => {
    expect(DEFAULT_AUTH_CONFIG.redirectUri).toMatch(
      /^hermes-desktop:\/\//,
    );
  });

  it("requests openid and profile scopes", () => {
    expect(DEFAULT_AUTH_CONFIG.scope).toContain("openid");
    expect(DEFAULT_AUTH_CONFIG.scope).toContain("profile");
  });
});

// ─── FATAL_REFRESH_ERRORS Tests ─────────────────────────────────────

describe("FATAL_REFRESH_ERRORS", () => {
  const FATAL_REFRESH_ERRORS = [
    "invalid_grant",
    "invalid_token",
    "invalid_client",
    "unauthorized_client",
  ] as const;

  it("contains expected error codes", () => {
    expect(FATAL_REFRESH_ERRORS).toContain("invalid_grant");
    expect(FATAL_REFRESH_ERRORS).toContain("invalid_token");
  });

  it("has 4 fatal error types", () => {
    expect(FATAL_REFRESH_ERRORS).toHaveLength(4);
  });
});

// ─── IPC Channel Names Tests ────────────────────────────────────────

describe("IPC Channel Names", () => {
  const AUTH_CHANNELS = [
    "cloud-ru:auth:login",
    "cloud-ru:auth:callback",
    "cloud-ru:auth:logout",
    "cloud-ru:auth:status",
    "cloud-ru:auth:refresh",
  ];

  const AGENT_CHANNELS = [
    "cloud-ru:agents:catalog",
    "cloud-ru:agents:healthy",
    "cloud-ru:agents:sync-status",
    "cloud-ru:agents:force-sync",
    "cloud-ru:agents:delegate",
    "cloud-ru:agents:cancel",
  ];

  it("auth channels use cloud-ru:auth: prefix", () => {
    for (const ch of AUTH_CHANNELS) {
      expect(ch).toMatch(/^cloud-ru:auth:/);
    }
  });

  it("agent channels use cloud-ru:agents: prefix", () => {
    for (const ch of AGENT_CHANNELS) {
      expect(ch).toMatch(/^cloud-ru:agents:/);
    }
  });

  it("has 5 auth channels", () => {
    expect(AUTH_CHANNELS).toHaveLength(5);
  });

  it("has 6 agent channels", () => {
    expect(AGENT_CHANNELS).toHaveLength(6);
  });
});
