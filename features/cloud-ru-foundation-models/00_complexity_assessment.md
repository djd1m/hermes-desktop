# Step 0: Complexity Assessment — Cloud.ru Foundation Models Provider

## Feature Description

Integrate Cloud.ru Foundation Models as an LLM provider into hermes-desktop.
The API is OpenAI-compatible — no custom transport needed. Enterprise layer scaffold already exists.

## Dimension Scoring

| Dimension | Score | Reasoning |
|-----------|-------|-----------|
| **Files affected** | 2 (M) | ~15 files: 4 critical + 1 test + 10 i18n + 2 enterprise (done). Substantive changes in ~6 files. |
| **Domains touched** | 2 (M) | main process (providers, config) + renderer (UI constants, settings) |
| **New integrations** | 2 (M) | 1 new external API: Cloud.ru Foundation Models (OpenAI-compatible) |
| **Breaking changes** | 1 (S) | Zero breaking changes — purely additive |
| **New data models** | 1 (S) | Zero — reuses existing SavedModel, ModelConfig |
| **Cross-cutting concerns** | 2 (M) | i18n (10 locales need provider labels) |

**Total Score: 10 → M (Medium)**

No override rules triggered.

## Active Steps

```
0 → 1 → 3(1 ADR) → 3.5(QCSD) → 5(light) → 6 → 7 → 8 → [extended skills in 7,8]
```

Steps skipped: 2 (Research), 4 (DDD), 9 (Fleet QE — L/XL only)

## --full-qe-extended Activations

| Skill | Step | Active? |
|-------|------|---------|
| shift-left-testing | 3 | YES |
| qcsd-ideation-swarm | 3.5 | YES |
| brutal-honesty-review | 8 | YES |
| tdd-london-chicago | 7 | YES |
| mutation-testing | 8 | YES |
| security-testing | 8 | YES (HAS_EXTERNAL_API) |

## Flags

```
HAS_AUTH = false (uses existing API key mechanism)
HAS_EXTERNAL_API = true (Cloud.ru Foundation Models endpoint)
HAS_PERFORMANCE_SLA = false
HAS_INFRASTRUCTURE_CHANGE = false
AGENTIC_QE_MODE = direct-extended
```

## Time Budget

| Phase | Budget |
|-------|--------|
| Requirements | 5 min |
| Planning (ADR + Arch) | 10 min |
| Implementation | 20 min |
| QE | 10 min |
| **Total** | **~45 min** |

## File Impact Map

### Critical (modify)
1. `src/renderer/src/constants.ts` — PROVIDERS options/labels/setup, LOCAL_PRESETS, SETTINGS_SECTIONS
2. `src/shared/url-key-map.ts` — URL→env key mapping, OPENAI_COMPAT_PROVIDERS
3. `src/main/default-models.ts` — default model entries
4. `src/main/provider-registry.ts` — canonical base URL

### I18n (add labels)
5-14. `src/shared/i18n/locales/{en,es,ja,...}/{providers,constants}.ts` (10 locales)

### Testing
15. `tests/provider-registry.test.ts` — add Cloud.ru assertions

### Enterprise wiring
16. `src/main/index.ts` — import + call initEnterprise()
17. `src/main/enterprise/cloud-ru-provider.ts` — runtime guard
18. `src/main/enterprise/index.ts` — entry point (no change needed)
