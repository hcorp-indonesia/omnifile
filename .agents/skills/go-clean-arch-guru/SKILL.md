---
name: go-clean-arch-guru
description: Aturan ketat penerapan Clean Architecture pada backend Go Fiber.
---

# Go Clean Architecture Guru

Setiap kali menulis atau memperbarui modul Backend Go, kamu WAJIB mematuhi kerangka Clean Architecture:

## 1. Lapisan Arsitektur (Strict Boundaries)
- **Controller**: Hanya boleh berisi *parsing request*, validasi struct (lewat validator), memanggil Service, dan memformat *response* (`shared.RespondSuccess` atau `shared.RespondError`). DILARANG KERAS menaruh logika bisnis, kueri database, atau pembacaan file di sini.
- **Service**: Di sinilah semua **logika bisnis** (Business Logic) hidup. Service boleh memanggil eksternal client (Redis, MinIO) atau Repository/Model.
- **Model/Repository**: Khusus untuk interaksi ke Database (Bun ORM).

## 2. Dependency Injection (DI)
- Magic Converter menggunakan library `go.uber.org/dig`.
- Setiap kali kamu membuat Controller, Service, atau Client baru, kamu WAJIB mendaftarkannya di fungsi penyedia (*Provide*) di `main.go`.

## 3. Error Handling
- Dilarang mereturn error mentah (`errors.New`) dari Controller ke Fiber.
- Gunakan standard HTTP Errors yang ada di `app/shared/http_error.go` (misalnya `shared.ErrBadRequest("alasan")` atau `shared.ErrInternalServerError("alasan")`).
- Log *error* internal (seperti gagal connect DB) menggunakan `zerolog/log` sebelum mereturn generic message ke user agar aman.
