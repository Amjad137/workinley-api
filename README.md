# NestJS BoilerPlate API

<div align="center">

![Node.js](https://img.shields.io/badge/Node.js-22.x-339933?style=for-the-badge&logo=node.js&logoColor=white)
![NestJS](https://img.shields.io/badge/NestJS-11.x-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-7.x-2D3748?style=for-the-badge&logo=prisma&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

**A modern, production-grade RESTful API engineered for high-throughput content management, granular RBAC, and cloud-native file storage.**

[Architecture](#-system-architecture) • [Key Engineering Highlights](#-key-engineering-highlights) • [API Specification](#-api-specification) • [Quick Start](#-getting-started) • [Database & Migrations](#-database--migrations) • [Docker Deployment](#-docker--production-deployment)

</div>

---

## 📌 Executive Summary

**NestJS BoilerPlate API** is a modular enterprise backend built on top of **NestJS 11** and **PostgreSQL 16**. Designed with clean architectural boundaries and strict type-safety, it demonstrates senior engineering patterns including:
- **Prisma 7 with Connection Pooling via `@prisma/adapter-pg`** and single-roundtrip transactional pagination.
- **Modern Session-Based Authentication** powered by **Better Auth** with cookie caching and server-governed RBAC.
- **Direct-to-Cloud S3 Storage Architecture** using presigned URLs to offload high-bandwidth I/O from API compute.
- **Defensive Engineering**: Fail-fast startup environment validation, global standardized response envelopes, and structured JSON observability.

---

## 🏗 System Architecture

The codebase follows the **Layered Clean Architecture** pattern, strictly decoupling transport, business logic, and database persistence.

```mermaid
flowchart TD
    Client([HTTP / Browser Client]) -->|Request| Middleware[Middlewares: Helmet / CORS / Pino Logger / URL Versioning]
    Middleware --> Guard[AuthGuard & RolesGuard - Better Auth RBAC]
    Guard --> Controller[Controller Layer - DTO Validation via class-validator]
    Controller --> Service[Service Layer - Business Logic]
    Service --> Repository[Repository Layer - Query Optimization & Single-Roundtrip Batching]
    Service --> S3Service[AWS S3 Service - Presigned Upload / Download URLs]
    Repository --> Prisma[Prisma 7 + PG Connection Pool]
    Prisma --> Postgres[(PostgreSQL 16)]
    S3Service -.->|Direct Upload/Download| S3Bucket[(AWS S3 Storage)]
    Controller --> Interceptor[Response Transform Interceptor]
    Interceptor -->|Unified JSON Envelope| Client
```

### Module Structure

```
nestjs-boilerplate/
├── src/
│   ├── app/                      # Application orchestration
│   │   ├── dtos/                 # AppEnvDto (Fail-fast startup environment validator)
│   │   ├── filters/              # AppGlobalFilter (Standardized error envelope)
│   │   ├── middlewares/          # Security, body parser, and URL versioning middlewares
│   │   └── app.module.ts         # Root dependency injection container
│   ├── auth/                     # Better Auth core configuration & schema hooks
│   ├── common/                   # Shared cross-cutting concerns
│   │   ├── decorators/           # @Roles, @AllowAnonymous, custom parameter decorators
│   │   ├── request/              # Typed request interfaces (e.g. AppVersionRequest)
│   │   ├── response/             # Response envelope interceptor & pagination contracts
│   │   └── common.module.ts      # Global Pino logger, CacheManager, Terminus health
│   ├── configs/                  # Type-safe registerAs namespaces (app, aws, middleware)
│   ├── database/                 # Persistence layer
│   │   ├── generated/            # Type-safe Prisma Client artifact
│   │   ├── interfaces/           # IPaginationResult, IPaginationMeta
│   │   ├── prisma.client.ts      # Singleton Prisma client over native pg connection pool
│   │   ├── prisma.service.ts     # Connection lifecycle hooks ($connect, $disconnect)
│   │   ├── schema.prisma         # Database schema (User, Session, Account, Verification)
│   │   └── seed.ts               # Database seeder with sample data
│   ├── modules/                  # Feature domain modules
│   │   ├── health/               # Terminus health indicators (DB ping)
│   │   ├── s3/                   # AWS S3 presigned URL generator & object deletion
│   │   └── user/                 # User domain (Controller, Service, Repository)
│   ├── router/                   # Centralized routing definitions
│   ├── main.ts                   # Fast SWC bootstrap with fail-fast env validation
│   └── swagger.ts                # OpenAPI 3.0 / Swagger UI documentation builder
├── Dockerfile                    # Multi-stage production container (node:22-alpine, non-root user)
├── prisma.config.ts              # Prisma CLI configuration
└── tsconfig.json                 # Path aliases (@app, @auth, @common, @configs, @database, etc.)
```

---

## ⚡ Key Engineering Highlights

### 1. High-Performance Database Access with Prisma 7 & pg-pool
Instead of unpooled raw queries or separate `Promise.all` count queries that introduce race conditions and multiple round-trips, pagination uses a **single `$transaction` round-trip** inside the repository layer:

```typescript
// src/modules/user/repository/user.repository.ts
async findManyWithCount(args: Prisma.UserFindManyArgs, where?: Prisma.UserWhereInput) {
    return this.prisma.db.$transaction([
        this.prisma.db.user.findMany(args),
        this.prisma.db.user.count({ where }),
    ]);
}
```
- **Single Connection Round-Trip:** Batches query execution into one database interaction.
- **Consistent Snapshot:** Both queries read against the same transaction state.

### 2. Modern Session-Based Auth (Better Auth) with In-Memory Caching
Uses **Better Auth** alongside `@thallesp/nestjs-better-auth`:
- **Fast Session Verification:** Employs `cookieCache` (5-minute TTL) to avoid hitting PostgreSQL on every single authenticated request.
- **Server-Owned Security Fields:** Critical fields such as `role`, `isActive`, and `lastLoginAt` are configured as server-owned (`input: false`) in [better-auth.config.ts](file:///d:/Amjath/My%20Projects/WEB%20Projects/NestJS BoilerPlate/workinley-be/src/auth/better-auth.config.ts), preventing privilege escalation.
- **Cross-Origin Security:** Enforces explicit `trustedOrigins` and CORS credentials validation.

### 3. Direct-to-Cloud S3 Storage via Presigned URLs
To eliminate API server bottlenecking from large multipart file uploads, the architecture utilizes **AWS S3 Presigned URLs** via the AWS SDK v3:
- Clients request temporary, signed S3 upload URLs with short TTLs.
- File bytes stream directly from the browser/client to S3, keeping API CPU and memory usage lightweight.
- Provides segregated **Public** (profile pictures) and **Protected** (confidential attachments) bucket access patterns.

### 4. Zero-Leak Standardized Response & Error Envelopes
All HTTP responses pass through a global [ResponseInterceptor](file:///d:/Amjath/My%20Projects/WEB%20Projects/NestJS BoilerPlate/workinley-be/src/common/response/interceptors/response.interceptor.ts) and [AppGlobalFilter](file:///d:/Amjath/My%20Projects/WEB%20Projects/NestJS BoilerPlate/workinley-be/src/app/filters/app.global.filter.ts):

```json
// Success Response (Paginated)
{
  "error": false,
  "message": "Users retrieved successfully",
  "data": [ ... ],
  "pagination": {
    "total": 100,
    "page": 1,
    "limit": 20,
    "totalPages": 5,
    "hasNext": true,
    "hasPrev": false
  }
}
```

```json
// Error Response
{
  "error": true,
  "message": "User with ID 'usr_123' not found",
  "data": {
    "statusCode": 404,
    "timestamp": "2026-09-09T14:30:00.000Z"
  }
}
```

### 5. Fail-Fast Startup Validation
Before NestJS dependencies instantiate, [main.ts](file:///d:/Amjath/My%20Projects/WEB%20Projects/NestJS BoilerPlate/workinley-be/src/main.ts) executes class-validator validation against `process.env` through `AppEnvDto`. If required environment variables (e.g. `DATABASE_URL`, `BETTER_AUTH_SECRET`, `APP_URL`) are malformed or missing, the process logs clean errors and terminates immediately.

---

## 📋 API Specification

Comprehensive Swagger / OpenAPI 3.0 documentation is auto-generated and served at:
**`http://localhost:8000/api/docs`**

### Key Endpoints

| Method | Endpoint | Description | Auth / Access |
|---|---|---|---|
| `POST` | `/api/auth/*` | Better Auth handlers (sign-up, sign-in, sign-out, session) | Public |
| `GET` | `/api/v1/users/me` | Fetch authenticated user profile | Bearer / Session |
| `PATCH` | `/api/v1/users/me` | Update authenticated user profile | Bearer / Session |
| `GET` | `/api/v1/users/admin/all` | List users with search, sort & pagination | `ADMIN` only |
| `GET` | `/api/v1/users/admin/:id` | Fetch specific user by ID | `ADMIN` only |
| `PATCH` | `/api/v1/users/admin/:id` | Admin update user data / role | `ADMIN` only |
| `DELETE`| `/api/v1/users/admin/:id` | Soft-delete / deactivate user | `ADMIN` only |
| `POST` | `/api/v1/s3/public-upload` | Generate presigned URLs for public assets | Bearer / Session |
| `POST` | `/api/v1/s3/protected-upload` | Generate presigned URLs for private files | Bearer / Session |
| `GET` | `/api/v1/s3/file-url/:key` | Get authorized S3 read URL | Bearer / Session |
| `DELETE`| `/api/v1/s3/files` | Batch delete files from S3 | Bearer / Session |
| `GET` | `/api/v1/health` | Terminus liveness check (PostgreSQL health) | Public |

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: `>= 20.11.0` (LTS recommended)
- **Package Manager**: **Yarn** (`>= 1.22.22` or Yarn Berry)
- **Database**: **PostgreSQL 14+**
- **AWS S3 Bucket** (for file storage features)

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/your-username/workinley-be.git
cd workinley-be
yarn install
```

### 2. Environment Setup

Copy the sample environment file to `.env.local`:

```bash
cp .env.example .env.local
```

Configure your local environment variables in `.env.local`:

```env
# Application
NODE_ENV=development
APP_TZ=UTC
APP_HOST=localhost
APP_PORT=8000
APP_GLOBAL_PREFIX=api
APP_URL=http://localhost:8000
APP_URL_VERSION_ENABLE=true
APP_URL_VERSION_PREFIX=v
APP_URL_VERSION=1

# Database (URL-encode special characters like '@' -> '%40')
DATABASE_URL="postgresql://postgres:password@localhost:5432/workinley_dev"

# Authentication (Better Auth)
BETTER_AUTH_SECRET=your-64-character-random-hex-secret
TRUSTED_ORIGINS=http://localhost:3000,http://localhost:8000

# CORS
MIDDLEWARE_CORS_ORIGIN=http://localhost:3000

# AWS S3
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
S3_BUCKET_NAME=your-s3-bucket
```

### 3. Database Migration & Seeding

```bash
# Run migrations to bring PostgreSQL up to date
yarn db:migrate

# Seed database with sample users and credentials
yarn db:seed
```

### 4. Start Development Server

```bash
# Copies .env.local -> .env and starts the SWC watch server
yarn start:local
```

Access the application:
- **API Base**: `http://localhost:8000/api/v1`
- **Swagger Documentation**: `http://localhost:8000/api/docs`

---

## 🗄 Database & Migrations

Database operations are managed cleanly via Prisma CLI:

```bash
yarn db:generate     # Regenerates Prisma Client (@generated/prisma)
yarn db:migrate      # Applies migrations in development
yarn db:migrate:prod # Runs pending migrations in production (prisma migrate deploy)
yarn db:push         # Push schema state without generating a migration file
yarn db:studio       # Launch Prisma Studio web GUI to browse records
yarn db:seed         # Run database seeding script
yarn db:reset        # Drops database, re-runs migrations, and seeds
```

---

## 🛠 Available Scripts

| Script | Purpose |
|---|---|
| `yarn start:local` | Launches dev server with hot reload via SWC (loads `.env.local`) |
| `yarn start:qa` | Launches dev server with `.env.qa` |
| `yarn build` | Compiles production bundle to `/dist` via SWC compiler |
| `yarn start:prod` | Runs production build with `.env.production` |
| `yarn test` | Executes Jest test suites |
| `yarn lint` | Runs ESLint 9 checks across codebase |
| `yarn lint:fix` | Automatically resolves fixable ESLint errors |
| `yarn format` | Formats all TypeScript, JSON, and YAML files with Prettier |
| `yarn format:check` | Verifies formatting without modifying files |
| `yarn spell` | CSpell dictionary inspection on codebase |
| `yarn deadcode` | Detects unused exports using `ts-prune` |
| `yarn clean` | Cleans `dist`, node cache, and builds |

---

## 🐳 Docker & Production Deployment

NestJS BoilerPlate is packaged with a security-hardened, multi-stage [Dockerfile](file:///d:/Amjath/My%20Projects/WEB%20Projects/NestJS BoilerPlate/workinley-be/Dockerfile):
- **Base image**: Minimalist `node:22-alpine` for lightweight footprint.
- **Dependency isolation**: Separates build tooling (`@swc`, `typescript`) from runtime dependencies (`npm prune --production`).
- **Security**: Runs under an unprivileged user (`nestjs:nodejs`, UID 1001) rather than root.

### Build and Run with Docker

```bash
# Build the production image
docker build -t workinley-api:latest .

# Run container
docker run -d \
  --name workinley-api \
  -p 8080:8080 \
  --env-file .env.production \
  workinley-api:latest
```

---

## 🛡 Security & Code Quality Standards

- **Conventional Commits**: Enforced via **Husky** and **Commitlint** (`@commitlint/config-conventional`).
- **Type Safety**: Strictly typed interfaces with zero tolerance for `any` types.
- **Sanitization & Validation**: All HTTP payloads are parsed through `ValidationPipe` with `{ whitelist: true, forbidNonWhitelisted: true, transform: true }`.
- **Security Headers & Rate Limiting**: Standardized with Helmet, CORS origin whitelisting, and `@nestjs/throttler` (10 req / 500ms sliding window).

---

## 👤 Author

**Amjath**
- Portfolio / GitHub: [@Amjath](https://github.com/Amjath)
- Role: Full Stack / Backend Software Engineer

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
