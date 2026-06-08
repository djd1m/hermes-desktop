# Step 0: Complexity Assessment — Cloud.ru AI Agents Integration

## Feature Description

Integrate Cloud.ru AI Factory AI Agents into Hermes Desktop:
- OIDC + PKCE authentication against cloud.ru IAM
- Agent catalog discovery with health polling
- A2A (Agent-to-Agent) HTTP+SSE delegation
- "Cloud.ru Agents" tab in Discover screen (catalog + running agents)
- User approval gate for every delegation

Reference: ADR-004 from universal-ai-client, ext-cloud-ru-agents scaffold.

## Dimension Scoring

| Dimension | Score | Reasoning |
|-----------|-------|-----------|
| **Files affected** | 3 (L) | ~25 files: 8 new backend modules, 1 new UI component, 10 i18n, preload bridge, enterprise init, tests |
| **Domains touched** | 3 (L) | main process (auth, IPC, catalog), renderer (Discover UI, delegation dialogs), preload (bridge), shared (i18n) |
| **New integrations** | 3 (L) | 2 external APIs: Cloud.ru IAM (OIDC), Cloud.ru AI Factory (agent management + A2A) |
| **Breaking changes** | 1 (S) | Zero — purely additive, new IPC channels, new UI tab |
| **New data models** | 2 (M) | AuthState, TokenData, CloudAgentInfo, DelegationRequest/Result, PkceFlowState |
| **Cross-cutting concerns** | 2 (M) | i18n (10 locales), security (OIDC tokens, encrypted storage), error taxonomy |

**Total Score: 14 → L (Large)**

## Active Steps

```
0 → 1 → 3(1 ADR) → 3.5(QCSD) → 5(arch) → 6 → 7 → 8 → [extended skills in 7,8]
```

## Flags

```
HAS_AUTH = true (OIDC + PKCE flow, token refresh)
HAS_EXTERNAL_API = true (Cloud.ru IAM + AI Factory)
HAS_PERFORMANCE_SLA = false
HAS_INFRASTRUCTURE_CHANGE = false
AGENTIC_QE_MODE = direct-extended
```

## File Impact Map

### New files (enterprise backend)
1. `src/main/enterprise/cloud-ru-agents/types.ts`
2. `src/main/enterprise/cloud-ru-agents/auth-service.ts`
3. `src/main/enterprise/cloud-ru-agents/token-store.ts`
4. `src/main/enterprise/cloud-ru-agents/jwt-utils.ts`
5. `src/main/enterprise/cloud-ru-agents/rest-client.ts`
6. `src/main/enterprise/cloud-ru-agents/agent-catalog.ts`
7. `src/main/enterprise/cloud-ru-agents/a2a-client.ts`
8. `src/main/enterprise/cloud-ru-agents/delegation-service.ts`
9. `src/main/enterprise/cloud-ru-agents/index.ts` — IPC handler registration

### Modified files
10. `src/main/enterprise/index.ts` — call initCloudRuAgents()
11. `src/preload/index.ts` — add cloud-ru:* IPC bridges
12. `src/preload/index.d.ts` — type definitions
13. `src/renderer/src/screens/Discover/Discover.tsx` — add Cloud.ru Agents tab

### I18n (add labels)
14-23. `src/shared/i18n/locales/{en,es,ja,...}/cloudru.ts` (10 locales)

### Tests
24. `tests/cloud-ru-agents.test.ts`
