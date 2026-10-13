# Meme'd Campaign Payout Tracker 🚀

> **WLDD SDE-I Engineering Assessment**  
> An end-to-end creator marketplace platform where brands launch viral campaigns and creators earn payouts based on milestone ladders—strictly guarded by campaign budgets with race-condition prevention.

---

## 📋 Table of Contents
1. [Tech Stack](#-tech-stack)
2. [Monorepo Structure](#-monorepo-structure)
3. [Local Development Setup](#-local-development-setup)
4. [Dockerized Setup (Stretch Goal)](#-dockerized-setup)
5. [Environment Variables](#-environment-variables)
6. [Core Business Logic & Stated Assumptions](#-core-business-logic--stated-assumptions)
7. [Unit Testing Suite](#-unit-testing-suite)
8. [API Reference & Sample cURL](#-api-reference--sample-curl)
9. [Bonus & Stretch Implementations](#-bonus--stretch-implementations)
10. [System Design: Scaling to 10,000 Creators](#-scaling-to-10000-creators-stretch-note)
11. [Deployment Guide](#-deployment-guide)

---

## 🛠 Tech Stack

- **Backend**: Node.js, Express, TypeScript, MongoDB (Mongoose), Redis (ioredis), JWT, Jest
- **Frontend**: Next.js (App Router), TypeScript, Tailwind CSS
- **DevOps**: Docker, Docker Compose

---

## 📂 Monorepo Structure

```text
├── backend/
│   ├── src/
│   │   ├── config/          # MongoDB connection & resilient Redis client
│   │   ├── controllers/     # Auth, Campaign, and Submission controllers
│   │   ├── middlewares/     # JWT authentication, role guards, global error handler
│   │   ├── models/          # User, Campaign, Submission Mongoose schemas
│   │   ├── routes/          # Express route definitions
│   │   ├── services/        # Pure calculation engine & anomaly spike detection
│   │   ├── __tests__/       # Comprehensive Jest unit test suite
│   │   ├── app.ts           # Express app configuration
│   │   └── index.ts         # Server bootstrapper
│   ├── Dockerfile
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── app/             # Next.js App Router (page.tsx, layout.tsx, globals.css)
│   │   ├── components/      # BrandDashboard, CreatorDashboard, ViewSimulatorModal, AuthModal
│   │   └── lib/             # Typed API client
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml       # 1-Command full stack orchestration
├── .env.example             # Monorepo environment configuration sample
└── README.md
```

---

## ⚡ Quickstart: Local Setup

### Prerequisites
- Node.js >= 20.x
- MongoDB running locally or a free MongoDB Atlas connection string
- (Optional) Redis server running locally

### 1. Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Start in development mode (hot-reload):
npm run dev
```
The backend starts at `http://localhost:5000`.

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
The frontend starts at `http://localhost:3000`.

---

## 🐳 Dockerized Setup (Stretch Goal 6.b)

Spin up the entire stack (MongoDB, Redis, Backend, Frontend) with a single command:

```bash
docker-compose up --build
```
- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:5000`

---

## 🔐 Environment Variables

Create `.env` in the backend folder (or use root `.env.example`):

| Variable | Description | Default |
| :--- | :--- | :--- |
| `PORT` | Backend port | `5000` |
| `NODE_ENV` | Environment (`development` / `production`) | `development` |
| `MONGODB_URI` | MongoDB connection URI | `mongodb://localhost:27017/memed` |
| `JWT_SECRET` | Secret key for signing auth tokens | `super_secret_jwt_key_memed_12345` |
| `REDIS_URL` | Redis URL for campaign caching (Optional) | `redis://localhost:6379` |
| `FRONTEND_URL` | Allowed origin for CORS | `http://localhost:3000` |
| `NEXT_PUBLIC_API_URL` | Backend URL for frontend calls | `http://localhost:5000/api` |

---

## 🧠 Core Business Logic & Stated Assumptions

### 1. Milestone Payout Rule
A creator's payout is the amount of the **highest milestone crossed**:
- If milestone ladder is: `10k views -> ₹500`, `50k views -> ₹2,000`, `100k views -> ₹5,000`.
- If post views jump from `5k` to `65k` in a single update:
  - Both 10k and 50k thresholds were crossed.
  - The payout is **₹2,000** (the highest milestone crossed), **not** ₹500 + ₹2,000.

### 2. Incremental Deltas (No Double-Paying)
- When a post previously crossed 10k views, the creator received ₹500 (campaign deducted ₹500).
- When the post subsequently reaches 50k views (target ₹2,000):
  - The engine deducts only the incremental difference: $\Delta = ₹2,000 - ₹500 = ₹1,500$.
  - Total creator payout becomes ₹2,000.
- If views update without crossing a higher milestone, $\Delta = 0$ (fully idempotent, repeated updates never double-pay).

### 3. Mid-Payout Campaign Budget Exhaustion
- If a post qualifies for an incremental payout of ₹1,500, but the campaign only has ₹800 remaining:
  - **Decision Made**: The creator receives the remaining ₹800 (capped payout).
  - The campaign status is updated to `budget_exhausted` and remaining budget becomes ₹0.
  - The submission is marked with `cappedDueToBudget: true`.

### 4. Concurrency Guard & Race Conditions (Stretch 6.a)
- Simultaneous view updates could attempt to spend the remaining budget at the same millisecond.
- **Solution**: Atomic conditional queries on MongoDB:
  ```ts
  Campaign.findOneAndUpdate(
    { _id: campaignId, remainingBudget: { $gte: deltaPayout } },
    { $inc: { spentBudget: deltaPayout, remainingBudget: -deltaPayout } },
    { new: true }
  );
  ```
  If another concurrent request reduces `remainingBudget` before this query executes, the condition fails atomically, preventing any overspend.

---

## 🧪 Unit Testing Suite

The pure payout calculation engine and budget cap rules are covered by Jest unit tests.

To run the unit tests:
```bash
cd backend
npm test
```

### Test Coverage Highlights:
- ✅ Single milestone progression
- ✅ Zero payout for views below minimum threshold
- ✅ Multi-milestone leaps in a single update
- ✅ Incremental delta deductions
- ✅ Idempotency on repeated updates (zero double-pay)
- ✅ Partial budget exhaustion mid-payout (exact capping)
- ✅ Complete budget exhaustion (0 delta)
- ✅ Anomaly view spike detection

---

## 📡 API Reference & Sample cURL

### 1. Auth: Register / Login
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Nike India","email":"nike@brand.com","password":"password123","role":"brand"}'
```

### 2. Brand: Create Campaign
```bash
curl -X POST http://localhost:5000/api/campaigns \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <BRAND_TOKEN>" \
  -d '{
    "name": "Summer Reel Blast",
    "platform": "Instagram",
    "totalBudget": 25000,
    "milestones": [
      {"viewsThreshold": 10000, "payout": 500},
      {"viewsThreshold": 50000, "payout": 2000},
      {"viewsThreshold": 100000, "payout": 5000}
    ]
  }'
```

### 3. Creator: Browse Live Campaigns
```bash
curl -X GET http://localhost:5000/api/campaigns/live
```

### 4. Creator: Submit Post
```bash
curl -X POST http://localhost:5000/api/submissions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <CREATOR_TOKEN>" \
  -d '{"campaignId":"<CAMPAIGN_ID>","postLink":"https://instagram.com/reel/C8XYZ123"}'
```

### 5. Platform Data Simulation (No Auth Required)
```bash
curl -X PATCH http://localhost:5000/api/submissions/<SUBMISSION_ID>/views \
  -H "Content-Type: application/json" \
  -d '{"views": 55000}'
```

---

## 🌟 Bonus & Stretch Implementations

1. **Redis Caching (Bonus 5.a)**:
   - `GET /api/campaigns/live` caches responses in Redis with a 60-second TTL.
   - Automatically invalidates cache on new campaign creation or budget exhaustion.
   - Graceful fallback: If Redis is offline, the app transparently queries MongoDB.
2. **Fraud & View Spike Anomaly Detection (Bonus 5.b)**:
   - If views spike by $> 100,000$ in a single update, the submission is flagged (`isFlagged: true`) with the exact velocity anomaly noted.
3. **Interactive Simulation Tool on Frontend**:
   - The UI includes a built-in interactive simulator modal with presets (`+10k`, `+50k`, `+100k`, and `Trigger Spike`) allowing evaluators to verify milestones live in one click.

---

## 📈 Scaling to 10,000 Creators (Stretch Note 6.c)

Handling 10,000 active creators with automated social media view tracking requires shifting from synchronous request-response updates to an asynchronous, distributed event-driven pipeline:

### 1. Ingestion via Distributed Message Queue (BullMQ / Apache Kafka)
Instead of processing social platform webhooks or view polling synchronously, incoming view updates are pushed into a partitioned Kafka topic or Redis-backed BullMQ queue (`views.update.events`).
- Partitions are keyed by `campaignId` so all events for a given campaign are processed sequentially by a worker, naturally eliminating race conditions without distributed deadlocks.

### 2. Distributed Locking & Budget Atomic Guard
For high-frequency concurrency across horizontal backend workers:
- **Redlock / Redis Atomic Deductions**: Maintain campaign `remainingBudget` in Redis (`DECRBY` with Lua scripts ensuring atomic bounds).
- Redis executes the check-and-decrement in $< 1\text{ms}$. Successful transactions are asynchronously written back to MongoDB via Write-Behind buffering.

### 3. Database Indexing & Read/Write Splitting
- **Compound Indexes**: `{ campaignId: 1, postLink: 1 }` and `{ status: 1, remainingBudget: 1 }` ensure sub-millisecond lookups.
- **Read Replicas**: Direct all creator browsing traffic (`GET /api/campaigns/live` and `GET /api/creators/earnings`) to MongoDB secondary read replicas or edge Redis caches, keeping the primary replica dedicated to transactional writes.

### 4. Rate-Limiting & External API Quotas
- YouTube Data API and Instagram Graph API have strict quota limits.
- Background worker cron jobs pool posts into tiered polling frequencies: high-growth posts are polled every 15 minutes; older posts are polled every 4 hours.

---

## 🚀 Deployment Guide

- **Frontend**: Connect the GitHub repo to [Vercel](https://vercel.com), set root directory to `frontend`, and configure `NEXT_PUBLIC_API_URL`.
- **Backend**: Deploy on [Render](https://render.com) or [Railway](https://railway.app), set root directory to `backend`, build command `npm run build`, start command `npm start`, and supply environment variables.
- **Database**: Free tier MongoDB cluster on [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
