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
| `POST`   | `/api/v1/auth/password-reset/request` | Request a password reset magic link |
| `POST`   | `/api/v1/auth/password-reset/confirm` | Set a new password using the magic-link token |
| `GET`    | `/livez`                | Health check          |

### SMTP Password Reset Setup

Password reset uses a single-use token stored as a SHA-256 hash and sent through SMTP with TLS. Configure these variables in the local `.env` file (never commit them):

```env
FRONTEND_URL=https://your-frontend-domain.example
SMTP_HOST=smtp.resend.com
SMTP_PORT=465
SMTP_USERNAME=resend
SMTP_PASSWORD=your-resend-api-key
SMTP_FROM=Magic Converter <noreply@email.raishannan.com>
```

The sending domain must be verified in Resend and its SPF/DKIM DNS records must be active. Reset links expire after 15 minutes, are invalidated after use, and revoke existing sessions after a successful password change.

---

## 📄 License
MIT License.
