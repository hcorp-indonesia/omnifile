---
name: media-stream-pro
description: Panduan wajib pemrosesan file media ukuran besar menggunakan io.Reader.
---

# Media Stream Pro

Untuk aplikasi konverter media, ukuran file (PDF, Video, Gambar HD) bisa mencapai ratusan Megabyte. Menaruh seluruh file di RAM akan membuat server *Out of Memory* (OOM).

## 1. Larangan Keras RAM Loading
- **DILARANG KERAS** menggunakan `ioutil.ReadAll`, `io.ReadAll`, atau menyalin keseluruhan form-data multipart file langsung ke memory byte slice (`[]byte`).
- Jangan pernah menyimpan representasi base64 dari file berukuran besar di memory.

## 2. Gunakan Streaming
- Ambil file multipart menggunakan `file.Open()`, lalu parsing stream tersebut (yang mengimplementasikan `io.Reader`) secara langsung ke *client* tujuan (Misalnya method `s.Client.PutObject()` di MinIO / RustFS).
- Selalu manfaatkan sifat stream: Server hanya menjadi jembatan (pipa) dari *client* (browser) ke *Storage Object* tanpa menampung air (data) di tengah.

## 3. Background Processing
- Fitur konversi dan upscaling membutuhkan waktu. Controller harus mereturn status sukses secepat mungkin beserta `JobID`.
- Pemrosesan sebenarnya (seperti convert ke PDF atau Upscaling AI) harus dijalankan secara asinkron atau didorong ke Message Queue (Dragonfly/Redis) yang nanti akan diambil oleh Background Worker.
- *Storage layer* (RustFS) adalah jembatan utama perpindahan file antara API utama dan Worker.
