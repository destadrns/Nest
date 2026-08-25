# NEST (Network for Everyday Spending & Tracking)

NEST is a self-hosted household and personal financial management platform. It provides double-entry accounting principles, multi-account consolidation, budget lifecycle tracking, cash flow projections, and collaborative family ledgers with strict role-based access control.

---

## Architectural Overview

The application follows a modular decoupled architecture:

- **Frontend Client**: Single-page application built with React 19, TypeScript, Tailwind CSS v4, and TanStack Query, optimized for high data density, keyboard workflows, and strict binary theme presentation (Light / Charcoal Dark).
- **Backend API**: Modular NestJS application providing RESTful endpoints, structured validation pipelines, cryptographic session handling, and transactional integrity via Prisma ORM.
- **Data Persistence**: PostgreSQL 16 relational database with strict schema constraints, foreign key relationships, and automated migration scripts.
- **Cache & Session Store**: Redis 7 managing distributed session storage, brute-force rate limits, and short-term cache invalidation.
- **Containerization**: Multi-stage Docker configurations managed via Docker Compose for uniform development and production setups.

---

## Core Capabilities

### 1. Account & Ledger Management
- Multi-currency support (IDR, USD) with integer-cent arithmetic to eliminate floating-point rounding errors.
- Support for multiple account types: Checking, Savings, Credit Cards, Investments, and Cash Wallets.
- Transaction history with classification by categories, subcategories, tags, and payee tracking.

### 2. Household & Collaboration Model
- Multi-family workspace isolation.
- Granular permission model: Owner, Admin, Member, and Viewer roles.
- Shared and private account visibility rules per household member.

### 3. Budgeting & Financial Goals
- Flexible budget envelopes with rollover balance tracking.
- Goal progression monitors with deadline projections and automated contribution schedules.
- Category-level thresholds and overspending alerts.

### 4. Security & Compliance
- Password hashing using Argon2id with memory-hard parameters.
- Two-Factor Authentication (TOTP) and WebAuthn / FIDO2 Passkey support.
- Encrypted HTTP-only, SameSite session cookies.
- Comprehensive audit logging for sensitive account modifications, security changes, and auth events.
- Client-side data masking and rate-limiting across all authentication endpoints.

---

## Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS v4, Zustand, TanStack Query, Lucide Icons |
| **Backend** | NestJS 11, Express, TypeScript, Prisma ORM, Class Validator, Zod |
| **Database** | PostgreSQL 16 (Relational Ledger), Redis 7 (Session Store & Cache) |
| **Security** | Argon2id, Speakeasy (TOTP), Helmet, Express-Session, Connect-Redis |
| **DevOps & CI** | Docker, Docker Compose, GitHub Actions |

---

## Getting Started

### Prerequisites
- Node.js 22 LTS or later
- Docker Engine 24+ and Docker Compose v2+
- npm 10+

### Local Environment Setup

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd nest
   ```

2. **Configure Environment Variables**:
   ```bash
   # Backend configuration
   cp backend/.env.example backend/.env

   # Frontend configuration
   cp frontend/.env.example frontend/.env
   ```

3. **Start Core Infrastructure (PostgreSQL & Redis)**:
   ```bash
   docker compose up -d postgres redis
   ```

4. **Initialize Backend**:
   ```bash
   cd backend
   npm install
   npx prisma migrate dev
   npx prisma db seed # Optional: loads baseline category structure
   npm run start:dev
   ```

5. **Initialize Frontend** (in a separate terminal):
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

The frontend client will be available at `http://localhost:5173`, connecting to the API service at `http://localhost:4000`.

---

## Running Full Stack via Docker

To build and run all services in unified production-like containers:

```bash
docker compose up -d --build
```

Services will be mapped to:
- **Frontend App**: `http://localhost:3000`
- **Backend API**: `http://localhost:4000`
- **PostgreSQL**: `localhost:5432`
- **Redis**: `localhost:6379`

---

## Testing & Quality Assurance

Both frontend and backend include strict validation pipelines and automated checks:

```bash
# Run backend typecheck, lint, and test suites
cd backend
npm run typecheck
npm run lint:check
npm run test

# Run frontend typecheck, lint, and test suites
cd ../frontend
npm run typecheck
npm run lint:check
npm run test
```

---

## License

This project is licensed under the MIT License. See the LICENSE file for details.
