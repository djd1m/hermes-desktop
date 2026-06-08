# Step 1: Requirements — Cloud.ru Foundation Models Provider

## Stakeholders

| Role | Who | Concern |
|------|-----|---------|
| End user | Enterprise employees (2000+) | Select Cloud.ru FM from provider dropdown, enter API key, use models |
| Developer | Enterprise team | Minimal upstream diff, extensible pattern for future providers |
| Approver | Technical lead (DZ) | Working integration, proper i18n, no upstream merge conflicts |

## Functional Requirements

### FR-1: Provider Registration (MUST)
Register Cloud.ru Foundation Models as a selectable provider in the UI.

**Acceptance Criteria:**
- Given hermes-desktop is launched, When user opens provider settings, Then "Cloud.ru Foundation Models" appears in the provider dropdown
- Given the enterprise layer is initialized, When PROVIDER_BASE_URLS is accessed, Then it contains `cloud-ru` entry with `https://foundation-models.api.cloud.ru/v1`

### FR-2: API Key Management (MUST)
Allow users to set API key for Cloud.ru FM through the existing settings UI.

**Acceptance Criteria:**
- Given user selects Cloud.ru FM provider, When they enter an API key, Then it is stored via existing env/config mechanism
- Given URL `foundation-models.api.cloud.ru`, When url-key-map resolves it, Then it returns `CLOUD_RU_API_KEY` env var name

### FR-3: Default Models (MUST)
Provide pre-configured default models from Cloud.ru catalog.

**Acceptance Criteria:**
- Given user selects Cloud.ru provider, When they open model selector, Then `ai-sage/GigaChat3-10B-A1.8B` and `ai-sage/GigaChat3-1.7B` are available as defaults

### FR-4: Provider Setup Instructions (SHOULD)
Show setup hints for obtaining API key.

**Acceptance Criteria:**
- Given user selects Cloud.ru FM in providers screen, When setup section renders, Then it shows link to cloud.ru console with key instructions

### FR-5: i18n Labels (MUST)
Add provider labels in all 10 supported locales.

**Acceptance Criteria:**
- Given any locale is active, When provider dropdown renders, Then Cloud.ru Foundation Models name is properly displayed

### FR-6: Model Discovery (COULD)
Support /v1/models endpoint for Cloud.ru to auto-discover available models.

**Acceptance Criteria:**
- Given Cloud.ru API key is set, When model-discovery queries /v1/models, Then available models are listed

## Non-Functional Requirements

| Category | Requirement |
|----------|-------------|
| **Compatibility** | Cloud.ru FM API is OpenAI-compatible — no custom transport |
| **Security** | API key stored via existing secure env mechanism; Bearer auth |
| **Maintainability** | All changes additive to existing registries — minimal upstream modifications |

## Constraints

1. **Technical:** Hermes Desktop uses a flat URL→key registry. Cloud.ru FM fits perfectly as it's OpenAI-compatible.
2. **Upstream sync:** Minimize changes to upstream files. Enterprise additions should be additive.
3. **Pattern:** Follow existing provider registration pattern (see Xiaomi, DeepSeek additions).

## Scope Boundaries

**In scope:**
- Provider dropdown entry for Cloud.ru Foundation Models
- API key configuration via existing settings UI
- URL→key mapping for auth
- Default model definitions (from Cloud.ru catalog)
- i18n labels (10 locales)
- Tests for provider registry

**Out of scope:**
- Custom streaming/tool-call handling (API is OpenAI-compatible)
- Model browser modal (autoclaw feature, not in hermes-desktop)
- Other Cloud.ru services (AI Agents, etc.)

**Dependencies:**
- `initEnterprise()` must be called from `src/main/index.ts`
- Existing provider-registry, url-key-map, constants patterns

**Dependents:**
- Future enterprise features (Project scope, MCP-B) will reuse this pattern
