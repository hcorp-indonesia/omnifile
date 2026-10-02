---
name: zustand-tanstack-master
description: Standar ketat untuk State Management dan Data Fetching di Frontend (Zustand & TanStack Query).
---

# Zustand & TanStack Query Master Skill

Kapan pun kamu menulis atau memodifikasi logika state management atau fetching API di Frontend (React), patuhi aturan ini:

## 1. Pemisahan State
- **Server State**: HARUS menggunakan TanStack Query (`@tanstack/react-query`). Jangan pernah simpan data hasil fetch dari API ke dalam Zustand.
- **Client/UI State**: HARUS menggunakan Zustand (contoh: mode gelap, sidebar toggle, modal terbuka, form input sementara).

## 2. Standar TanStack Query
- Selalu pisahkan *Query Keys* di satu file *constant* atau gunakan *factory pattern* agar key konsisten.
- Selalu gunakan `useMutation` untuk operasi POST/PUT/DELETE, dan pertimbangkan untuk mengimplementasikan *Optimistic Updates* jika memungkinkan.
- Gunakan `onSuccess` callback di `useMutation` untuk memanggil `queryClient.invalidateQueries` agar data otomatis diperbarui.

## 3. Standar Zustand
- Jangan buat satu *store* raksasa. Pecah *store* menjadi bagian-bagian kecil (misal: `useAuthStore`, `useThemeStore`, `useSidebarStore`).
- Gunakan *selectors* yang spesifik saat mengambil state di komponen untuk mencegah re-render berlebih:
  `const isCollapsed = useSidebarStore((state) => state.isCollapsed);`
