# Workinley API

<div align="center">

![Node.js](https://img.shields.io/badge/Node.js-22.x-339933?style=for-the-badge&logo=node.js&logoColor=white)
![NestJS](https://img.shields.io/badge/NestJS-11.x-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-7.x-2D3748?style=for-the-badge&logo=prisma&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

**A high-performance, enterprise-grade RESTful API engineered for weekly engineering reporting, velocity analytics, project tracking, and granular role-based access control.**

[Architecture](#-system-architecture) • [Engineering Highlights](#-key-engineering-highlights) • [Domain Features](#-domain-features) • [API Specification](#-api-specification) • [Quick Start & Seed](#-getting-started) • [Database & Migrations](#-database--migrations) • [Docker Deployment](#-docker--production-deployment)

</div>

---

## 📌 Executive Summary

**Workinley API** is the backend engine powering the Workinley SaaS platform—an enterprise team management system designed for engineering leaders, project managers, and distributed teams. Built with **NestJS 11**, **TypeScript 5.8**, and **PostgreSQL 16**, the system adheres to strict Clean Architecture boundaries and high-throughput production practices:

- **Prisma 7 with Connection Pooling (`@prisma/adapter-pg`)**: Single-roundtrip transactional pagination and optimized snapshot queries.
- **Session-Based Authentication with Better Auth**: High-speed cookie caching (5-minute TTL), server-owned security fields, and database lifecycle hooks.
- **Direct-to-Cloud S3 Storage**: Presigned upload and download URLs via AWS SDK v3 to offload binary file I/O from API compute.
- **Defensive Engineering**: Pre-bootstrap fail-fast environment validation, standardized response envelopes, and structured JSON observability with Pino.
- **Comprehensive Domain Engine**: Complete workflows for weekly engineering reports, approval workflows, velocity analytics, team invitations, and project management.

---

## 🏗 System Architecture

The codebase follows **Layered Clean Architecture**, decoupling transport, authentication guards, domain business logic, and database persistence.

```mermaid
flowchart TD
    Client([HTTP / Browser Client]) -->|Request| GlobalCORS[Global CORS & Security Layer]
    GlobalCORS --> BetterAuthNode[Better Auth Engine /api/auth/*]
    GlobalCORS --> Middlewares[Middlewares: Helmet / BodyParser / Versioning / RequestID]
    Middlewares --> AuthGuard[Global AuthGuard & RolesGuard - Better Auth RBAC]
    AuthGuard --> Controllers[Controller Layer - DTO Validation via class-validator]
    Controllers --> Services[Domain Service Layer - Business Logic]
    Services --> Repositories[Repository Layer - Single-Roundtrip $transaction]
    Services --> S3Service[AWS S3 Service - Presigned URLs]
    Repositories --> PrismaClient[Prisma 7 + Native PG Connection Pool]
    PrismaClient --> PostgreSQL[(PostgreSQL 16 Database)]
    S3Service -.->|Direct Upload / Download| S3Bucket[(AWS S3 Storage)]
    Controllers --> Interceptor[Response Transform Interceptor]
    Interceptor -->|Standardized JSON Envelope| Client
```

### Modular Repository Structure

```
workinley-api/
├── src/
│   ├── app/                      # Application lifecycle & orchestration
│   │   ├── dtos/                 # AppEnvDto (Fail-fast startup environment validator)
│   │   ├── filters/              # AppGlobalFilter (Standardized error envelope)
│   │   ├── middlewares/          # Body parser, Helmet security, Request ID, Versioning
│   │   ├── app.middleware.module.ts # NestJS middleware composition module
│   │   └── app.module.ts         # Root dependency injection container
│   ├── auth/                     # Better Auth configuration, database hooks, & plugins
│   ├── common/                   # Shared cross-cutting concerns
│   │   ├── decorators/           # @Roles, @AllowAnonymous, parameter decorators
│   │   ├── request/              # Typed request interfaces (AppVersionRequest, etc.)
│   │   ├── response/             # Response envelope interceptor & pagination contracts
│   │   └── common.module.ts      # Global Pino logger, CacheManager, Terminus
│   ├── configs/                  # Type-safe registerAs namespaces (app, aws, middleware)
│   ├── database/                 # Persistence layer
│   │   ├── generated/            # Generated Prisma Client artifact (CJS output)
│   │   ├── interfaces/           # IPaginationResult, IPaginationMeta, sort enums
│   │   ├── prisma.client.ts      # Singleton Prisma Client with pg connection pool
│   │   ├── prisma.service.ts     # Lifecycle connection manager ($connect, $disconnect)
│   │   ├── schema.prisma         # Database models (User, Report, Task, Project, etc.)
│   │   └── seed.ts               # Complete database seeder with realistic test data
│   ├── modules/                  # Feature domain modules
│   │   ├── analytics/            # Engineering analytics, velocity, hours & compliance
│   │   ├── health/               # Terminus health checks (PostgreSQL ping)
│   │   ├── invitations/          # Team invitations, code validation, revoke guards
│   │   ├── projects/             # Projects registry, color codes, archive/restore
│   │   ├── reports/              # Weekly reports, tasks, blockers, hours, review workflow
│   │   ├── s3/                   # AWS S3 presigned upload/download & batch deletion
│   │   └── user/                 # User domain, admin management, role verification
│   ├── router/                   # Centralized routing aggregator
│   ├── main.ts                   # Fast SWC bootstrap with fail-fast env validation & global CORS
│   └── swagger.ts                # OpenAPI 3.0 / Swagger UI documentation builder
├── Dockerfile                    # Security-hardened multi-stage Docker container
└── tsconfig.json                 # Path aliases (@app, @auth, @common, @modules, etc.)
```

---

## ⚡ Key Engineering Highlights

### 1. High-Performance Database Access with Prisma 7 & pg-pool
To prevent connection exhaustion and multiple round-trips when fetching paginated data, repositories execute a **single `$transaction` round-trip**:

```typescript
// src/modules/reports/repository/report.repository.ts
async findManyWithCount(args: Prisma.WeeklyReportFindManyArgs, where?: Prisma.WeeklyReportWhereInput) {
    return this.prisma.db.$transaction([
        this.prisma.db.weeklyReport.findMany(args),
        this.prisma.db.weeklyReport.count({ where }),
    ]);
}
```
- **Single Connection Round-Trip**: Batches both queries into a single database network call.
- **Transaction Consistency**: Reads both the item slice and total count against the exact same snapshot.

### 2. Session-Based Authentication (Better Auth) with Cookie Caching
Authentication is handled via **Better Auth** with `@thallesp/nestjs-better-auth`:
- **5-Minute Cookie Cache**: Employs `cookieCache` with a 5-minute TTL to verify active sessions without executing a database lookup on every authenticated request.
- **Server-Owned Security Attributes**: Sensitive attributes (`role`, `isActive`, `lastLoginAt`) are configured with `input: false`, preventing malicious client elevation.
- **Database Lifecycle Hooks**: Intercepts `user.create` to enforce unique phone numbers and link pending team invitations automatically.
- **Global Preflight-Ready CORS**: Configured at the Express application root in `main.ts` with `credentials: true` and origin validation bound to `TRUSTED_ORIGINS`.

### 3. Direct-to-Cloud S3 Storage via Presigned URLs
Large files, documents, and media never burden API compute. The service uses **AWS SDK v3**:
- The client requests a signed PUT URL with a short TTL (15 minutes).
- Bytes stream directly from browser to Amazon S3.
- Segregated **Public** and **Protected** upload endpoints ensure proper access controls.

### 4. Zero-Leak Standardized Response & Error Envelopes
All API responses pass through a global [ResponseInterceptor](file:///d:/Amjath/My%20Projects/WEB%20Projects/Workinley/workinley-api/src/common/response/interceptors/response.interceptor.ts) and [AppGlobalFilter](file:///d:/Amjath/My%20Projects/WEB%20Projects/Workinley/workinley-api/src/app/filters/app.global.filter.ts):

```json
// Paginated Success Envelope
{
  "error": false,
  "message": "Weekly reports retrieved successfully",
  "data": [ ... ],
  "pagination": {
    "total": 48,
    "page": 1,
    "limit": 10,
    "totalPages": 5,
    "hasNext": true,
    "hasPrev": false
  }
}
```

```json
// Standardized Error Envelope
{
  "error": true,
  "message": "Cannot revoke an invitation that has already been accepted",
  "data": {
    "statusCode": 400,
    "timestamp": "2026-09-10T12:00:00.000Z"
  }
}
```

### 5. Fail-Fast Startup Environment Validation
Before the NestJS container boots, `main.ts` validates `process.env` through `AppEnvDto` using `class-validator`. If critical variables (e.g. `DATABASE_URL`, `BETTER_AUTH_SECRET`, `APP_URL`, `TRUSTED_ORIGINS`) are invalid or missing, the process logs clear diagnostic messages and terminates immediately.

---

## 🎯 Domain Features

### 📋 1. Weekly Reporting System
- **Comprehensive Report Structure**: Week start/end dates, ISO week number, project reference, high-level summary notes, and external links.
- **Granular Task Management**: Current tasks with planned vs. actual completion percentage, hours spent, priority (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`), status, and deliverables.
- **Planned Tasks**: Forward-looking task commitments for subsequent weeks.
- **Categorized Hours**: Breakdown covering `DEVELOPMENT`, `TESTING`, `MEETINGS`, `DOCUMENTATION`, and `OTHER`.
- **Blockers & Achievements**: First-class tracking for key blockers and critical achievements.
- **Review Cycle**: Manager/Admin review actions (`APPROVE`, `REQUEST_CHANGES`) with inline commentary and report status lifecycle management (`DRAFT`, `SUBMITTED`, `NEEDS_CORRECTION`, `APPROVED`).

### 📊 2. Engineering Analytics & Velocity Insights
- **Executive Summary**: High-level KPI metrics across reports submitted, hours logged, completion velocity, and active projects.
- **Velocity Engine**: Rolling velocity trends calculating completed tasks, planned vs. actual hours, and delivery percentage over customizable lookback windows.
- **Workload & Hours Distribution**: Aggregated hours by activity category and project.
- **Submission Compliance**: Real-time team member submission compliance rates.
- **Blocker Digest**: Aggregated view of active blockers across all teams.
- **Member-Specific Stats**: Individual velocity, hours breakdown, and submission streaks.

### 📁 3. Project Management
- **Registry**: Project names, unique codes (`CAP`, `IPM`), descriptions, and custom hex color identifiers.
- **Lifecycle Management**: Active project filtering and archiving capabilities with soft-status transitions.

### ✉️ 4. Team Invitations & Onboarding
- **Tokenized Invitations**: Role pre-assignment (`ADMIN`, `MANAGER`, `USER`) with unique invitation codes.
- **Lifecycle Guardrails**: Validation endpoint, resend mechanism, and revocation safeguards preventing deletion of already accepted invitations.

---

## 📋 API Specification

Interactive Swagger / OpenAPI 3.0 documentation is auto-generated and served at:  
👉 **`http://localhost:8000/api/docs`**

### Summary of Core Endpoints

#### Authentication (`/api/auth/*`)
| Method | Path | Description | Access |
|---|---|---|---|
| `POST` | `/api/auth/sign-up/email` | Create user with phone number & optional invite code | Public |
| `POST` | `/api/auth/sign-in/email` | Email & password authentication | Public |
| `POST` | `/api/auth/sign-out` | Terminate session & clear cookies | Authenticated |
| `GET` | `/api/auth/get-session` | Retrieve active session & user details | Authenticated |

#### Weekly Reports (`/api/v1/reports`)
| Method | Path | Description | Access |
|---|---|---|---|
| `GET` | `/api/v1/reports/my` | Paginated list of authenticated user's reports | Authenticated |
| `GET` | `/api/v1/reports/all` | Paginated list of all team reports | `MANAGER`, `ADMIN` |
| `GET` | `/api/v1/reports/:id` | Get report details by ID | Authenticated |
| `POST` | `/api/v1/reports` | Create draft weekly report | Authenticated |
| `PATCH` | `/api/v1/reports/:id` | Update report, tasks, blockers, and hours | Authenticated |
| `POST` | `/api/v1/reports/:id/submit` | Submit draft report for review | Authenticated |
| `DELETE`| `/api/v1/reports/:id` | Delete draft report | Authenticated |
| `POST` | `/api/v1/reports/:id/approve` | Approve submitted report | `MANAGER`, `ADMIN` |
| `POST` | `/api/v1/reports/:id/request-changes` | Request amendments with review comment | `MANAGER`, `ADMIN` |

#### Engineering Analytics (`/api/v1/analytics`)
| Method | Path | Description | Access |
|---|---|---|---|
| `GET` | `/api/v1/analytics/summary` | Executive summary metrics | Authenticated |
| `GET` | `/api/v1/analytics/velocity` | Team velocity over weeks | Authenticated |
| `GET` | `/api/v1/analytics/hours` | Hours distribution across categories | Authenticated |
| `GET` | `/api/v1/analytics/workload` | Workload allocation by team member | Authenticated |
| `GET` | `/api/v1/analytics/compliance`| Weekly report submission compliance | Authenticated |
| `GET` | `/api/v1/analytics/blockers` | Active blockers digest | Authenticated |
| `GET` | `/api/v1/analytics/activity` | Recent activity stream | Authenticated |
| `GET` | `/api/v1/analytics/member/:id`| Member performance statistics | Authenticated |

#### Projects (`/api/v1/projects`)
| Method | Path | Description | Access |
|---|---|---|---|
| `GET` | `/api/v1/projects` | List all projects with pagination | Authenticated |
| `GET` | `/api/v1/projects/active` | List all active projects | Authenticated |
| `GET` | `/api/v1/projects/:id` | Get project by ID | Authenticated |
| `POST` | `/api/v1/projects` | Create a new project | `MANAGER`, `ADMIN` |
| `PATCH` | `/api/v1/projects/:id` | Update project metadata | `MANAGER`, `ADMIN` |
| `PATCH` | `/api/v1/projects/:id/archive` | Toggle project archive status | `MANAGER`, `ADMIN` |
| `DELETE`| `/api/v1/projects/:id` | Remove project | `ADMIN` |

#### Team Invitations (`/api/v1/invitations`)
| Method | Path | Description | Access |
|---|---|---|---|
| `POST` | `/api/v1/invitations` | Issue team invitation | `MANAGER`, `ADMIN` |
| `GET` | `/api/v1/invitations` | List all team invitations | `MANAGER`, `ADMIN` |
| `GET` | `/api/v1/invitations/validate`| Validate invite code during sign-up | Public |
| `POST` | `/api/v1/invitations/:id/resend` | Resend pending invitation | `MANAGER`, `ADMIN` |
| `DELETE`| `/api/v1/invitations/:id` | Revoke invitation | `MANAGER`, `ADMIN` |

#### Users (`/api/v1/users`)
| Method | Path | Description | Access |
|---|---|---|---|
| `GET` | `/api/v1/users/me` | Fetch authenticated user profile | Authenticated |
| `PATCH` | `/api/v1/users/me` | Update authenticated user profile | Authenticated |
| `GET` | `/api/v1/users/admin/all` | List users with search, sort & pagination | `ADMIN` only |
| `GET` | `/api/v1/users/admin/:id` | Fetch specific user by ID | `ADMIN` only |
| `PATCH` | `/api/v1/users/admin/:id` | Update user role or status | `ADMIN` only |
| `DELETE`| `/api/v1/users/admin/:id` | Deactivate / soft-delete user | `ADMIN` only |

#### Cloud Storage (`/api/v1/s3`)
| Method | Path | Description | Access |
|---|---|---|---|
| `POST` | `/api/v1/s3/public-upload` | Presigned upload URL for public assets | Authenticated |
| `POST` | `/api/v1/s3/secure-upload` | Presigned upload URL for confidential files | Authenticated |
| `GET` | `/api/v1/s3/file-url/:key` | Presigned download URL | Authenticated |
| `DELETE`| `/api/v1/s3/files` | Batch delete files from S3 | Authenticated |

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: `>= 20.11.0` (LTS recommended)
- **Package Manager**: **Yarn** (`>= 1.22.22`)
- **PostgreSQL**: Version 14 or higher (local service or Docker)
- **AWS S3**: Optional (required for file upload features)

---

### 1. Clone & Install Dependencies

```bash
cd workinley-api
yarn install
```

---

### 2. Environment Configuration

Copy the example environment file:

```bash
cp .env.example .env.local
```

Configure `.env.local` with your database and environment settings:

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
BETTER_AUTH_SECRET=07e9737947757687de7f4ee42d4027bb6c67bb380ceabb0f47c7804ebb966078
TRUSTED_ORIGINS=http://localhost:3000,http://localhost:8000

# AWS S3 (Optional for local development)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
S3_BUCKET_NAME=your-s3-bucket
```

---

### 3. Database Migration & Seeding

Apply migrations to initialize your PostgreSQL schema, then run the database seed script:

```bash
# Run Prisma migrations
yarn db:migrate

# Seed the database with users, projects, weekly reports, hours, and blockers
yarn db:seed
```

#### 🔑 Seeded Demo Credentials

| Role | Email | Password | Phone Number | Responsibilities |
| :--- | :--- | :--- | :--- | :--- |
| **Admin** | `admin@workinley.dev` | `Admin@1234` | `+15550001111` | Full administrative oversight, project config, user roles |
| **Manager** | `manager@workinley.dev` | `Manager@1234` | `+15550002222` | Review weekly reports, request changes, approve submissions |
| **Member** | `alex.chen@workinley.dev` | `Member@1234` | `+15550003331` | Log tasks, submit weekly reports, track hours |
| **Member** | `david.ross@workinley.dev` | `Member@1234` | `+15550003332` | Log tasks, submit weekly reports, track hours |
| **Member** | `priya.nair@workinley.dev` | `Member@1234` | `+15550003333` | Log tasks, submit weekly reports, track hours |

---

### 4. Start the Development Server

```bash
# Copies .env.local -> .env and launches the SWC hot-reload development server
yarn start:local
```

The API will be available at:
- **Base Endpoint**: `http://localhost:8000/api/v1`
- **Swagger Documentation**: `http://localhost:8000/api/docs`
- **Health Check**: `http://localhost:8000/api/v1/health`

---

## 🗄 Database & Migrations

Database operations are managed cleanly through the Prisma CLI scripts:

```bash
yarn db:generate     # Regenerates the type-safe Prisma Client (@generated/prisma)
yarn db:migrate      # Applies migrations in development mode
yarn db:migrate:prod # Applies migrations in production (prisma migrate deploy)
yarn db:push         # Synchronizes schema state with database without generating migration
yarn db:studio       # Launches Prisma Studio web GUI to browse records
yarn db:seed         # Runs database seeding script
yarn db:reset        # Resets database, re-applies migrations, and seeds
```

---

## 🛠 Available Scripts

| Script | Purpose |
|---|---|
| `yarn start:local` | Launches development server with hot reload via SWC (loads `.env.local`) |
| `yarn start:qa` | Launches dev server with `.env.qa` |
| `yarn start:prod` | Runs production build with `.env.production` |
| `yarn build` | Compiles production bundle to `/dist` via SWC compiler |
| `yarn test` | Executes Jest test suites |
| `yarn lint` | Runs ESLint 9 checks across codebase |
| `yarn lint:fix` | Automatically resolves fixable ESLint errors |
| `yarn format` | Formats all TypeScript, JSON, and YAML files with Prettier |
| `yarn format:check` | Verifies formatting without modifying files |
| `yarn spell` | CSpell dictionary inspection on codebase |
| `yarn deadcode` | Detects unused exports using `ts-prune` |
| `yarn clean` | Cleans `/dist`, cache directories, and builds |

---

## 🐳 Docker & Production Deployment

Workinley API is packaged with a security-hardened, multi-stage `Dockerfile`:
- **Base Image**: Minimalist `node:22-alpine` for lightweight footprint and minimal attack surface.
- **Dependency Isolation**: Separates build tools (`@swc`, `typescript`) from runtime production dependencies.
- **Least Privilege**: Runs under an unprivileged user (`nestjs:nodejs`, UID 1001) rather than root.

### Build and Run with Docker

```bash
# Build the production Docker image
docker build -t workinley-api:latest .

# Run container
docker run -d \
  --name workinley-api \
  -p 8000:8000 \
  --env-file .env.production \
  workinley-api:latest
```

---

## 🛡 Security & Code Quality Standards

- **Strict Type Safety**: Fully typed DTOs, parameters, and return signatures with zero tolerance for `any` types.
- **Input Sanitization**: All incoming HTTP payloads pass through `ValidationPipe` configured with `{ whitelist: true, forbidNonWhitelisted: true, transform: true }`.
- **Security Headers & Rate Limiting**: Enforced via Helmet, origin-restricted CORS with credentials, and `@nestjs/throttler` (10 requests per 500ms sliding window).
- **Structured Observability**: Structured JSON logging powered by **Pino** with correlated request IDs.

---

## 👤 Author

**Amjath**
- Portfolio / GitHub: [@Amjath](https://github.com/Amjath)
- Role: Full Stack / Backend Software Engineer

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
