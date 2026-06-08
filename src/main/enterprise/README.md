# Enterprise Extension Layer

Custom enterprise features for Hermes Desktop fork (djd1m/hermes-desktop).

## Architecture

All enterprise code lives under `src/main/enterprise/` and `src/renderer/src/screens/Enterprise/` to minimize merge conflicts when syncing with upstream (fathah/hermes-desktop).

### Integration Points with Upstream

Only these upstream files are modified (minimal diff):

| File | Change | Purpose |
|------|--------|---------|
| `src/main/index.ts` | +1 import, +1 `initEnterprise()` call | Bootstrap enterprise extensions |
| `provider-registry.ts` | +2 entries (cloud-ru) | Cloud.ru Foundation Models provider |

### Adding New Features

1. Create a new file under `src/main/enterprise/`
2. Export an init function from it
3. Call that init function from `src/main/enterprise/index.ts`
4. If UI is needed, add screens under `src/renderer/src/screens/Enterprise/`

### Current Extensions

- **cloud-ru-provider.ts** — Cloud.ru Foundation Models provider registration (OpenAI-compatible)

### Planned Extensions

#### Medium-term (~2-3 weeks each)
- **dag-orchestrator.ts** — DAG orchestration ported from Autoclaw (visual plan builder, cost tracking per node, HITL gates)
- **plan-correction.ts** — Plan Correction Confidence (PCC) — mid-execution plan refinement with lineage tracking
- **mcp-streamable.ts** — MCP Streamable HTTP transport (MCP-B) — bidirectional server-push support beyond stdio/http
- **project-scope.ts** — Project management (Cowork-style): persistent project context, project-level memory, shared knowledge graph across sessions, multi-agent coordination on one codebase
- **vm-sandbox.ts** — VM-level sandbox isolation for code execution (WSL2 on Windows, Lima VM on macOS, Docker on Linux). Three-tier model: path guard (basic), enhanced VM (default), full isolation (strict). Critical for enterprise security when running untrusted agent code.
- **memory-separation.ts** — Core/Experience memory separation: core memory (persistent identity, preferences, project facts) vs experience memory (session-derived knowledge, LLM-extracted patterns). Prompt optimizer uses both layers for context-aware responses. Extends upstream MEMORY.md + USER.md with structured storage.

#### CMC Architecture (~1-2 months)
- **paperclip-bridge.ts** — Integration with Paperclip CMC control plane (task intake, status reporting, budget tracking)
- **identity-broker.ts** — OAuth delegation UI, scoped tokens for CMC
- **a2a-messaging.ts** — Buffered agent-to-agent messaging via CMC

#### Nice to have
- **telemetry-otel.ts** — OpenInference telemetry with OTLP export
- **enterprise-config.ts** — Enterprise-specific configuration UI
