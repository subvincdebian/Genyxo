# Genyxo backend

NestJS API на Fastify, Socket.IO, TypeORM/MySQL та Redis/BullMQ.
Усі команди нижче виконуються з `apps/backend`.

```sh
npm ci
cp .env.example .env
npm run start:dev
```

Для локального запуску потрібні MySQL і Redis з адресами та обліковими
даними з `.env`. Backend слухає порт 3000, web — 3001.

```sh
npm run typecheck
npm run lint
npm test -- --runInBand
npm run build
npm run start:prod
```

- `src/` — бізнес-модулі NestJS, спільна інфраструктура та bootstrap.
- `src/database/` — TypeORM data source, міграції та runner з advisory lock.
- `src/queues/` — черги та processors BullMQ.
- `test/` — інтеграційні e2e-тести; потребують налаштованих MySQL/Redis.
- `scripts/` — локальний migration runner і генератор OpenAPI.
- `dist/` — результат збірки, не частина вихідного коду.

`npm run openapi:generate` записує специфікацію у `dist/openapi.json`.
Синхронізація специфікації та TypeScript-типів web виконується з кореня
репозиторію командою `npm run contracts:sync`.

Команди міграцій виконуються з цього каталогу, тому TypeORM завантажує
локальний `.env`. `npm run migration:generate -- src/database/migrations/Name`
створює міграцію; `npm run db:migrate` застосовує її через runner.
Production image зберігає внутрішні шляхи `dist/main.js` та
`dist/database/runner.js`.

Правила відповідальності та залежностей: [архітектура](../../docs/architecture.md).
