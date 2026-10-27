# Genyxo

Commercial AI platform built for a client, with a web interface for chat and AI-service integrations.

[Website](https://genyxo.com) · [Frontend](apps/web) · [Backend](apps/backend) · [Architecture](docs/architecture.md)

## Project at a glance

- Responsive web interface, chat interactions, localization and account screens.
- React, TypeScript and Next.js frontend, migrated from HTML, CSS and vanilla JavaScript.
- NestJS/TypeScript backend with MySQL, TypeORM, Redis and external AI APIs.
- Existing frontend controllers are retained for some complex interactions; the migration is not fully declarative React throughout.

## My contribution

Built the backend and most of the frontend, with occasional frontend help from another developer. My work included two frontend redesigns, mobile layouts, chat improvements, localization and API error handling.

The migration to React/Next.js and complex integrations involved AI-assisted development. My current career focus is junior frontend development with React, TypeScript and JavaScript.

## Where to start reviewing

| Area | Source |
| --- | --- |
| Routes and layouts | [`apps/web/app`](apps/web/app) |
| Page composition and UI | [`apps/web/src/fsd`](apps/web/src/fsd) |
| Feature behavior and API integration | [`features`](apps/web/src/fsd/features) |
| Frontend checks | [`apps/web/tests`](apps/web/tests) |
| API application | [`apps/backend`](apps/backend) |

## Local development

Requires **Node.js 22+**, npm, MySQL and Redis. Each application has its own dependencies and lockfile.

From the repository root:

```sh
npm ci
npm run deps:install
cp apps/backend/.env.example apps/backend/.env
cp apps/web/.env.example apps/web/.env.local
```

Configure the environment files and database/cache services, then start the backend and frontend in separate terminals:

```sh
npm run start:dev
```

```sh
npm run web:dev
```

Default local ports: backend **3000**, frontend **3001**. For Docker setup, proxy configuration and migration notes, see the [frontend guide](apps/web/README.md), [backend guide](apps/backend/README.md) and [deployment guide](DEPLOYMENT.md).

## Checks

```sh
npm run check
npm run test:tooling
npm test -- --runInBand
npm run test:web
npm run build
```

Frontend browser tests require Playwright Chromium. External OAuth, payments and AI generation require configured services and credentials; fixture-based tests do not verify those integrations. The frontend guide documents remaining demo behavior and migration limitations.

Existing `frontend:*` commands remain aliases for `web:*` commands.
