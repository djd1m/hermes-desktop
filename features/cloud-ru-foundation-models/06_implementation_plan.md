# Step 6: Implementation Plan — Cloud.ru Foundation Models Provider

## Goal State
Cloud.ru Foundation Models appears as a fully functional provider in hermes-desktop with API key management, default models, and i18n support.

## Tasks

| # | Task | File(s) | Status |
|---|------|---------|--------|
| T1 | Add Cloud.ru to PROVIDER_BASE_URLS | `src/main/provider-registry.ts` | ✅ |
| T2 | Add URL→key mapping | `src/shared/url-key-map.ts` | ✅ |
| T3 | Add to OPENAI_COMPAT_PROVIDERS set | `src/shared/url-key-map.ts` | ✅ |
| T4 | Add to PROVIDERS.options dropdown | `src/renderer/src/constants.ts` | ✅ |
| T5 | Add to PROVIDERS.labels map | `src/renderer/src/constants.ts` | ✅ |
| T6 | Add to PROVIDERS.setup array | `src/renderer/src/constants.ts` | ✅ |
| T7 | Add to LOCAL_PRESETS (remote group) | `src/renderer/src/constants.ts` | ✅ |
| T8 | Add SETTINGS_SECTIONS entry | `src/renderer/src/constants.ts` | ✅ |
| T9 | Add default models | `src/main/default-models.ts` | ✅ |
| T10 | Wire initEnterprise() in main/index.ts | `src/main/index.ts` | ✅ |
| T11 | Clean up enterprise provider file | `src/main/enterprise/cloud-ru-provider.ts` | ✅ |
| T12 | Add i18n labels (10 locales) | `src/shared/i18n/locales/*/` | ✅ |
| T13 | Add provider-registry tests | `tests/provider-registry.test.ts` | ✅ |

## Success Criteria
- [x] `canonicalProviderBaseUrl("cloud-ru")` returns Cloud.ru FM URL
- [x] `expectedEnvKeyForUrl("https://foundation-models.api.cloud.ru/v1")` returns `CLOUD_RU_API_KEY`
- [x] Cloud.ru FM appears in provider dropdown with setup instructions
- [x] Default models appear in models library
- [x] All 7 tests pass
