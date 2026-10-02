---
name: bun-orm-optimizer
description: Praktik terbaik performa database dengan Bun ORM dan Atlas Loader.
---

# Bun ORM & Database Optimizer

Saat berurusan dengan database PostgreSQL dan Bun ORM, patuhi standar ini:

## 1. Migrasi & Skema
- Dilarang membuat tabel secara manual atau melakukan migrasi runtime biasa (seperti AutoMigrate di GORM).
- Magic Converter menggunakan sistem *Atlas Loader*. Setiap penambahan tabel atau perubahan skema struct WAJIB diregistrasikan di file `apps/api/loader/main.go`.
- Struct model harus selalu ditaruh di file `model.go` di masing-masing modul.

## 2. Performa & N+1 Queries
- Gunakan method `Relation()` secara eksplisit jika kamu butuh mengambil data berelasi (*Eager Loading*) untuk menghindari N+1 query problem.
- Jangan gunakan `Select()` tanpa `Where()` kecuali saat melakukan paginasi.
- Selalu gunakan konteks (`ctx context.Context`) dalam setiap kueri database untuk mendukung pembatalan (cancellation) / timeout.

## 3. Struct Tags
- Wajib menggunakan properti `bun:",pk"` untuk Primary Key.
- Wajib menambahkan tag `json:"-"` untuk data sensitif seperti password agar tidak pernah bocor otomatis saat parsing ke respons API.
