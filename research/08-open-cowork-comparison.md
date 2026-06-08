# Cowork Ecosystem vs Hermes Desktop — Full Comparison

> Date: 2026-06-08 (updated)
> Question: Add HD features to a Cowork variant, or Cowork features to HD?
> Additional requirement: Cloud.ru Foundation Models + Cloud.ru AI Factory AI Agents integration

## Hermes Desktop Baseline

**Tech stack:** Electron 39, React 19, TS 5.9, Tailwind 4, Python-based Hermes Agent (30+ tools, 80+ skills)
**Repo:** github.com/djd1m/hermes-desktop (fork of fathah/hermes-desktop)

| Capability | Status |
|------------|--------|
| Messaging gateways | **16** (Telegram, Discord, Slack, WhatsApp, Signal, Matrix, Email, SMS, etc.) |
| Multi-profile isolation | **Yes** — full env/config/skills isolation |
| Kanban/task management | **Yes** — full lifecycle + dispatch |
| Skills marketplace | **80+** bundled + marketplace |
| i18n | **11 locales** |
| 3D Office | **Yes** — Three.js virtual office |
| Browser automation | **Yes** — Playwright + Browserbase |
| Tests | **11,250 строк** |
| MCP | **Yes** — stdio, catalog, install UI |
| Cloud.ru FM | **Yes** — интегрировано (feature/01) |
| VM sandbox | No (planned) |
| Core/Experience memory | No (planned) |
| Document generation | No |

---

## Cowork Ecosystem — Сводная таблица

| Repo | ★ | Commits | Стек | Движок | Изоляция | Skills | MCP | Multi-LLM | Dispatch | i18n | Лицензия | Активность |
|------|---|---------|------|--------|----------|--------|-----|-----------|----------|------|----------|------------|
| **Hermes Desktop** | fork | — | Electron + Python | Hermes Agent | ❌ planned | **80+** | ✅ stdio | ✅ 20+ | **16 gateways** | **11** | MIT | Активный |
| **open-cowork** | 871 | 693 | Electron + TS | pi-harness | ✅ VM 3-tier | ✅ hot-reload | ✅ stdio/SSE/HTTP | ✅ Qwen/DS/Ollama+ | ✅ Feishu/Lark | 2 | MIT | Коммит сегодня, v3.3.1 |
| **eigent** | **12,900** | — | Python CAMEL-AI + Electron | Multi-agent DAG (8 типов) | ⚠️ процесс | ✅ 36 toolkits | ✅ 200+ MCP tools | ✅ 7 cloud + 4 local | ❌ (0 inbound, 7 outbound tools) | 11 front / 2 back | Apache 2.0 | Очень активный |
| **openwork** | **15,900** | **2,945** | Tauri + Node sidecar | OpenCode | ⚠️ минимальная | OpenCode skills | ⚠️ shallow | ⚠️ Claude primary | SSE streaming | **10** (вкл. RU) | MIT | Очень активный |
| **kuse_cowork** | 729 | **29** | Tauri + Rust + Node | Claude Agent SDK | ✅ Docker | ✅ YAML+Docker | ✅ | ✅ broad BYOK | ❌ | 0 | MIT | ⚠️ Заброшен (v0.0.2) |
| **zosma-cowork** | 67 | 448 | Tauri + Rust relay + Node | pi-harness | ⚠️ процесс | pi-расширения | IPC-based | ✅ BYOK | ❌ | **9** (вкл. RU) | MIT | 49 релизов, дисциплина |
| **OpenSail** | 574 | **1,100+** | Tauri + K8s backend | Свой оркестратор | **✅ K8s 3-tier** | Apps system | **✅ нативно + коннекторы** | **✅ LiteLLM (лучший)** | **✅ 6 каналов + fleet** | 0 | Apache 2.0 | Активный, Beta |

---

## Детальные профили

### open-cowork (871★) — лучший эталон для портирования модулей
Самый верный оригиналу клон в TypeScript: VM-песочница (Lima/WSL2/Docker, 3-tier), skills с hot-reload, Core/Experience memory separation, doc generation (PPTX/DOCX/PDF/XLSX). **Лучший источник для портирования VM sandbox и memory.**

### eigent (12,900★) — самый популярный, multi-agent workforce
CAMEL-AI framework, multi-agent DAG с 8 типами агентов (Developer, Browser, Document, Multi-Modal, MCP, Social Media, Question Confirmation, Task Summary). 36 built-in toolkits. Enterprise features (SSO/RBAC/audit) **заявлены в маркетинге, но в OSS-коде не видны** — middleware-директория пустая. i18n: 11 языков во фронте (вкл. русский), но 2 в бэкенде. **0 inbound messaging gateways** (7 outbound toolkits — Slack/WhatsApp/Twitter/LinkedIn/Reddit/Lark/Gmail — это action tools агента, не приём входящих). Python runtime, без VM-изоляции. **Источник для DAG orchestration. Enterprise features — проверять осторожно.**

### openwork (15,900★) — крупнейшее сообщество
Самый большой по сообществу (15.9K★, 2,945 commits). Tauri + OpenCode engine. 10 языков включая **русский**. Есть enterprise plan и cloud offering. Но слабая изоляция (нет sandbox/Docker), неясный multi-LLM story, shallow MCP. **Лидер по community, но слабый по фичам.**

### kuse_cowork (729★) — красивый дизайн, но заброшен
Отличная архитектура на бумаге: Docker isolation, broad LLM support (14+ провайдеров), MCP, YAML skills. Но **29 коммитов** и v0.0.2 — проект видимо заброшен. **Не для production.**

### zosma-cowork (67★) — лучшая инженерная дисциплина
Маленький, но аккуратный: 49 релизов, Vitest + Testing Library, Biome linter, Clippy. 9 языков (вкл. RU). Tauri + Rust relay + Node sidecar — архитектурное зеркало PoC. **Хороший reference, но слишком маленький.**

### OpenSail (574★) — единственная fleet-платформа
Единственная настоящая fleet-платформа: multi-agent (frontend/backend/test/ops/review agents), K8s 3-tier изоляция (BtrFS snapshots), LiteLLM routing, 6 messaging gateways (Slack, Telegram, Discord, WhatsApp, Signal, CLI), approval workflows, scheduled jobs. Но требует K8s инфраструктуру. **Другая категория — платформа, не десктоп.**

---

## Полная Feature Matrix

| Feature | HD | open-cowork | eigent | openwork | kuse | zosma | OpenSail |
|---------|----|-----------|---------|---------|----|-------|---------|
| Cloud.ru FM | **✅** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Cloud.ru AI Agents | planned | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Messaging gateways | **16** | 2 | partial | 0 | 0 | 0 | **6** |
| Multi-profile | **✅** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Kanban/tasks | **✅** | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Skills | **80+** | ✅ | ✅ | OpenCode | ✅ | pi | Apps |
| i18n | **11** | 2 | 1 | **10** | 0 | **9** | 0 |
| 3D Office | **✅** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Tests | **11,250** | n/v | n/v | ✅ E2E | n/v | ✅ Vitest | n/v |
| VM sandbox | ❌ | **✅ 3-tier** | ❌ | ❌ | ✅ Docker | ❌ | **✅ K8s** |
| Core/Exp memory | ❌ | **✅** | ❌ | ❌ | ❌ | ❌ | ❌ |
| Doc gen (PPTX/DOCX) | ❌ | **✅** | ✅ | ❌ | ✅ | ❌ | n/v |
| DAG multi-agent | ❌ | ❌ | **✅** | ❌ | ❌ | ❌ | **✅** |
| Enterprise SSO/RBAC | ❌ | ❌ | ⚠️ маркетинг (не в OSS) | ✅ plan | ❌ | ❌ | n/v |
| MCP quality | ✅ | **✅ full** | ✅ 200+ | ⚠️ shallow | ✅ | IPC | **✅ native** |
| Multi-LLM quality | ✅ 20+ | ✅ | ✅ agnostic | ⚠️ Claude | **✅ 14+** | ✅ BYOK | **✅ LiteLLM** |
| Browser automation | **✅** Playwright | ⚠️ GUI/MCP | ✅ Browser agent | ❌ | ❌ | ❌ | ❌ |

---

## Оценка: что проще?

### Вариант A: Взять Cowork-вариант → добавить HD-фичи

| Взять → | ★ | До HD-паритета | Главные блокеры | Cloud.ru |
|---------|---|---------------|-----------------|----------|
| **open-cowork** | 871 | **4-6 мес**, 2-3 dev | Другой runtime (TS vs Python), 16 gateways, 80+ skills, i18n +9 локалей, kanban, 3D Office | +1 день |
| **eigent** | 12,900 | **3-5 мес**, 2-3 dev | Python CAMEL-AI, нет gateway-архитектуры (3-6 нед только на gateways), kanban, multi-profile, 3D Office | +1 день (OpenAI-compat) |
| **openwork** | 15,900 | **4-5 мес**, 2-3 dev | Tauri ≠ Electron, нет gateways/kanban/profiles, OpenCode ≠ Hermes Agent | +1 день |
| **kuse_cowork** | 729 | **6+ мес** | Заброшен (29 commits), v0.0.x, Tauri | +1 день |
| **zosma-cowork** | 67 | **6+ мес** | Маленький, нет sandbox/dispatch/skills | +1 день |
| **OpenSail** | 574 | **3-4 мес** | Требует K8s, платформа ≠ десктоп, другая архитектура | +1 день |

### Вариант B: Взять HD → добавить Cowork-фичи

| Фича | Источник | Работа | Приоритет |
|------|---------|--------|-----------|
| Cloud.ru Foundation Models | autoclaw-copy | **✅ Готово** | Критический |
| Cloud.ru AI Factory AI Agents | autoclaw-copy | ~2-3 нед | **Критический** |
| VM sandbox isolation | open-cowork | ~2-3 нед | Высокий |
| Core/Experience memory | open-cowork | ~2-3 нед | Высокий |
| DAG multi-agent orchestration | eigent + autoclaw | ~2-3 нед | Высокий |
| Document generation | open-cowork | ~1 нед | Средний |
| MCP OAuth | open-cowork | ~1 нед | Средний |
| Enterprise SSO/RBAC/audit | eigent (проверить OSS-код!) | ~3-4 нед | Средний (B2B) |

**Суммарно: 8-12 недель, 1-2 dev**

---

## Cloud.ru Integration

| Компонент | HD | open-cowork | eigent | openwork | kuse | zosma | OpenSail |
|-----------|----|-----------|---------|---------|------|-------|---------|
| **Foundation Models** | **✅ Готово** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **AI Factory AI Agents** | planned | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

**HD — единственный проект с Cloud.ru FM.** Ни один Cowork-вариант не имеет интеграции с Cloud.ru. AI Factory AI Agents (managed GPU compute, scaling, lifecycle) — естественное расширение HD enterprise layer через `delegate-to-cloud-agent.ts` (reference в autoclaw-copy).

---

## Итоговый вердикт

```
HD + портирование фич   =  8-12 недель, 1-2 dev
Cowork → HD паритет      =  3-6 месяцев, 2-3 dev
                            ─────────────────────
Разница:                    ~4-5x в пользу HD
```

### Почему HD

1. **Cloud.ru FM уже есть** — ни один конкурент
2. **16 gateways** — ближайший конкурент (OpenSail) имеет 6
3. **80+ skills** — портировать их куда-то = месяцы
4. **11 i18n** — openwork имеет 10 (вкл. RU), но без gateways/kanban/profiles
5. **11,250 строк тестов** — зрелая кодовая база
6. **Enterprise extension layer** — модульное добавление фич без upstream-конфликтов
7. **Upstream sync** работает — `./scripts/sync-upstream.sh`

### Приоритет портирования в HD

1. ✅ Cloud.ru Foundation Models — **Готово** (feature/01)
2. 🔜 Cloud.ru AI Factory AI Agents — ~2-3 нед
3. 🔜 VM sandbox isolation (из open-cowork) — ~2-3 нед
4. 🔜 Core/Experience memory (из open-cowork) — ~2-3 нед
5. 🔜 DAG orchestration (из eigent + autoclaw) — ~2-3 нед
6. Document generation (из open-cowork) — ~1 нед
7. Enterprise SSO/RBAC (из eigent) — ~3-4 нед

### Что стоит мониторить

- **openwork** (15.9K★) — крупнейшее сообщество, растёт быстро. Если добавят isolation + gateways, станет серьёзным конкурентом.
- **OpenSail** — единственная fleet-платформа. Идеи fleet/approval/budget можно заимствовать для Paperclip CMC bridge.
- **eigent** — DAG multi-agent architecture и enterprise features (SSO/RBAC) — хороший reference.
