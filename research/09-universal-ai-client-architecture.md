# Universal AI Client — Architecture Strategy

> Date: 2026-06-08
> Goal: Build a maximally functional universal AI client integrating the best of Cowork ecosystem + Hermes Desktop + Cloud.ru platform
> Approach: Compose from fast-growing open-source projects, not build from scratch

## Why Compose, Not Build

В 2026 году опенсорс AI-клиенты развиваются взрывными темпами:
- **openwork** набрал 15,900★ за месяцы
- **eigent** — 12,900★, 36 toolkits, multi-agent DAG
- **open-cowork** — VM sandbox, memory separation, doc gen за 693 коммита

Писать всё с нуля = отставать от рынка. Оптимальная стратегия:

1. Взять **зрелую основу** с максимальным feature-набором
2. **Портировать** недостающие модули из лучших проектов экосистемы
3. **Интегрировать** с Cloud.ru (FM + AI Agents) — уникальное конкурентное преимущество
4. Поддерживать **upstream sync** для бесплатного получения апстрим-фич

---

## Выбор основы: Hermes Desktop

### Почему HD, а не другие

| Критерий | HD | Ближайший конкурент | Разрыв |
|----------|----|--------------------|--------|
| Inbound messaging gateways | **16** | OpenSail: 6 | 2.7x |
| Skills | **80+** | eigent: 36 toolkits | 2.2x |
| i18n | **11 locales** | openwork: 10 | Паритет |
| Tests | **11,250 строк** | zosma: есть Vitest | ~3-5x |
| Multi-profile isolation | **Yes** | Все остальные: No | Уникально |
| Kanban/task dispatch | **Yes** | OpenSail: Yes | Паритет |
| Browser automation | **Playwright + Browserbase** | eigent: browser agent | HD глубже |
| 3D Office | **Yes** | Все: No | Уникально |
| Cloud.ru FM | **Yes (done)** | Все: No | Уникально |
| Enterprise extension layer | **Yes** | Все: No | Уникально |
| Upstream sync | **Yes** (fathah/hermes-desktop) | — | Бесплатные фичи |

**HD выигрывает по 8 из 11 критериев.** Портирование HD-фич в любой Cowork-вариант = 3-6 месяцев. Портирование Cowork-фич в HD = 8-12 недель.

---

## Архитектура решения

```
┌─────────────────────────────────────────────────────────────────┐
│                    Universal AI Client                          │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              Hermes Desktop (Electron UI)                │   │
│  │  React 19 + TS 5.9 + Tailwind 4                         │   │
│  │  16 gateways · 80+ skills · 11 i18n · Kanban · 3D       │   │
│  │  Multi-profile · Browser automation · Cloud.ru FM ✅     │   │
│  └──────────────┬───────────────────────────────────────────┘   │
│                 │                                               │
│  ┌──────────────┴───────────────────────────────────────────┐   │
│  │           Enterprise Extension Layer                      │   │
│  │  src/main/enterprise/ — модульные расширения              │   │
│  │                                                           │   │
│  │  ┌─────────────┐ ┌─────────────┐ ┌──────────────────┐   │   │
│  │  │ Cloud.ru FM │ │ Cloud.ru    │ │ VM Sandbox       │   │   │
│  │  │ ✅ Done     │ │ AI Agents   │ │ (open-cowork)    │   │   │
│  │  └─────────────┘ └─────────────┘ └──────────────────┘   │   │
│  │  ┌─────────────┐ ┌─────────────┐ ┌──────────────────┐   │   │
│  │  │ Core/Exp    │ │ DAG Orch    │ │ Doc Generation   │   │   │
│  │  │ Memory      │ │ (eigent)    │ │ (open-cowork)    │   │   │
│  │  └─────────────┘ └─────────────┘ └──────────────────┘   │   │
│  │  ┌─────────────┐ ┌─────────────┐ ┌──────────────────┐   │   │
│  │  │ MCP OAuth   │ │ SSO/RBAC    │ │ Paperclip Bridge │   │   │
│  │  │ (open-cow.) │ │ (custom)    │ │ (CMC control)    │   │   │
│  │  └─────────────┘ └─────────────┘ └──────────────────┘   │   │
│  └──────────────────────────────────────────────────────────┘   │
│                 │                                               │
│  ┌──────────────┴───────────────────────────────────────────┐   │
│  │              Hermes Agent (Python Runtime)                │   │
│  │  30+ tools · MCP client · 16 messaging gateways           │   │
│  │  OpenAI-compatible API · SQLite sessions                  │   │
│  └──────────────────────────────────────────────────────────┘   │
│                 │                                               │
│  ┌──────────────┴───────────────────────────────────────────┐   │
│  │              Cloud.ru Platform Layer                       │   │
│  │                                                           │   │
│  │  ┌─────────────────────┐  ┌────────────────────────────┐ │   │
│  │  │ Foundation Models   │  │ AI Factory AI Agents       │ │   │
│  │  │ api.cloud.ru/v1     │  │ Managed GPU compute        │ │   │
│  │  │ GigaChat3, etc.     │  │ Scaling, lifecycle         │ │   │
│  │  │ ✅ Integrated       │  │ Agent delegation           │ │   │
│  │  └─────────────────────┘  └────────────────────────────┘ │   │
│  └──────────────────────────────────────────────────────────┘   │
│                 │                                               │
│  ┌──────────────┴───────────────────────────────────────────┐   │
│  │              Paperclip CMC (Control Plane)                │   │
│  │  Heartbeat · Budgets · Org charts · Governance            │   │
│  │  Adapter registry · Task intake · Status reporting        │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Проекты-доноры и что из каждого берём

### 1. Hermes Desktop — ОСНОВА (100%)

**Repo:** github.com/fathah/hermes-desktop (upstream) → github.com/djd1m/hermes-desktop (fork)
**Берём:** Всё целиком как base layer.
**Sync:** `./scripts/sync-upstream.sh` — получаем апстрим-фичи бесплатно.

### 2. Hermes Agent — RUNTIME (100%, уже в HD)

**Repo:** github.com/OEvortex/HermesAgent
**Берём:** Python agent runtime, 30+ tools, 16 messaging gateways, MCP client.
**Sync:** Обновляется через `pip install` / bundled binary.

### 3. open-cowork — МОДУЛИ (портирование 4 модулей)

**Repo:** github.com/OpenCoworkAI/open-cowork (871★, MIT)
**Берём:**

| Модуль | Что именно | Куда в HD | Оценка |
|--------|-----------|-----------|--------|
| VM Sandbox | `sandbox/` — Lima (macOS), WSL2 (Windows), Docker (Linux), 3-tier model | `enterprise/vm-sandbox.ts` | ~2-3 нед |
| Core/Experience Memory | `memory/` — core (identity, facts) vs experience (LLM-extracted) + prompt optimizer | `enterprise/memory-separation.ts` | ~2-3 нед |
| Document Generation | `skills/docx.ts`, `skills/pptx.ts`, `skills/pdf.ts`, `skills/xlsx.ts` | `enterprise/doc-gen/` | ~1 нед |
| MCP OAuth | `mcp-oauth.ts` — OAuth flow for remote MCP servers | `enterprise/mcp-oauth.ts` | ~1 нед |

**Не берём:** pi-harness agent loop (у нас Hermes Agent), Feishu dispatch (у нас 16 gateways), UI (у нас свой).

### 4. eigent — ПАТТЕРНЫ (reference + портирование DAG)

**Repo:** github.com/eigent-ai/eigent (12,900★, Apache 2.0)
**Берём:**

| Паттерн | Что именно | Как используем |
|---------|-----------|----------------|
| DAG Orchestration | TaskLock + asyncio.Queue, 8 agent types, parallel decomposition | Reference для `enterprise/dag-orchestrator.ts`, адаптация под Hermes Agent |
| 36 Toolkits | Slack/WhatsApp/Twitter/LinkedIn/Reddit/Lark/Gmail toolkits | Идеи для расширения Hermes Agent tools |
| CAMEL-AI ModelFactory | Pluggable model abstraction | Reference для multi-LLM routing |

**Не берём:** Python backend (у нас Hermes Agent), Electron shell (у нас HD), enterprise SSO/RBAC (не подтверждено в OSS).

### 5. autoclaw-copy — CLOUD.RU ИНТЕГРАЦИЯ (портирование)

**Repo:** Внутренний (локальный)
**Берём:**

| Компонент | Что именно | Статус |
|-----------|-----------|--------|
| Cloud.ru FM Provider | `CloudRuFoundationProvider`, URL, auth, model listing | ✅ Done (feature/01) |
| Cloud.ru AI Agents | `delegate-to-cloud-agent.ts`, API client, instance management | ~2-3 нед |
| Model Classification | `model-classification.ts` — tool-calling support detection | ~1 нед |

### 6. Paperclip — CONTROL PLANE (уже есть fork)

**Repo:** github.com/djd1m/paperclip-fork
**Берём:** Heartbeat executor, adapter registry, org charts, budgets, governance, plugins.
**Интеграция:** Через `enterprise/paperclip-bridge.ts` + hermes-paperclip-adapter.

### 7. OpenSail — REFERENCE ONLY (не портируем, изучаем)

**Repo:** github.com/TesslateAI/OpenSail (574★, Apache 2.0)
**Берём:** Идеи, не код.

| Идея | Применение |
|------|-----------|
| K8s 3-tier compute | Reference для VM sandbox scaling |
| LiteLLM routing | Reference для multi-LLM provider routing |
| Approval workflows | Reference для Paperclip governance |
| BtrFS snapshots | Reference для workspace isolation |
| Fleet agent types | Reference для multi-agent architecture |

---

## Roadmap портирования

### Phase 1: Cloud.ru (недели 1-4)

| # | Задача | Источник | Оценка | Статус |
|---|--------|---------|--------|--------|
| 1 | Cloud.ru Foundation Models | autoclaw-copy | 1 день | ✅ Done |
| 2 | Cloud.ru AI Factory AI Agents | autoclaw-copy | 2-3 нед | 🔜 Next |
| 3 | Model classification (tool-calling) | autoclaw-copy | 1 нед | |

### Phase 2: Security & Memory (недели 5-8)

| # | Задача | Источник | Оценка |
|---|--------|---------|--------|
| 4 | VM Sandbox isolation | open-cowork | 2-3 нед |
| 5 | Core/Experience memory separation | open-cowork | 2-3 нед |

### Phase 3: Orchestration & Productivity (недели 9-12)

| # | Задача | Источник | Оценка |
|---|--------|---------|--------|
| 6 | DAG multi-agent orchestration | eigent + autoclaw | 2-3 нед |
| 7 | Document generation (PPTX/DOCX/PDF/XLSX) | open-cowork | 1 нед |
| 8 | MCP OAuth for remote servers | open-cowork | 1 нед |

### Phase 4: Enterprise (недели 13-16)

| # | Задача | Источник | Оценка |
|---|--------|---------|--------|
| 9 | Paperclip CMC bridge | paperclip-fork | 2-3 нед |
| 10 | Identity broker (OAuth delegation) | custom | 1-2 нед |
| 11 | A2A messaging | custom | 1-2 нед |

### Phase 5: Scale (недели 17+)

| # | Задача | Источник | Оценка |
|---|--------|---------|--------|
| 12 | Enterprise SSO/RBAC/audit | custom (eigent reference) | 3-4 нед |
| 13 | Plan Correction Confidence | custom | 2-3 нед |
| 14 | Telemetry OTLP | custom (eigent has OTEL) | 1 нед |

---

## Итоговая формула

```
Universal AI Client =
    Hermes Desktop (UI + 16 gateways + 80+ skills + 11 i18n)
  + Hermes Agent (Python runtime + 30+ tools + MCP)
  + open-cowork modules (VM sandbox + memory + doc gen + MCP OAuth)
  + eigent patterns (DAG orchestration + multi-agent types)
  + autoclaw code (Cloud.ru FM ✅ + AI Agents + model classification)
  + Paperclip (CMC control plane + governance)
  + OpenSail ideas (fleet patterns, LiteLLM routing)
```

**4 проекта в основе, 2 донора модулей, 1 reference.**
**16 недель до feature-complete, 1-2 dev.**

---

## Риски и митигации

| Риск | Вероятность | Митигация |
|------|------------|-----------|
| Upstream HD breaking change | Средняя | Enterprise extension layer изолирует наш код |
| open-cowork лицензия | Низкая (MIT) | MIT позволяет портирование |
| eigent Apache 2.0 ограничения | Низкая | Берём паттерны, не код; Apache 2.0 разрешает |
| Cloud.ru API изменения | Низкая | OpenAI-совместимый, стандартный |
| Python/TS runtime конфликт (eigent DAG) | Средняя | Адаптируем DAG-паттерны под Hermes Agent, не портируем Python |
| Upstream добавит конкурирующие фичи | Средняя | Если upstream добавит — мы получим бесплатно через sync |

---

## Мониторинг экосистемы

Проекты для регулярного отслеживания (раз в 2 недели):

| Проект | ★ | Что смотреть |
|--------|---|-------------|
| **openwork** | 15,900 | Крупнейшее сообщество. Если добавят isolation + gateways — серьёзный конкурент |
| **eigent** | 12,900 | DAG evolution, enterprise features в OSS, new agent types |
| **open-cowork** | 871 | VM sandbox updates, memory improvements, new skills |
| **OpenSail** | 574 | Fleet patterns, K8s scaling, LiteLLM updates |
| **fathah/hermes-desktop** | upstream | Новые фичи, которые мы получаем бесплатно через sync |
| **OEvortex/HermesAgent** | upstream | Новые tools, gateways, MCP improvements |
