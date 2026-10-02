# Magic Converter Coding Standards

## 1. Backend (BE) Standards:
- **Performance First**: Always prioritize best practices and performance for all backend logic.
- **Utils First**: Consistently check the `pkg/utils/` directory before writing new helper functions. If a utility function already exists, reuse it.
- **Architecture**: Enforce Clean Architecture strictly. Keep handlers lightweight and put business logic in services.
- **File Handling**: Ensure proper file streaming and chunking for media. Do not load massive files entirely into memory.
- **Database**: Use `loader/main.go` and `migrations/migrate.go` (Atlas + Bun) for schema modifications.
- **Error Handling**: Use the standard error responses defined in `apps/api/app/shared/http_error.go`.

## 2. Frontend (FE) Standards:
- **Component Consistency**: Always maximize component reuse. Build modular, reusable UI components. Do not write duplicate UI logic.
- **Styling with `cn()` Helper**: Wajib selalu menggunakan fungsi `cn(...)` (dari `@/lib/utils` atau `../../lib/utils`) pada properti `className` di semua elemen dan komponen Frontend (React/TSX). Jangan menuliskan string className secara mentah/panjang tanpa dibungkus `cn(...)`.
- **UI/UX**: Prioritize modern, premium aesthetics. Use smooth gradients, glassmorphism, micro-animations, and Lucide icons. Use Tailwind's extended palette (avoid generic colors).

## 3. Security Standards:
- **Trivy Scanner**: All code, dependencies (Go modules & NPM packages), and Dockerfiles must pass `trivy fs` scans without HIGH or CRITICAL vulnerabilities or exposed secrets.
