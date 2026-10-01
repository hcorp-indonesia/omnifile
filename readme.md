# 🚀 Integrative API J3 (Product Management)

[![Go Version](https://img.shields.io/github/go-mod/go-version/vierohanz/integrative-api-j3?style=flat-square&color=00ADD8)](https://go.dev/)
[![Fiber v3](https://img.shields.io/badge/Fiber-v3-00ADD8?style=flat-square&logo=go)](https://gofiber.io/)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL-336791?style=flat-square&logo=postgresql)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Cache-Redis-DC382D?style=flat-square&logo=redis)](https://redis.io/)

A high-performance API specifically designed for **Product Management**, built with **Go Fiber v3**.

---

## ✨ Features

- 🏎️ **Go Fiber v3** - High-speed HTTP engine.
- 🐘 **PostgreSQL & Bun ORM** - Efficient database mapping.
- 🚀 **Redis & Dragonfly** - Fast data caching.
- 📦 **RustFS / S3 / MinIO** - Scalable object storage.
- 🏗️ **Clean Architecture** - Maintainable code structure.
- 🛠️ **Built-in Migrator** - Easy database schema updates.
- 📑 **Structured Logging** - Zerolog integration.

---

## 📂 Project Structure

```text
├── app/
│   ├── api/
│   │   ├── controllers/    # Product handlers
│   │   ├── services/       # Product business logic
│   │   └── types/          # Product DTOs
│   ├── models/             # Product models (Bun)
│   ├── routes/             # Route registration
│   └── shared/             # Shared utilities
├── pkg/
│   ├── client/             # Infrastructure clients
│   ├── config/             # Configs
│   ├── middlewares/        # Middlewares (Validation, etc.)
│   └── utils/              # Utilities
├── migrations/             # Migrations & runner
└── hc/                     # Health check
```

---

## 🚀 Getting Started

### 1. Setup Environment
```bash
cp .env.example .env
```

### 2. Install & Run
```bash
go mod tidy
go run migrations/migrate.go
go run main.go
```

---

## 🛡️ API Endpoints

| Category | Method | Endpoint | Description |
| :--- | :--- | :--- | :--- |
| **Product**| `GET` | `/api/v1/products` | List all products |
| **Product**| `GET` | `/api/v1/products/:id`| Get product details |
| **Product**| `POST` | `/api/v1/products` | Create new product |
| **Product**| `PUT` | `/api/v1/products/:id`| Update product |
| **Product**| `DELETE`| `/api/v1/products/:id`| Delete product |
| **System**| `GET` | `/livez` | Health check |

---

## 📄 License
MIT License. Developed by **vierohanz**.
