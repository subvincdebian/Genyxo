# Genyxo 🚀

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
- **Frontend:** Next.js App Router and React with Tailwind CSS, organized by FSD layers. See [frontend setup and migration notes](frontend/README.md).
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
