---
name: ui-ux-promax
description: Panduan tingkat dewa (Pro Max) untuk menghasilkan desain UI/UX yang sangat premium, modern, dan interaktif.
---

# UI/UX Pro Max Skill (Neobrutalism & Claymorphism Edition)

Kapan pun kamu diminta untuk membuat, mendesain, atau memperbaiki antarmuka pengguna (UI) di Frontend, patuhi standar estetika mutlak dari referensi [UUPM Educational Platform](https://uupm.cc/demo/educational-platform):

## 1. Estetika Utama: Neobrutalism x Claymorphism
- **Warna Dasar**: Gunakan latar belakang warna krem lembut (`bg-[#fdfbf7]` atau setara) untuk *background* utama aplikasi.
- **Warna Aksen**: Gunakan warna-warna solid yang ceria (Mint, Purple, Yellow, Blue) untuk elemen penting.
- **Border & Shadow**: Setiap elemen *Card*, Tombol, atau Wadah (Container) **wajib** menggunakan *border* tebal berwarna gelap (misal: `border-3 border-gray-900`) dan *border radius* melengkung (`rounded-xl` atau `rounded-2xl`). 
- **Efek Clay**: Jangan gunakan shadow blur biasa. Gunakan solid shadow (bayangan blok solid) atau efek "clay" untuk kedalaman.

## 2. Micro-Interactions
- Tambahkan efek interaktif pada Card dan Tombol saat di-hover:
  - Elemen harus merespons hover dengan transisi yang tegas (misal: `hover:-translate-y-1 hover:shadow-[4px_4px_0_0_#111827]`).
  - Animasi harus terasa *bouncy* dan responsif.
- Saat proses asinkron (API), gunakan spinner custom tebal atau *skeleton* bergaya Neobrutalism.

## 3. Tipografi & Hirarki Visual
- Gunakan font *sans-serif* modern yang tebal dan bersih (seperti Space Grotesk, DM Sans, atau Plus Jakarta Sans).
- Teks judul (`h1`, `h2`) harus sangat mencolok (`font-bold text-gray-900`) dipadukan dengan aksen warna di kata-kata tertentu.
- Beri *spacing* (jarak whitespace) yang lega, misalnya `p-6` atau `p-8` pada Card.
- Gunakan *Badge* bergaya pil (`rounded-full px-4 py-2 border-2`) untuk status atau kategori.

## 4. Struktur Komponen (Tailwind)
- **Wajib menggunakan `cn(...)`**: Setiap styling `className` pada elemen JSX/TSX harus selalu dibungkus menggunakan helper `cn(...)` dari `@/lib/utils`.
- Komponen seperti `<Card />` harus memiliki kelas bawaan: `bg-white rounded-2xl border-3 border-gray-900 overflow-hidden`.
- Komponen `<Button />` primer: `px-6 py-3 font-bold rounded-xl border-3 border-gray-900 bg-yellow-400 hover:bg-yellow-500 hover:-translate-y-1 transition-transform`.
- Semua feedback wajib memakai *Toaster* bergaya tebal (Neobrutalism).

