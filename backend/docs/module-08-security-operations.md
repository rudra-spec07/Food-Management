# Module 08 — Security Operations & Deployment Architecture Guide

## 1. Overview
Module 08 establishes cross-cutting security, authorization, health monitoring, auditability, rate limiting, and operational controls for the Food Management System.

---

## 2. Security Infrastructure

### A. Authentication & Session Validation
- All protected API routes require a valid Bearer JWT header verified against the database `auth_sessions` table.
- Deactivated user accounts (`user.status !== 'ACTIVE'`) are immediately blocked on every request with `401 Unauthorized` (`AUTH_USER_INACTIVE`).

### B. Rate Limiting Strategy
- **Authentication Endpoints**:
  - `/api/v1/auth/login`: 10 requests / 15 minutes (`RATE_LIMIT_LOGIN_MAX`).
  - `/api/v1/auth/register`: 5 requests / 60 minutes (`RATE_LIMIT_REGISTER_MAX`).
  - `/api/v1/users/change-password`: 5 requests / 15 minutes (`RATE_LIMIT_CHANGE_PASSWORD_MAX`).
- **Global API Rate Limiter**:
  - All `/api/v1/` routes are protected by a configurable rate limiter (`RATE_LIMIT_GLOBAL_MAX=300` per 15 minutes per IP).

### C. CORS Configuration
- Configured in `backend/src/config/env.ts` via `CORS_ORIGIN`.
- Development: Defaults to `*` for local frontend developer testing.
- Production: Set `CORS_ORIGIN=https://app.foodshare.org,https://admin.foodshare.org`.

### D. Security Headers & TLS
- `helmet()` automatically sets HTTP security headers:
  - `Strict-Transport-Security` (HSTS)
  - `X-Frame-Options: SAMEORIGIN` (Clickjacking prevention)
  - `X-Content-Type-Options: nosniff` (MIME sniffing defense)
  - `X-DNS-Prefetch-Control: off`
- TLS/HTTPS termination must be enforced at the reverse proxy / ingress controller layer (Nginx, Cloudflare, AWS ALB).

---

## 3. Infrastructure & Health Probes

1. **`GET /health`**: Basic health endpoint returning `{ status: 'UP', timestamp }`.
2. **`GET /live`**: Liveness probe returning `{ success: true, data: { status: 'ALIVE' } }`. Verifies that the Node.js Express process is responsive without querying external infrastructure.
3. **`GET /ready`**: Readiness probe executing `SELECT 1` against PostgreSQL via Prisma.
   - Healthy Database: `200 OK` `{ success: true, data: { status: 'READY', database: 'HEALTHY' } }`.
   - Database Failure: `503 Service Unavailable` `{ success: false, error: { code: 'SERVICE_UNAVAILABLE', message: 'Database connectivity probe failed' } }`.

---

## 4. Audit Log Immutability & Outbox Pattern

- **Audit Logs**: Stored in `audit_logs` table via Prisma transactions. Records are strictly append-only; no API endpoints support `UPDATE` or `DELETE` on audit logs.
- **Transactional Outbox**: Business mutations insert `outbox_events` atomically in the same database transaction.
- **Background Worker**: Executable via `npm run worker` (`outbox-notification.worker.ts`). Polled outbox events trigger notification deliveries without blocking primary request cycles.

---

## 5. Operations & Disaster Recovery Targets

- **Migration Sequence**: Run `npx prisma migrate deploy` prior to launching updated API container instances.
- **Graceful Shutdown**: The process intercepts `SIGINT` and `SIGTERM`, closes active HTTP connections, and cleanly disconnects the Prisma database pool.
- **RPO Target**: Point-in-time database recovery (Neon automated WAL backups) with Recovery Point Objective (RPO) < 5 minutes.
- **RTO Target**: Recovery Time Objective (RTO) < 30 minutes.
