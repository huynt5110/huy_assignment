# High-Level Design: Sales Lead Management System

> [!NOTE]
> For setup and configuration details, please refer to the [README.md](README.md).

## Configuration Management
The system utilizes a centralized environment configuration strategy. All microservices and infrastructure components share a lead `.env` file located in the `backend/` directory. This ensures consistency across the distributed stack and simplifies orchestration during both local development and containerized execution.

> A lightweight microservices-based tool for salespeople to manage and track incoming leads from a dealership website.

---

## 1. Architecture Diagram

![Sales Lead Management Architecture](C:\Users\ADMIN\.gemini\antigravity\brain\d62d78ae-9572-4136-970a-d5b885a4ec92\architecture_diagram_1773736203351.png)

### Text-Based Reference Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React SPA)                             │
│                  Leads Inbox │ Lead Details │ Activity Log              │
└──────────┬──────────────────────────────────────────┬───────────────────┘
           │  REST / HTTP + Bearer Token              │  WebSocket (ws://)
           ▼                                          ▼
┌─────────────────────────────┐          ┌──────────────────────────┐
│     API Gateway / BFF       │          │    WebSocket Gateway     │
│  ┌────────┬────────┬──────┐ │          │  (Socket.IO / ws)       │
│  │ Helmet │ Auth   │ Rate │ │          │  Pushes real-time events│
│  │        │ Token  │Limit │ │          └──────────▲───────────────┘
│  └────────┴────────┴──────┘ │                     │
│         ┌────────────┐      │                     │
│         │ Redis Cache│      │                     │
│         └────────────┘      │                     │
└──────┬───────────┬──────────┘                     │
       │           │                                │
       ▼           ▼                                │
┌────────────┐ ┌─────────────────┐ ┌────────────────────────────┐
│Lead Service│ │Activity Service │ │   Notification Service     │
│            │ │                 │ │  Consumes Kafka events     │
│ CRUD leads │ │ Log follow-ups  │ │  Forwards to WS Gateway   │
└─────┬──────┘ └──────┬──────────┘ └────────────────────────────┘
      │               │                       ▲
      │  Publishes     │  Publishes            │ Consumes
      ▼               ▼                       │
┌─────────────────────────────────────────────────────────────────┐
│                    Apache Kafka                                  │
│           Topics: lead-events │ activity-events                 │
└─────────────────────────────────────────────────────────────────┘
      │               │
      ▼               ▼
┌────────────┐ ┌─────────────────┐       ┌────────────────┐
│PostgreSQL  │ │PostgreSQL       │       │  Redis         │
│(Leads DB)  │ │(Activities DB)  │       │  (Cache Store) │
└────────────┘ └─────────────────┘       └────────────────┘

─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─
  OBSERVABILITY:  Winston (Structured JSON Logging)
─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─
```

---

## 2. Component Descriptions

| Component | Role |
|---|---|
| **Frontend (React SPA)** | Single-page application presenting the Lead Inbox, Lead Details view, and Activity Logging form. Connects via REST for data and WebSocket for real-time updates. |
| **API Gateway / BFF** | Single entry point for all REST calls. Applies **authentication** (Bearer token), **rate limiting** (`express-rate-limit`), security headers (**Helmet**), and **Redis caching** for GET endpoints. Routes requests to the appropriate microservice. |
| **Lead Service** | Owns lead lifecycle — create, read, update, list. Persists leads to its own PostgreSQL database. Publishes `lead-events` to Kafka on state changes. |
| **Activity Service** | Manages follow-up activities (e.g., "Called customer", "Sent email"). Persists activities to its own PostgreSQL database. Publishes `activity-events` to Kafka. |
| **Notification Service** | Kafka consumer that listens to `lead-events` and `activity-events`. Forwards relevant events to the WebSocket Gateway for real-time delivery. Also triggers **Redis cache invalidation** on write events. |
| **WebSocket Gateway** | Maintains persistent WebSocket connections with frontends. Broadcasts events (new lead, new activity) so the UI updates in real time without polling. |
| **Apache Kafka** | Asynchronous message broker decoupling the microservices. Topics: `lead-events`, `activity-events`. Enables loose coupling and future extensibility. |
| **PostgreSQL** | Relational store for structured lead and activity data. Each service owns its own schema (database-per-service pattern). |
| **Redis** | In-memory cache for GET API responses. Cache is invalidated on lead creation and activity updates to ensure data freshness. |
| **Observability Stack** | Cross-cutting: Winston for structured JSON logging across all services with correlation IDs for request tracing. |

---

## 3. Data Flow

### 3.1 Lead Ingestion (New lead from website)

```
Website Form → API Gateway → Lead Service → PostgreSQL (persist)
                                          → Kafka (publish "lead.created")
                                                  ↓
                              Notification Service (consume)
                                                  ↓
                              WebSocket Gateway → Frontend (real-time update)
```

1. A website visitor submits a lead form.
2. The request hits the **API Gateway**, which applies rate limiting and Helmet headers.
3. The gateway forwards the request to the **Lead Service**.
4. The Lead Service persists the lead into **PostgreSQL** and publishes a `lead.created` event to the **Kafka** `lead-events` topic.
5. The **Notification Service** consumes the event and pushes it through the **WebSocket Gateway**.
6. The **Frontend** receives the event and adds the new lead to the inbox in real time.

### 3.2 Activity Logging (Salesperson logs a follow-up)

```
Frontend → API Gateway → Activity Service → PostgreSQL (persist)
                                           → Kafka (publish "activity.created")
                                                   ↓
                               Notification Service (consume)
                                                   ↓
                               WebSocket Gateway → Frontend (real-time update)
```

1. A salesperson submits a follow-up activity (e.g., "Called customer — left voicemail").
2. The **API Gateway** routes the request to the **Activity Service**.
3. The Activity Service validates the payload, persists it, and publishes an `activity.created` event to the **Kafka** `activity-events` topic.
4. The **Notification Service** consumes the event and broadcasts it via **WebSocket**.
5. All connected frontends update the lead's chronological activity log in real time.

### 3.3 Viewing Lead Details

```
Frontend → API Gateway → Lead Service (lead data)
Frontend → API Gateway → Activity Service (activity log)
```

The frontend makes separate calls to fetch lead details and the activity log. This allows for independent scaling and pagination of activities.

---

## 4. API Gateway — Detailed Design

The API Gateway is the single entry point for all client-facing REST traffic. It acts as a **Backend-for-Frontend (BFF)**, shielding internal microservices from direct exposure.

### 4.1 Responsibilities

| Responsibility | Details |
|---|---|
| **Authentication** | Validates Bearer token from `Authorization` header. Rejects unauthenticated requests with `401`. |
| **Request Routing** | Maps public endpoints to internal microservice URLs via a route table. |
| **Rate Limiting** | `express-rate-limit` middleware — limits requests per IP to prevent abuse (e.g., 100 req/min). |
| **Security Headers** | `helmet` middleware — sets CSP, HSTS, X-Frame-Options, etc. |
| **Rate Limiting** | `express-rate-limit` middleware — limits requests per IP (e.g., 100 req/min). |
| **Redis Caching** | Caches selective GET responses (e.g., Lead Details) in Redis with TTL. |
| **Request Validation** | Validates incoming payloads (JSON schema/Zod) before forwarding. |
| **Logging** | Attaches `correlationId` to every request via middleware; logs request/response metadata with Winston. |
| **CORS** | Configured to allow only the frontend origin. |

### 4.2 Route Table

| Method | Public Endpoint | Target Service | Description |
|---|---|---|---|
| `GET` | `/api/leads` | Lead Service | List all leads (cursor-based pagination) |
| `GET` | `/api/leads/:id` | Lead Service | Get lead details |
| `POST` | `/api/leads` | Lead Service | Create a new lead |
| `POST` | `/api/leads/:id/activities` | Activity Service | Log a follow-up activity |
| `GET` | `/api/leads/:id/activities` | Activity Service | Get activity log (paginated) |

### 4.3 Middleware Pipeline

Requests flow through middleware in this order:

```
Incoming Request
  │
  ├─▶ 1. Helmet          (security headers)
  ├─▶ 2. CORS             (origin validation)
  ├─▶ 3. Rate Limiter     (throttle by IP)
  ├─▶ 4. Body Parser      (JSON parsing)
  ├─▶ 5. Auth Token       (validate Bearer token → 401 if invalid)
  ├─▶ 6. Correlation ID   (generate/attach unique ID)
  ├─▶ 7. Request Logger   (Winston: log method, path, correlationId)
  ├─▶ 8. Redis Cache      (GET → return cached if hit; skip for POST/PUT)
  ├─▶ 9. Route Handler    (proxy to microservice)
  └─▶ 10. Error Handler   (catch-all, log error, return standard response)
```

### 4.4 Configuration

```typescript
// Environment variables
PORT=3000
LEAD_SERVICE_URL=http://lead-service:3001
ACTIVITY_SERVICE_URL=http://activity-service:3002
RATE_LIMIT_WINDOW_MS=60000        // 1 minute
RATE_LIMIT_MAX_REQUESTS=100       // per window per IP
CORS_ORIGIN=http://localhost:5173 // frontend dev server
LOG_LEVEL=info
AUTH_TOKEN=your-secret-token-here // shared static Bearer token
REDIS_URL=redis://redis:6379      // Redis connection string
CACHE_TTL_SECONDS=60              // default cache TTL
```

### 4.5 Error Response Format

```json
{
  "status": 429,
  "error": "Too Many Requests",
  "message": "Rate limit exceeded. Try again in 60 seconds.",
  "correlationId": "req-abc123-def456"
}
```

---

## 5. Authentication — Simple Bearer Token

### 5.1 How It Works

All API requests (except the public lead submission endpoint from the dealership website) must include a **static Bearer token** in the `Authorization` header:

```
Authorization: Bearer <AUTH_TOKEN>
```

The API Gateway middleware compares the token against the `AUTH_TOKEN` environment variable. If the token is missing or invalid, the gateway returns `401 Unauthorized`.

### 5.2 Why Simple Token Authentication?

| Consideration | Justification |
|---|---|
| **Lightweight tool** | This is an internal dealership tool with a small, trusted team of salespeople — full OAuth2/JWT infrastructure is overkill. |
| **Speed of development** | No need for user registration, login flows, token refresh, or session management. |
| **Single role** | All users are salespeople with the same permissions — no role-based access control needed. |
| **Easy rotation** | Token can be rotated by updating the environment variable and restarting — no DB migration required. |
| **Upgrade path** | Can be replaced with JWT or OAuth2 later if the tool scales or multi-tenancy/role-based access is needed. |

### 5.3 Public vs. Protected Endpoints

| Endpoint | Auth Required | Reason |
|---|---|---|
| All other `/api/*` endpoints | ✅ Yes | Salesperson-facing operations require token |

---

## 6. Redis Caching Strategy

### 6.1 Overview

The API Gateway uses **Redis** as an in-memory cache layer for GET endpoints to reduce database load and improve response times. Cache entries are **invalidated on writes** to ensure data consistency.

### 6.2 Cache Keys & TTL

| Endpoint | Cache Key Pattern | TTL | Description |
|---|---|---|---|
| `GET /api/leads` | `cache:leads:list` | 60s | Paginated lead list |
| `GET /api/leads/:id` | `cache:leads:{id}` | 120s | Single lead with details |
| `GET /api/leads/:id/activities` | `cache:activities:{leadId}` | 60s | Activity log for a lead |

### 6.3 Cache Invalidation Rules

Cache is invalidated (keys deleted) when write operations occur:

| Trigger Event | Keys Invalidated | Mechanism |
|---|---|---|
| `POST /api/leads` (new lead created) | `cache:leads:list` API Gateway clears after write |
| `PUT /api/leads/:id` (lead updated) | `cache:leads:{id}`, `cache:leads:list:*` | API Gateway clears after write |
| `POST /api/leads/:id/activities` (new activity) | `cache:activities:{leadId}`, `cache:leads:{id}` | API Gateway clears after write |

### 6.4 Cache Flow Diagram

```
GET /api/leads/:id
  │
  ├─▶ Check Redis: cache:leads:{id}
  │     ├── HIT  → return cached response (skip microservice call)
  │     └── MISS → forward to Lead Service
  │                    │
  │                    ├── Get response
  │                    ├── Store in Redis with TTL
  │                    └── Return response to client
  │
POST /api/leads/:id/activities
  │
  ├─▶ Forward to Activity Service
  ├─▶ On success: DELETE cache:activities:{leadId}, cache:leads:{id}
  └─▶ Return response to client
```

### 6.5 Why Redis?

| Reason | Details |
|---|---|
| **Sub-millisecond reads** | In-memory store delivers cache hits in < 1ms |
| **Simple key-value model** | Straightforward `GET`/`SET`/`DEL` operations |
| **TTL support** | Built-in key expiration eliminates stale data |
| **Pattern deletion** | `SCAN` + `DEL` supports wildcard cache invalidation (e.g., `cache:leads:list:*`) |
| **Already in Docker Compose** | Minimal infrastructure overhead — just one more container |

---

## 7. Chosen Technologies & Justifications

| Technology | Purpose | Justification |
|---|---|---|
| **Node.js (Express)** | All backend services | Non-blocking I/O ideal for real-time apps; large npm ecosystem; team requirement. |
| **TypeScript** | Language for all services | Type safety reduces runtime errors; better IDE support and maintainability. |
| **React** | Frontend SPA | Component-based UI; massive ecosystem; easy WebSocket integration. |
| **Apache Kafka** (KafkaJS) | Message broker | Durable, high-throughput event streaming; decouples services; supports replay; user requirement. |
| **PostgreSQL** (via Prisma) | Data persistence | ACID-compliant relational DB; excellent for structured lead/activity data; Prisma provides type-safe ORM. |
| **Socket.IO** | WebSocket layer | Automatic reconnection, room-based broadcasting, fallback to long-polling; user requirement for real-time updates. |
| **express-rate-limit** | Rate limiting | Lightweight middleware to prevent API abuse; easy per-route configuration; user requirement. |
| **Helmet** | HTTP security headers | One-liner middleware that sets secure HTTP headers (CSP, HSTS, etc.); user requirement. |
| **Docker + Docker Compose** | Containerization | Reproducible environments; simplifies running Kafka, PostgreSQL, and all services locally. |
| **Winston** | Structured logging | JSON log output, log levels, pluggable transports (console, file, external). |
| **Redis** (`ioredis`) | Caching layer | Sub-ms reads; simple key-value with TTL; pattern-based invalidation; lightweight Docker container. |

---

## 8. Observability Strategy — Winston Logging

All services use **Winston** as the single observability tool, providing structured JSON logging with correlation IDs for request tracing across services.

### 6.1 Log Format

- **Structured JSON logs** with consistent fields: `timestamp`, `service`, `correlationId`, `level`, `message`, `meta`.
- **Log levels**: `error`, `warn`, `info`, `debug`. Production defaults to `info`.
- **Correlation IDs**: Every inbound request gets a unique `correlationId` (via API Gateway middleware) that propagates through HTTP headers and Kafka message headers across all services.

```jsonc
// Example log entry
{
  "timestamp": "2026-03-17T08:15:30.123Z",
  "service": "activity-service",
  "correlationId": "req-abc123-def456",
  "level": "info",
  "message": "Activity created",
  "meta": { "leadId": "lead-001", "type": "phone_call" }
}
```

### 6.2 Transports

| Environment | Transport | Details |
|---|---|---|
| Development | Console | Colorized, human-readable output |
| Staging | File (rotation) | Daily rotation, 14-day retention, max 20 MB per file |
| Production | File + optional ELK/Loki | Structured JSON files; optionally ship to a centralized log aggregator |

### 6.3 What Gets Logged

| Event | Level | Example |
|---|---|---|
| Incoming HTTP request | `info` | `GET /api/leads 200 45ms` |
| Kafka event published | `info` | `Published lead.created to lead-events` |
| Kafka event consumed | `info` | `Consumed activity.created from activity-events` |
| WebSocket connection opened/closed | `info` | `Client connected: socket-id-xyz` |
| Validation error | `warn` | `Invalid payload for POST /api/leads: missing 'email'` |
| Unhandled error | `error` | Full stack trace + correlationId |
| Service startup/shutdown | `info` | `Lead Service started on port 3001` |

---

## 9. GenAI-Assisted Design

This section documents how Generative AI (specifically, an AI coding assistant) was used during the design phase of this project.

### 9.1 How GenAI Was Used

| Phase | GenAI Contribution |
|---|---|
| **Requirements Analysis** | Interpreted the raw requirements and identified the core entities (Lead, Activity), their relationships, and the key user workflows (inbox, detail view, activity logging). |
| **Architecture Design** | Proposed the microservices decomposition (Lead Service, Activity Service, Notification Service) based on domain boundaries. Recommended Kafka for inter-service communication and Socket.IO for real-time WebSocket updates—aligned with user constraints. |
| **Architecture Diagram** | Generated the visual architecture diagram and the text-based ASCII fallback to ensure clarity across all mediums. |
| **Technology Selection** | Evaluated and justified each technology choice against the project constraints (Node.js requirement, microservices mandate, Kafka preference). Recommended complementary tools (Prisma, Winston). |
| **Observability Strategy** | Designed the Winston-based logging strategy with structured JSON format, correlation IDs, and transport configuration per environment. |
| **Data Flow Documentation** | Mapped out the end-to-end data flow for each core use case (lead ingestion, activity logging, lead detail view) to ensure all components interact correctly. |
| **Security Considerations** | Incorporated the user's requirements for rate limiting and Helmet, and placed them architecturally at the API Gateway level for centralized enforcement. |

### 9.2 Prompt Engineering Approach

The design was driven by providing GenAI with:
1. **Explicit constraints** — Node.js, microservices, Kafka, WebSocket, rate limiting, Helmet.
2. **Core requirements** — The three functional requirements (Lead Inbox, Lead Details, Activity Logging).
3. **Output expectations** — Requested specific deliverables (architecture diagram, component descriptions, data flows, tech justifications, observability strategy).

GenAI iterated on the design by asking clarifying questions and refining the architecture to balance simplicity (lightweight tool) with scalability (microservices + Kafka).

### 9.3 Human Review & Modifications

While GenAI produced the initial design, the following aspects require human review:
- **Kafka partition strategy** — Number of partitions per topic based on expected load.
- **Deployment topology** — Cloud provider selection, Kubernetes vs. Docker Compose for production.

---

## Related Documents

- [Database Schema & Kafka Event Formats](./DATABASE_AND_KAFKA_SCHEMA.md) — PostgreSQL table definitions, indexes, Kafka event JSON payloads, ER diagram, and Prisma ORM schemas.

---

## Appendix: Project Structure (Proposed)

```
sales-lead-management/
├── services/
│   ├── api-gateway/          # Express gateway + auth + rate-limit + helmet + Redis cache
│   ├── lead-service/         # Lead CRUD + Kafka producer
│   ├── activity-service/     # Activity CRUD + Kafka producer
│   └── notification-service/ # Kafka consumer + WebSocket broadcaster
├── frontend/                 # React SPA
├── docker-compose.yml        # Kafka, Zookeeper, PostgreSQL, Redis, all services
└── README.md
```
