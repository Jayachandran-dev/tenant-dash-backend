# Tenant Dash – Backend

Multi-tenant SaaS API built with **Node.js, Express, Prisma, PostgreSQL (Neon), and Socket.io**.

Live API: `https://tenant-dash-api.onrender.com`  
Frontend: [tenant-dash-frontend.vercel.app](https://tenant-dash-frontend.vercel.app)

---

## Features

- **OTP-based authentication** (mobile number)
- **Multi-tenancy** with Membership model (User ↔ Tenant)
- **Role-based access** (`owner`, `employee`)
- **Business profile** (logo, visiting card, theme color/mode, contact info)
- **Users management** (add members by mobile)
- **Items CRUD** (tenant-scoped)
- **Real-time updates** via Socket.io (business profile sync)
- **JWT auth** + tenant context via `X-Tenant-Id` header

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Runtime | Node.js |
| Framework | Express |
| ORM | Prisma 7 |
| Database | PostgreSQL (Neon) |
| Auth | JWT + OTP (in-memory for dev) |
| Real-time | Socket.io |
| Hosting | Render (free tier) |

---

## Architecture

- One mobile number = one User
- User can belong to multiple tenants via Membership
- Owner creates the business on signup; employees are added later
- All data queries are scoped by `tenantId`

---

## API Overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/send-otp` | Send OTP |
| POST | `/api/auth/verify-otp` | Login |
| POST | `/api/auth/signup` | Create business + owner |
| GET | `/api/dashboard` | Tenant dashboard data |
| GET/POST | `/api/users` | List / add members |
| PATCH | `/api/users/me` | Update own profile |
| GET/PATCH | `/api/business/profile` | Business profile |
| GET/POST/PATCH/DELETE | `/api/items` | Items CRUD |
| GET | `/health` | Health check |

Protected routes require:


---

## Setup (Local)

### 1. Clone & install

```bash
git clone https://github.com/Jayachandran-dev/tenant-dash-backend.git
cd tenant-dash-backend
npm install

src/
  index.js          # Express + Socket.io
  db.js             # Prisma client
  middleware/auth.js
  routes/
    auth.js
    business.js
    dashboard.js
    items.js
    tenants.js
    users.js
  utils/
prisma/
  schema.prisma