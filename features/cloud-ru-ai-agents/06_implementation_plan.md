# Step 6: Implementation Plan — Cloud.ru AI Agents Integration

## Goal State
Users can authenticate with cloud.ru IAM, browse available AI Agents in the Discover tab, and delegate tasks to running agents via A2A protocol.

## Tasks

| # | Task | File(s) | Status |
|---|------|---------|--------|
| T1 | Define types (AuthConfig, TokenData, CloudAgentInfo, etc.) | `enterprise/cloud-ru-agents/types.ts` | |
| T2 | Implement JWT decode + project_id extraction | `enterprise/cloud-ru-agents/jwt-utils.ts` | |
| T3 | Implement token store (Electron safeStorage) | `enterprise/cloud-ru-agents/token-store.ts` | |
| T4 | Implement OIDC + PKCE auth service | `enterprise/cloud-ru-agents/auth-service.ts` | |
| T5 | Implement REST client with Bearer + 401 retry | `enterprise/cloud-ru-agents/rest-client.ts` | |
| T6 | Implement agent catalog with health polling | `enterprise/cloud-ru-agents/agent-catalog.ts` | |
| T7 | Implement A2A HTTP+SSE client | `enterprise/cloud-ru-agents/a2a-client.ts` | |
| T8 | Implement delegation service orchestrator | `enterprise/cloud-ru-agents/delegation-service.ts` | |
| T9 | Register IPC handlers + init function | `enterprise/cloud-ru-agents/index.ts` | |
| T10 | Wire initCloudRuAgents() in enterprise/index.ts | `enterprise/index.ts` | |
| T11 | Add preload bridge methods | `preload/index.ts`, `preload/index.d.ts` | |
| T12 | Add Cloud.ru Agents tab to Discover | `renderer/src/screens/Discover/CloudRuAgents.tsx` | |
| T13 | Integrate tab into Discover.tsx | `renderer/src/screens/Discover/Discover.tsx` | |
| T14 | Add i18n labels (10 locales) | `shared/i18n/locales/*/cloudru-agents.ts` | |
| T15 | Write unit tests | `tests/cloud-ru-agents.test.ts` | |

## Success Criteria
- [ ] OIDC login flow works (prepareLogin → callback → tokens stored)
- [ ] Agent catalog syncs from Cloud.ru API
- [ ] Cloud.ru Agents tab appears in Discover
- [ ] Running agents displayed with "Use" action
- [ ] Delegation sends A2A request with SSE streaming
- [ ] All error codes handled with user-friendly messages
- [ ] Tests pass
- [ ] i18n labels in all 10 locales
