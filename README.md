> [!NOTE]
> For setup and design architecture, please refer to the [HIGH_LEVEL_DESIGN.md](HIGH_LEVEL_DESIGN.md).

## What can be improved
-  As a simple project, so I decided to use simple token for authentication, but in production, we should use JWT for authentication.
-  In this project, I use winston logger to log the event, but we should use a centralized logging system such as Datadog, Sentry, Prometheus to monitor the system cache hit, error rate, and other metrics.
-  I also want to implement Docker Compose for the whole system, but I don't have enough time to do it.
-  I also want to implement error handling for the system, in case redis or kafka is not available. Basically we should store the data in the database and retry to send it to kafka or redis use worker to enqueue the data to kafka or redis when it is available.

## ⚙️ Configuration

The system uses a centralized `.env` file located in the `backend/` directory.

### Environment Variables Template (`backend/.env`)
```bash
# --- Database Configuration ---
POSTGRES_USER=user
POSTGRES_PASSWORD=password
LEADS_DB_NAME=leads_db
ACTIVITIES_DB_NAME=activities_db

# --- Service Communication ---
# Secure random string for bearer authentication
AUTH_TOKEN=your_secure_auth_token
KAFKAJS_NO_PARTITIONER_WARNING=1

# --- Ports ---
GATEWAY_PORT=3000
LEAD_PORT=3001
ACTIVITY_PORT=3002
NOTIFICATION_PORT=3003
REDIS_PORT=6379
KAFKA_PORT=9092

# --- Connection Strings (used by migrations/seeds) ---
# Note: Use 'localhost' for local development, or container names for Docker
LEAD_DATABASE_URL=postgresql://user:password@localhost:5433/leads_db
DATABASE_URL=postgresql://user:password@localhost:5434/activities_db
```

## 🚀 Quick Start

### 1. Prerequisites
- **Node.js**: v20+
- **Docker & Docker Compose**: For infrastructure (Databases, Kafka, Redis)

### 2. Infrastructure Setup
Spin up the required infrastructure (PostgreSQL, Kafka, Zookeeper, Redis):
```bash
cd backend
npm run docker:up
```

### 3. Application Setup
Install dependencies and prepare the databases:
```bash
# Install dependencies
npm install

# Generate Prisma clients for all services
npm run db:prepare
```

### 4. Running the Application
To run all services locally (Gateway, Lead, Activity, Notification):
```bash
# In the backend directory, run each service (multiple terminals recommended or use a process manager)
# Running Gateway
npm run start:gateway

# Running Lead Service
npm run start:lead

# Running Activity Service
npm run start:activity

# Running Notification Service
npm run start:notification
```
*Note: Ensure you have your `.env` file configured in the root `backend/` directory.*

## 🧪 Testing

The system includes a comprehensive test suite covering unit, integration, and E2E flows.

### Run E2E Integration Tests
Verifies full flows through the API Gateway using the real infrastructure.
```bash
npm run test:e2e
```

## 🧠 AI Collaboration Narrative

### High-Level Strategy
Our collaboration followed a **"Hardening First"** strategy. We prioritized creating a reproducible, containerized environment early to eliminate "works on my machine" issues. This involved a tight feedback loop where I (the AI) proposed architectural improvements, and the user-provided real-world constraints and performance requirements.

### Process for Verification & Refining
- **Fail-Fast Validation**: We implemented proactive database connection checks in every service to ensure the environment was ready before the application fully started.
- **Complex Mocking**: We solved a significant challenge regarding TypeScript circular references in our test suite. When running parallel tests for multiple microservices, the overlapping Prisma types caused compilation bottlenecks. We refined the mocking strategy to use lightweight `any` casting at the mock declaration level, ensuring stable and fast test execution without sacrificing coverage.
- **Iterative Refinement**: Every feature (Logging, Broadcasting, Caching) went through a "Implementation -> Unit Test -> E2E Validation" cycle, ensuring that even as we scaled to multiple microservices, the system remained cohesive.

### Ensuring Final Quality
- **Observability**: We standardized logging with Winston, including correlation IDs and service-specific metadata, making the distributed system significantly easier to debug.
- **Resilience**: Redis and Kafka integrations include retry strategies to handle transient infrastructure failures, ensuring the system recovers gracefully from restarts.
- **Type Safety**: Full TypeScript integration across all services and shared libraries provides a solid contract for inter-service communication.

---
*Created as part of the Advanced Agentic Coding project.*
