# ADR-001: Provider Registration Strategy for Cloud.ru Foundation Models

## Status
Accepted

## Context

Hermes Desktop needs to support Cloud.ru Foundation Models as an LLM provider. Cloud.ru FM exposes an OpenAI-compatible API at `https://foundation-models.api.cloud.ru/v1` with Bearer token auth (service-account API key from cloud.ru console).

Hermes-desktop uses a flat registry model: providers are URL strings in `PROVIDER_BASE_URLS`, API keys mapped via `URL_KEY_MAP`, and UI entries in `PROVIDERS.options/setup`.

The autoclaw-copy project has a full class-based implementation (`CloudRuFoundationProvider`), but hermes-desktop's architecture is simpler and doesn't need that complexity.

## Decision Drivers
- Minimize upstream merge conflicts (enterprise layer philosophy)
- Reuse existing hermes-desktop patterns (URL registry + key map)
- Cloud.ru FM is fully OpenAI-compatible — no custom transport needed
- Reference implementation in autoclaw-copy proves the API works

## Considered Options

### Option A: Flat Registry (add to existing maps)
Register Cloud.ru FM in the existing flat registry (URL + key map + UI). Same pattern as Xiaomi, DeepSeek, etc.

**Pros:** Zero architectural changes, follows existing patterns exactly, works immediately
**Cons:** None significant — API is OpenAI-compatible

### Option B: Port autoclaw class-based provider
Create a `CloudRuFoundationProvider` class similar to autoclaw.

**Pros:** Full feature parity with autoclaw (model listing, tool-call classification)
**Cons:** Architectural divergence from upstream, 200+ lines of new code, merge conflict risk, unnecessary for OpenAI-compat API

## Decision

We chose **Option A: Flat Registry** because:

1. Cloud.ru Foundation Models IS OpenAI-compatible → fits perfectly in the flat model
2. Same pattern as every other remote provider in hermes-desktop
3. Minimal diff, minimal merge conflict risk
4. Model discovery already works via existing `/v1/models` endpoint support

### Concrete Approach
- `PROVIDER_BASE_URLS["cloud-ru"]` = `https://foundation-models.api.cloud.ru/v1`
- `URL_KEY_MAP` entry: `foundation-models.api.cloud.ru` → `CLOUD_RU_API_KEY`
- `OPENAI_COMPAT_PROVIDERS` set includes `cloud-ru`
- `PROVIDERS.options/labels/setup` + `LOCAL_PRESETS` + `SETTINGS_SECTIONS`
- Default models: `ai-sage/GigaChat3-10B-A1.8B`, `ai-sage/GigaChat3-1.7B`

## Consequences

### Positive
- Zero transport-layer changes
- Follows established patterns
- Cloud.ru FM works out of the box with existing model-discovery

### Negative
- None significant

### Risks
- **LOW:** Cloud.ru API endpoint changes (unlikely, it's OpenAI-compatible standard)

## Traceability
- FR-1 (Provider Registration): ✅
- FR-2 (API Key Management): ✅
- FR-3 (Default Models): ✅
- FR-4 (Setup Instructions): ✅
- FR-5 (i18n): ✅
- FR-6 (Model Discovery): ✅ (inherits existing /v1/models support)

## Shift-Left Validation

### BDD Scenarios
```gherkin
Scenario: Cloud.ru FM appears in provider dropdown
  Given hermes-desktop is launched
  When user opens the provider settings
  Then "Cloud.ru Foundation Models" appears in the provider list

Scenario: Cloud.ru API key configuration
  Given user selects Cloud.ru FM provider
  When they enter an API key in the setup form
  Then the key is stored as CLOUD_RU_API_KEY env var

Scenario: Cloud.ru default model is pre-configured
  Given user has configured Cloud.ru API key
  When they open the model selector
  Then "GigaChat3-10B (Cloud.ru)" appears as a default model option
```

### Risk Level: LOW
All changes are additive to existing registries. No transport modifications.
