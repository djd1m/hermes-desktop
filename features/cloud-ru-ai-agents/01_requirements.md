# Step 1: Requirements — Cloud.ru AI Agents Integration

## Stakeholders

| Role | Who | Concern |
|------|-----|---------|
| End user | Enterprise employees (2000+) | Browse cloud agents, delegate tasks, see results |
| Developer | Enterprise team | Clean extension pattern, testable without Electron |
| Approver | Technical lead (DZ) | Working OIDC flow, proper UX, no upstream conflicts |

## Functional Requirements

### FR-1: OIDC Authentication (MUST)
User can sign in with cloud.ru IAM to access AI Agents management APIs.

**Acceptance Criteria:**
- Given the user clicks "Sign in with cloud.ru", When browser opens IAM login page, Then after successful auth, tokens are stored encrypted and agent catalog sync starts
- Given the user is authenticated, When access_token nears expiry, Then it auto-refreshes via refresh_token without user interaction
- Given the refresh_token is expired/revoked, When API returns 401, Then session is cleared and user sees "Session expired" message

### FR-2: Agent Catalog (MUST)
Users can browse available Cloud.ru AI Agents from the Discover screen.

**Acceptance Criteria:**
- Given user is authenticated with cloud.ru, When they open Discover → "Cloud.ru Agents" tab, Then available agents are listed with name, status, and model info
- Given agents are synced, When an agent's status is "running", Then it shows a green indicator and is available for delegation
- Given agents are synced, When an agent's status is "stopped" or "error", Then it shows appropriate indicator and delegation is disabled

### FR-3: Task Delegation (MUST)
Users can delegate tasks to running cloud agents via A2A protocol.

**Acceptance Criteria:**
- Given user selects a running agent, When they enter a task description and click "Delegate", Then a confirmation dialog appears (alwaysPlanGated)
- Given user approves delegation, When A2A request is sent, Then streaming progress is shown in the UI
- Given delegation completes, When result is received, Then it is truncated to 32K chars and displayed
- Given delegation fails or times out (120s default), When error occurs, Then user sees clear error message with option to retry

### FR-4: Discover Tab Integration (MUST)
Cloud.ru Agents appear as a new tab in the existing Discover screen.

**Acceptance Criteria:**
- Given hermes-desktop is launched, When user navigates to Discover, Then "Cloud.ru Agents" tab appears alongside Skills, MCPs, Agents, Workflows
- Given user is NOT authenticated with cloud.ru, When they click "Cloud.ru Agents" tab, Then they see a sign-in prompt
- Given user IS authenticated, When they view the tab, Then they see catalog with agent cards

### FR-5: Running Agents Panel (SHOULD)
Show currently running agents that user can interact with.

**Acceptance Criteria:**
- Given user is authenticated, When agents with status "running" exist, Then "Running Agents" section shows them prominently
- Given a running agent exists, When user clicks "Use", Then delegation dialog opens with that agent pre-selected

### FR-6: i18n Labels (MUST)
All UI text localized in 10 supported locales.

## Non-Functional Requirements

| Category | Requirement |
|----------|-------------|
| **Security** | OIDC + PKCE (SHA-256), tokens encrypted via safeStorage, WAF headers for console APIs |
| **Reliability** | Cloud.ru outage must not break local functionality; graceful error handling |
| **Performance** | Catalog sync every 15s when authenticated; SSE streaming for delegation progress |
| **Data sovereignty** | All agent execution on Cloud.ru infrastructure (Russian data centers, FZ-152) |

## Constraints

1. All enterprise code in `src/main/enterprise/` to minimize upstream merge conflicts
2. Follow existing extension pattern from Cloud.ru FM feature
3. Two-level auth: OIDC for agent management, static API key for FM inference (independent)
4. Port patterns from ADR-004 and ext-cloud-ru-agents scaffold

## Scope Boundaries

**In scope:** OIDC auth, agent catalog, A2A delegation, Discover tab, i18n, tests
**Out of scope:** Custom agent creation, billing/cost UI, multi-project support, offline agent cache
