# 🪄 Magic Converter

Monorepo for **Magic Converter** — a unit conversion management system.

- **Backend (`apps/api`)**: Go Fiber v3 API (PostgreSQL, Bun ORM, Redis/Dragonfly, S3/RustFS)
- **Frontend (`apps/web`)**: React 19 SPA (Vite, TypeScript, Zustand, TanStack Query, Tailwind CSS v4)

---

## 🚀 Quick Start

### Prerequisites
- [Go](https://go.dev/) 1.25+
- [Bun](https://bun.sh/) 1.x+
- PostgreSQL 15+
- Redis / Dragonfly

### 1. Setup Environment
```bash
cp apps/api/.env.example apps/api/.env
```

### 2. Install Frontend Dependencies
```bash
cd apps/web && bun install
```

### 3. Install Backend Dependencies
```bash
cd apps/api && go mod tidy
```

### 4. Run Migrations
```bash
cd apps/api && go run migrations/migrate.go
# With seed data:
cd apps/api && go run migrations/migrate.go --seed
```

### 5. Run Development Servers
```bash
# Frontend (http://localhost:5173)
cd apps/web && bun dev

# Backend (http://localhost:8000)
cd apps/api && go run main.go
```

---

## 📂 Project Structure

```
magic-converter/
├── apps/
│   ├── api/                      # Go Fiber v3 Backend
│   │   ├── app/
│   │   │   ├── modules/          # Feature modules
│   │   │   │   └── converter/    # Converter CRUD
│   │   │   │       ├── model.go
│   │   │   │       ├── types.go
│   │   │   │       ├── service.go
│   │   │   │       └── controller.go
│   │   │   ├── routes/           # Route registration
│   │   │   └── shared/           # Shared response helpers
│   │   ├── pkg/
│   │   │   ├── client/           # DB, Redis, S3 clients
│   │   │   ├── config/           # Fiber configuration
│   │   │   ├── middlewares/      # CORS, validation, etc.
│   │   │   └── utils/            # Logger, server, env helpers
│   │   ├── migrations/           # SQL migrations & runner
│   │   ├── loader/               # Atlas schema loader
│   │   ├── hc/                   # Health check binary
│   │   └── main.go               # Entry point
│   │
│   └── web/                      # React Vite Frontend
│       └── src/
│           ├── components/       # UI components
│           │   ├── common/       # PageLoader, etc.
│           │   ├── converter/    # Converter-specific
│           │   └── layout/       # Sidebar, Header, MainLayout
│           ├── config/           # Navigation config
│           ├── hooks/            # TanStack Query hooks
│           ├── lib/              # Axios instance, utils
│           ├── pages/            # Route pages
│           ├── service/          # API service layer
│           ├── store/            # Zustand stores
│           ├── types/            # TypeScript interfaces
│           ├── app.tsx           # Root component
│           └── main.tsx          # Entry point
│
├── .oxlintrc.json                # OxLint config
├── lefthook.yml                  # Git hooks
├── Dockerfile                    # Multi-stage build
└── docker-compose.yml            # Docker Compose
```

---

## 🛡️ API Endpoints

| Method   | Endpoint                | Description           |
| :------- | :---------------------- | :-------------------- |
| `GET`    | `/api/v1/converters`    | List all converters   |
| `GET`    | `/api/v1/converters/:id`| Get converter detail  |
| `POST`   | `/api/v1/converters`    | Create new converter  |
| `PUT`    | `/api/v1/converters/:id`| Update converter      |
| `DELETE` | `/api/v1/converters/:id`| Delete converter      |
| `POST`   | `/api/v1/auth/request-otp` | Send a one-time login code by email |
| `POST`   | `/api/v1/auth/verify-otp` | Verify the code and create a session |
| `GET`    | `/livez`                | Health check          |

### Passwordless Email Login

Users sign in with a six-digit, single-use email code. There is no registration
or password. A user record is created automatically after the first successful
verification. Configure these variables in `.env` or Dokploy:

```env
SMTP_HOST=smtp.resend.com
SMTP_PORT=465
SMTP_USERNAME=resend
SMTP_PASSWORD=your-resend-api-key
SMTP_FROM=Magic Converter <noreply@email.raishannan.com>
OTP_SECRET=replace-with-a-long-random-secret
```

The sending domain must be verified in Resend and its SPF/DKIM records must be
active. Login codes expire after 10 minutes, can only be used once, allow at
most five attempts, and can be requested once per minute per email address.

---

## Dokploy Deployment

The production Compose stack runs one application container only. PostgreSQL,
Dragonfly/Redis, SMTP, PDF.co, and S3-compatible storage are expected to exist
outside this stack.

1. Create a **Compose** application in Dokploy and select this repository.
2. Use `docker-compose.yml` from the repository root.
3. Copy the variables from `.env.dokploy.example` into Dokploy's Environment
   section and replace every placeholder.
4. Attach the application domain to service `app` on container port `8000`.
5. Deploy. The container runs pending database migrations before starting the
   API unless `RUN_MIGRATIONS=false` is configured.

The React frontend and Go API are served from the same domain. The persistent
`model_cache` volume stores downloaded remove-background model files between
deployments. No PostgreSQL, Redis/Dragonfly, or object-storage container is
created by this Compose file.

---

## 📄 License
MIT License.
