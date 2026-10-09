# Архітектура репозиторію

```text
apps/
  backend/       NestJS API, бізнес-модулі, БД, черги, backend-тести
  web/           Next.js App Router, FSD, assets, browser-тести
docs/            Спільні архітектурні рішення
scripts/         Оркестрація стека та синхронізація контрактів
nginx/           Спільний reverse proxy
k8s/             Kubernetes workloads та політики
helm/            Helm chart платформи
gitops/          Argo CD applications
.github/         CI, security workflows, Dependabot
.husky/          Git hooks репозиторію
```

## Відповідальність пакетів

Кореневий `package.json` містить команди оркестрації та інструменти
репозиторію. Runtime-залежності належать відповідному застосунку.
Кожен застосунок володіє своїми `package.json`, lockfile, TypeScript/ESLint
конфігурацією, `.env.example`, Dockerfiles та тестами.

Це монорепозиторій із незалежними npm-пакетами. Спільного npm workspace
та hoisting немає: збережено перевірені lockfiles і різні версії TypeScript
backend/web. Docker та CI встановлюють пакети окремо через `npm ci`.
Для нового сервісу використовують той самий принцип володіння.

## Залежності застосунків

Backend і web не імпортують вихідний код один одного. Web спілкується
з backend через HTTP/SSE і Socket.IO. Серверний `BACKEND_URL` та публічний
`NEXT_PUBLIC_SOCKET_URL` залишаються відповідальністю web-конфігурації.

NestJS модулі зберігають існуючу предметну структуру: controllers — HTTP,
services — бізнес-сценарії, DTO — валідація, entities/data source — persistence.
`common/` містить наявні спільні backend-компоненти. Новий спільний код
виносять лише після появи реальних користувачів і визначення його контракту.

Web зберігає FSD: `app → pages → widgets → features → entities → shared`.
Alias `@/` веде до `src/fsd/`. Наявний `check-architecture.mjs` перевіряє
напрям імпортів під час web lint. Межі предметних областей не змінені
самим перенесенням каталогів.

## API-контракт

Backend генерує `apps/backend/dist/openapi.json`; він не записує файли web.
Коренева команда `npm run contracts:sync` генерує специфікацію, TypeScript
schema та копію JSON у `apps/web/types/`. Згенеровані web-файли комітять
разом зі зміною API. Перевірка типів web виявляє несумісне використання
контракту; сумісність зовнішніх API-клієнтів потребує окремої оцінки.

## Конфігурація та deployment

Backend secrets зберігають у `apps/backend/.env`, локальні web-параметри —
у `apps/web/.env.local`. Обидва файли ігноруються Git та Docker contexts.
Production використовує secret management обраного середовища.

Compose залишається в корені та будує незалежні contexts застосунків.
Для interpolation параметрів MySQL/Redis потрібно передавати
`--env-file apps/backend/.env`; launcher scripts роблять це автоматично.
Service names, image names, мережі та шляхи всередині контейнерів збережено,
тому Helm/Kubernetes migration commands не змінюються.

З кореня виконують `npm run check`, `npm test`, `npm run build`.
Browser-тести: `npm run test:web` після web build та встановлення Chromium.
Backend e2e: `npm run test:e2e` з доступними MySQL/Redis. Звичайний unit-test
запуск не доводить працездатність production deployment чи зовнішніх API.
