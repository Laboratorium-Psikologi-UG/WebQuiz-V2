# PRD — Web Quiz Pre-Test & Post-Test Praktikum Laboratorium Psikologi

**Referensi:** Notulensi Rapat WEB Quiz #1 (02 September 2026)
**Status:** Draft — System Design belum final, wajib diselesaikan sebelum development dimulai
**Versi Dokumen:** 1.0

---

## 1. Latar Belakang

Laboratorium Psikologi membutuhkan sebuah platform web untuk menjalankan **quiz pre-test dan post-test** bagi peserta praktikum. Sistem ini menggantikan proses manual dan perlu mendukung dua sisi pengguna:

- **Public/Peserta** — mengerjakan quiz pre-test/post-test.
- **Admin (internal lab)** — mengelola soal, ujian, monitoring peserta, dan pelaporan nilai.

Sebelumnya tim sempat merencanakan stack lama (React + Express JS + MySQL), namun pada rapat ini diputuskan untuk migrasi ke stack baru berbasis **Next.js** demi konsistensi framework (frontend & backend satu ekosistem) dan kemudahan maintenance jangka panjang.

---

## 2. Tujuan

- Menyediakan sistem quiz pre-test/post-test yang bisa diakses publik tanpa perlu akun penuh (cukup token/kode akses).
- Menyediakan panel admin dengan role-based access control untuk pengelolaan soal, ujian, dan laporan nilai.
- Menstandarkan struktur teknis (API, service layer, database) agar mudah dikembangkan oleh banyak kontributor.
- Database quiz **digabung** dengan database CMS yang sudah ada (MySQL) — bukan database terpisah.

---

## 3. Tech Stack

### 3.1 Perbandingan Stack Lama vs Baru

| Layer | Stack Lama (deprecated) | Stack Baru (disepakati) |
|---|---|---|
| Framework | — | **Next.js 16** |
| Frontend | React | **Next.js (TSX-based)** |
| Backend | Express JS | **tRPC** |
| Database | MySQL | **MySQL** (digabung dengan database CMS) |

### 3.2 Library Backend

| Kebutuhan | Library |
|---|---|
| ORM | **Prisma 7** (konfigurasi via `prisma.config.js`) |
| Validasi | **Zod** |
| Auth Admin | **NextAuth.js** dengan strategi **JWT** |
| Auth Public | **Session-based (cookie)** dengan **token input** |

### 3.3 Library Frontend

| Kebutuhan | Library |
|---|---|
| UI Components | **shadcn/ui** (disimpan di `/components/ui/`) |

### 3.4 Tools Pendukung

- **Team Management:** JIRA (Atlassian) — untuk tracking task & sprint tim development.

---

## 4. Arsitektur Sistem

### 4.1 Struktur Framework

```
Next.js 16
├── Backend: tRPC
│   ├── Route domain publik   → /(public)
│   └── Route domain admin    → /admin
└── Frontend: Next.js (TSX)
    └── Library UI: shadcn/ui (/components/ui/)
```

### 4.2 Konvensi Endpoint & Service Layer

Setiap endpoint API mengikuti pola pemisahan **route handler** dan **service logic**, contoh:

```
/api/user/[id]/route.ts
  → import dari
/lib/service/user.service.ts
```

Route handler bertugas menerima request & validasi, sedangkan logic bisnis utama ditulis di file service terpisah. Setiap function service dikategorikan berdasarkan konteks akses: **public** atau **admin**.

### 4.3 Pemisahan Domain tRPC

| Route | Konteks | Auth |
|---|---|---|
| `/` (domain publik) | Peserta mengerjakan quiz | Session-based (cookie) + token input |
| `/admin` | Pengelolaan sistem oleh internal lab | JWT (NextAuth.js) |

---

## 5. Strategi Autentikasi

### 5.1 Public (Peserta)

- Peserta **tidak login layaknya user biasa** — akses menggunakan **token/kode** yang di-input di awal.
- Setelah token divalidasi, sesi disimpan sebagai **cookie session-based**.
- Alur: `Input Token → Validasi → Session Cookie dibuat → Akses Quiz`.

### 5.2 Admin

- Menggunakan **NextAuth.js** dengan strategi **JWT**.
- Setelah login berhasil, JWT digunakan untuk otorisasi ke seluruh **Admin Menus/Module**.
- Alur: `Login (username/password) → JWT issued → Akses Admin Panel sesuai Role`.

---

## 6. Roles & Permissions

| Role | Alias di Notulensi | Akses Utama |
|---|---|---|
| **Prog** | Superadmin | Akses penuh ke seluruh modul admin |
| **Staff and Structure** | Struktur | Exam Management |
| **Assistant** | Asisten | Reports Menu (Grading) |

> **Catatan dari rapat (belum final, perlu didiskusikan lebih lanjut):**
> - Skema permission apakah berbasis **per user** atau **per kelas**? (Masih dipertanyakan di notulensi — `Permissions != per user, per kelas?`)
> - Ada indikasi kebutuhan flag **status peserta** — misalnya *"Is Permit to do Exam?"* dengan nilai **is_active = 1** sebagai penentu apakah peserta diizinkan mengerjakan ujian.
> - Relasi antara roles dan permissions (`roles?permissions=id?`) masih perlu didefinisikan lebih rinci — apakah permission di-assign per role secara statis, atau dinamis per id.

Default seed data roles: `Prog`, `Staff`, `Struktur`, `Asisten` (asisten lab).

---

## 7. Fitur Admin (Menu & Modul)

1. **Dashboard**
   Ringkasan aktivitas sistem (jumlah peserta, ujian berjalan, dsb).

2. **Users and Roles Management** *(khusus Admin)*
   Mengelola akun admin/staff beserta role dan permission masing-masing.

3. **Monitoring User** *(Public)*
   Memantau aktivitas peserta publik secara real-time (siapa yang sedang mengerjakan, progres, dsb).

4. **Exam Management**
   Membuat, mengatur, dan mempublikasikan sesi ujian (pre-test/post-test), termasuk penjadwalan dan pengaturan akses via token.

5. **Question Bank**
   Repository soal yang bisa digunakan lintas ujian. Setiap soal memiliki `QuestionType` berupa **enum** (mis. `pilihan_ganda`, `essay`, dst).

   > Catatan: fitur ini masih ditandai dengan tanda tanya di notulensi (`Question Bank?`) — perlu konfirmasi scope akhirnya sebelum development (apakah soal reusable lintas ujian, atau dibuat baru per ujian).

6. **Reporting (Grading / Penilaian)**
   - Penilaian hasil pre-test & post-test.
   - Export laporan dalam format **PDF** dan **CSV**.
   - Berdasarkan sketsa UI di notulensi, halaman report memiliki:
     - **Filter** (mis. berdasarkan kelas, NPM)
     - **Tabel data** hasil peserta
     - **Tombol Export**
   - Catatan tambahan dari notulensi: perlu ada **warning** sebelum export (mis. konfirmasi jumlah data/filter yang aktif) dan tabel filter yang jelas.

---

## 8. Question Bank — Detail

- Tipe soal disimpan sebagai **enum**, contoh nilai: `pilihan_ganda`, `essay`, dan tipe lain yang mungkin ditambahkan ke depannya.
- Struktur ini harus fleksibel agar mudah menambah tipe soal baru tanpa migrasi besar (disarankan enum di level Prisma schema, bukan hardcode di frontend).

---

## 9. System Design (Wajib Sebelum Development)

Sesuai hasil rapat, **development tidak boleh dimulai** sebelum tiga dokumen desain berikut selesai:

1. **UML** — pemodelan struktur sistem/class secara umum.
2. **Sequence Diagram (per endpoint)** — menggambarkan alur request dari route handler ke service layer, mengikuti konvensi di poin 4.2 (`/api/.../route.ts` → `/lib/service/....service.ts`).
3. **ERD** — struktur relasi database MySQL (digabung dengan skema CMS existing).
4. **UI/UX** — wireframe/mockup untuk halaman publik (quiz) dan admin (dashboard, exam management, question bank, reporting).

---

## 10. Open Questions / Catatan Rapat yang Perlu Ditindaklanjuti

Berikut poin-poin dari notulensi yang masih bertanda tanya dan perlu diklarifikasi sebelum masuk ke tahap System Design final:

- [ ] Apakah ORM final tetap **Prisma 7**, atau masih dalam evaluasi? *(ditandai `?` di notulensi)*
- [ ] Skema permission: **per user** vs **per kelas** — mana yang dipakai?
- [ ] Kebutuhan validasi **status aktif/izin ujian** peserta (`is_active`) — bagaimana flow-nya di sistem (siapa yang set status ini, kapan)?
- [ ] Scope **Question Bank**: apakah soal reusable lintas exam/sesi, atau dibuat ulang tiap sesi?
- [ ] Relasi **roles ↔ permissions**: statis per role atau dinamis per id?
- [ ] Detail kebutuhan **export**: format warning apa yang muncul sebelum export, dan filter apa saja yang wajib ada di tabel report.

---

## 11. Langkah Selanjutnya

1. Finalisasi jawaban dari poin **Open Questions** (Bagian 10) bersama tim.
2. Menyusun UML, Sequence Diagram, ERD, dan UI/UX sesuai Bagian 9.
3. Setup project awal: Next.js 16 + tRPC + Prisma 7 + Zod + NextAuth.js + shadcn/ui.
4. Review desain database gabungan (Quiz + CMS) sebelum migrasi Prisma dijalankan ke database MySQL production/staging.