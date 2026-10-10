# Genyxo 🚀

## Repository setup

Application code lives in [`apps/backend`](apps/backend/README.md) and
[`apps/web`](apps/web/README.md). The root package coordinates commands and
Git tooling; each application owns its dependencies and lockfile.
See [architecture and ownership rules](docs/architecture.md).

Run these commands from the repository root (Node.js 22+):

```sh
npm ci
npm run deps:install
cp apps/backend/.env.example apps/backend/.env
cp apps/web/.env.example apps/web/.env.local
npm run start:dev
# In a second terminal:
npm run web:dev
```

Configure MySQL and Redis before starting the backend. To start the Docker
development stack, use `./scripts/dev.sh up` or `./scripts/dev.ps1 -Action up`.

```sh
npm run check
npm run check:compose
npm run test:tooling
npm test -- --runInBand
npm run build
npm run contracts:sync
```

Existing `frontend:*` commands remain aliases for `web:*` commands.
Deployment commands are documented in [DEPLOYMENT.md](DEPLOYMENT.md).

`check` also checks repository ownership, exact path casing and package/lockfile
consistency. Infrastructure tests use Helm 3.19 and Bash; PowerShell launcher
tests run when `pwsh` is available. Compose validation uses public example
configuration and does not require a running Docker daemon.

The repository does not publish npm packages or run semantic-release. Releases
use the tested commit SHA for container images; deployment requirements and
backup procedures are documented in [DEPLOYMENT.md](DEPLOYMENT.md).

<p align="center">
  <img src="https://img.shields.io/badge/Status-Production-success?style=for-the-badge" alt="Status" />
  <img src="https://img.shields.io/badge/Frontend-Next.js_/_React_/_Tailwind-black?style=for-the-badge" alt="Frontend" />
  <img src="https://img.shields.io/badge/Backend-NestJS-E0234E?style=for-the-badge&logo=nestjs" alt="Backend" />
</p>

**Genyxo** is a commercial web platform designed to provide seamless, centralized access to various advanced AI models. The platform combines a lightweight, high-performance frontend with a robust, scalable, enterprise-grade backend architecture.

🌐 **Live Demo:** [genyxo.com](https://genyxo.com)

---

## 🌟 Key Features

- **Multi-Model AI Integration:** Unified interface to interact with diverse AI APIs efficiently.
- **High-Performance Caching:** Integrated **Redis** layer for session management and quick API response caching to minimize latency.
- **Robust Database Management:** Structured and safe data persistence handling user records, history, and analytics using **MySQL** and **TypeORM**.
- **Frontend:** Next.js App Router and React with Tailwind CSS, organized by FSD layers. See [frontend setup and migration notes](apps/web/README.md).
- **Secure Architecture:** Implemented secure REST API endpoints, input validation, and protected environment configuration.

---

## 🛠️ Tech Stack

### Frontend

- **Next.js & React:** App Router pages and React components with FSD layers.
- **Tailwind CSS:** Utilities alongside the original responsive styles to preserve the design.
- **TypeScript:** Shared state, APIs and React components; compatibility controllers retain existing complex interactions.

### Backend

- **NestJS:** Node.js framework leveraging TypeScript for building efficient and maintainable server-side applications.
- **TypeORM:** Object-Relational Mapper used for secure, declarative database queries and schema migrations.

### Infrastructure & Databases

- **MySQL:** Relational database management system for persistent storage.
- **Redis:** In-memory data structure store used as a high-speed database cache and session store.
