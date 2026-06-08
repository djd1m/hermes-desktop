# ADR-001: Cloud.ru AI Agents Integration Strategy

## Status
Accepted

## Context

Cloud.ru AI Factory provides managed GPU instances for running AI agents. Hermes Desktop needs to:
1. Authenticate users via OIDC to access agent management APIs
2. Discover and display available agents in the Discover screen
3. Delegate tasks to running agents via A2A HTTP+SSE protocol
4. Show results back in the conversation

Reference implementation exists in `universal-ai-client/packages/ext-cloud-ru-agents/` (scaffold) and `universal-ai-client/features/bootstrap-universal-ai-client/03_adr/004-cloud-ru-delegation.md` (architecture).

## Decision

**Inline enterprise modules** in `src/main/enterprise/cloud-ru-agents/` rather than separate npm package.

### Why inline, not ext-* package

The universal-ai-client uses a monorepo with `@uac/ext-cloud-ru-agents` as a separate npm workspace package. For hermes-desktop (a fork, not a monorepo), we keep everything inside the enterprise extension layer:

| Factor | ext-* package | Inline enterprise module |
|--------|--------------|------------------------|
| Build complexity | Needs tsup + workspace config | Uses existing Vite build |
| Upstream sync | Separate repo, no conflicts | All in enterprise/ — excluded from sync |
| Dependencies | @uac/shared import | Direct imports, zero extra deps |
| Testing | Separate test runner | Same vitest config as HD |

### Architecture

```
src/main/enterprise/cloud-ru-agents/
  index.ts              — initCloudRuAgents(): registers IPC handlers
  types.ts              — All type definitions (no external deps)
  auth-service.ts       — OIDC + PKCE flow against cloud.ru IAM
  token-store.ts        — Encrypted token persistence (Electron safeStorage)
  jwt-utils.ts          — JWT decode, project_id extraction
  rest-client.ts        — HTTP client with Bearer + 401 auto-retry
  agent-catalog.ts      — Cloud agent discovery + health polling
  a2a-client.ts         — A2A HTTP+SSE streaming client
  delegation-service.ts — Delegation lifecycle orchestrator
```

### Two-Level Auth (from ADR-004)

| Level | Purpose | Credential | Storage |
|-------|---------|-----------|---------|
| Level 1: OIDC | Agent management, catalog | JWT access_token (auto-refresh) | safeStorage encrypted |
| Level 2: API key | FM inference | Static Bearer key | HD settings UI |

These are independent — user can use FM without OIDC and vice versa.

### IPC Channels

Auth: `cloud-ru:auth:{login,callback,logout,status,refresh}`
Delegation: `cloud-ru:delegate`, `cloud-ru:catalog`, `cloud-ru:cancel`

### Key Design Decisions

1. **Health-gated delegation** — only `status='running'` agents eligible
2. **alwaysPlanGated** — user approval required before every delegation
3. **15s catalog sync** — matches autoclaw reference implementation
4. **32K char response truncation** — protects local LLM context
5. **Error taxonomy** — 6 distinct error codes for clear UX feedback
6. **Graceful degradation** — cloud.ru outage doesn't break local HD

## Consequences

### Positive
- Zero new npm dependencies (pure TS + Node built-ins)
- Follows proven patterns from ext-cloud-ru-agents scaffold
- Modular — can be extracted to ext-* package later if needed
- Discover tab integration feels native to existing UI

### Negative
- OIDC flow requires Electron protocol handler for deep-link callback
- Two credentials to manage (slightly more complex onboarding)
- WAF headers may change if cloud.ru updates console

## Shift-Left BDD Scenarios
(See 01_requirements.md for full BDD scenarios)
