# Design System — Web Quiz Pre-Test & Post-Test Lab Psikologi

**Nama sistem desain:** Vibrant Fidelity (adaptasi untuk konteks asesmen psikologi)
**Prinsip utama:** Modern, minimalis, colorful, mudah dipahami, playful — tapi tetap tenang, netral, dan tidak menekan peserta selama mengerjakan tes.

---

## 1. Filosofi Desain

Ini bukan produk konsumer biasa — ini adalah **instrumen asesmen**. Peserta yang mengisi pre-test/post-test bisa saja sedang cemas, terburu-buru, atau baru pertama kali pakai sistem digital untuk tes psikologi. Maka desain harus menyeimbangkan dua hal yang kelihatannya berlawanan:

- **Playful & colorful** di lapisan brand (landing page, navigasi, elemen non-kritikal) — supaya terasa modern dan tidak kaku seperti form birokrasi.
- **Netral & tenang** di lapisan pengerjaan soal — warna, feedback, dan microcopy tidak boleh membuat peserta merasa dihakimi, terburu-buru, atau malu saat menjawab.

Prinsip ini mengikuti etika dasar asesmen psikologi: **tidak ada elemen visual yang mempengaruhi jawaban peserta** (misalnya warna hijau/merah besar yang menyiratkan "benar/salah" pada soal skala psikometrik), dan **privasi/kerahasiaan data** ditegaskan lewat visual, bukan cuma teks kecil di footer.

---

## 2. Warna

Base token diambil dari palet **Vibrant Fidelity** yang sudah ditentukan, dipakai dengan pembagian peran yang jelas antara *brand layer* dan *assessment layer*.

### 2.1 Token Inti

| Token | Hex | Peran |
|---|---|---|
| `primary` | `#1123F1` | Aksi utama, tombol CTA, elemen aktif/fokus |
| `primary-container` | `#1F52E8` | Varian lebih terang dari primary, untuk hover/highlight |
| `tertiary` | `#BD0BD5` | Aksen sekunder — badge, ikon dekoratif, elemen playful |
| `purple` | `#8210B8` | Aksen brand sekunder dan status non-evaluatif |
| `lavender` | `#A98DDD` | Surface aksen lembut dan highlight |
| `taupe` | `#B28E6C` | Aksen visual institusional/dekoratif |
| `neutral` | `#898788` | Teks sekunder dan outline netral |
| `on-surface` | `#171B2D` | Teks utama (navy gelap, bukan pure black) |
| `surface` | `#F4F3F5` | Background utama netral terang |
| `surface-container` | `#DEDEE3` | Background kartu/section, memberi layering tanpa shadow berat |
| `surface-container-high` | `#C9C9D0` | Layer navigasi/sidebar yang sedikit lebih dalam |
| `outline` | `#898788` | Border, pembatas halus |
| `error` | `#BA1A1A` | **Hanya untuk error sistem** (mis. gagal submit, token invalid) — bukan untuk menandai jawaban |

### 2.2 Aturan Penggunaan Warna (Etika Asesmen)

- **Di halaman brand/dashboard/landing:** warna boleh dipakai bebas dan ekspresif — gradasi ungu-magenta, badge warna-warni, ilustrasi playful.
- **Di halaman pengerjaan soal (public/peserta):**
  - Hindari sistem warna hijau=benar/merah=salah pada pilihan jawaban, termasuk untuk soal pilihan ganda sekalipun — gunakan indikator netral (mis. border `primary` saat dipilih, bukan warna yang menyiratkan penilaian).
  - Progress bar pakai `primary` polos, tanpa gradasi "urgensi" (hindari warna yang berubah jadi merah saat waktu hampir habis kalau tes tidak time-pressured secara sengaja).
  - `error` state hanya dipakai untuk kegagalan teknis (koneksi putus, token expired), bukan untuk menyoroti soal yang belum dijawab dengan cara yang terasa menghakimi — gunakan `tertiary` container yang lebih soft untuk "soal belum terisi".
- **Kontras:** semua kombinasi teks/background minimum WCAG AA (4.5:1 untuk teks normal). Jangan pernah mengandalkan warna saja untuk menyampaikan status — selalu sertakan ikon atau teks (penting untuk peserta dengan buta warna).

---

## 3. Tipografi

Menggunakan **Inter** di seluruh sistem — satu keluarga font, dibedakan lewat weight dan ukuran, supaya konsisten dan mudah dibaca tanpa terasa "banyak gaya".

| Role | Font | Size | Weight | Line Height |
|---|---|---|---|---|
| Headline | Inter | 32px | 600 (SemiBold) | 40px |
| Body | Inter | 16px | 400 (Regular) | 24px |
| Label | Inter | 14px | 500 (Medium) | 20px |

**Aturan khusus untuk teks soal:** ukuran body soal di-set minimum 16px (tidak boleh diperkecil demi memuat lebih banyak soal di layar) — keterbacaan lebih penting daripada densitas. Line length dijaga di bawah 80 karakter per baris agar soal panjang tetap nyaman dibaca.

Hindari huruf kapital semua (ALL CAPS) untuk label — gunakan sentence case supaya nada tetap ramah, bukan seperti perintah formulir birokrasi.

---

## 4. Layout & Spacing

- Base unit spacing: **8px**, konsisten di seluruh grid (mengikuti token asli).
- **Halaman peserta (quiz):** layout single-column, terpusat, satu soal atau satu grup soal per layar — mengurangi beban kognitif dan membantu peserta fokus pada satu hal di satu waktu (relevan untuk validitas hasil tes psikologi).
- **Halaman admin:** layout dashboard konvensional (sidebar + content area), boleh lebih padat karena penggunanya adalah staff yang familiar dengan sistem.
- Whitespace digunakan generous di sisi peserta — hindari halaman terasa penuh sesak yang bisa menambah kecemasan saat tes.

```
Halaman Publik (Quiz)                 Halaman Admin (Dashboard)
┌─────────────────────┐               ┌────┬──────────────────┐
│      Progress        │               │Side│   Header + Info  │
│                       │               │bar │                  │
│    [ Satu Soal ]      │               │    │  ┌────┬────┐     │
│                       │               │Menu│  │Card│Card│     │
│   [ Opsi Jawaban ]    │               │    │  └────┴────┘     │
│                       │               │    │  Tabel / Grafik  │
│   [ Lanjut → ]        │               │    │                  │
└─────────────────────┘               └────┴──────────────────┘
```

---

## 5. Bentuk & Elevasi

- **Roundedness:** level 2 (rounded) — tombol dan input pakai radius `0.5rem`, card/container lebih besar pakai `0.75rem`–`1rem`. Kesan ramah dan modern, tidak tajam/formal berlebihan.
- **Elevasi** dicapai lewat *tonal layering* (perbedaan warna surface-container) dan outline tipis — **bukan drop shadow tebal**. Ini menjaga tampilan tetap flat, bersih, dan tidak "berat" secara visual, cocok untuk sesi tes yang berdurasi panjang (mengurangi visual fatigue).

---

## 6. Komponen Kunci

### 6.1 Tombol
- **Primary** (`#8E00D8`, teks putih) — aksi utama: "Lanjut", "Kirim Jawaban", "Mulai Tes".
- **Secondary** (outline hitam/`on-surface`, transparan) — aksi sekunder: "Kembali", "Simpan Draft".
- Label tombol pakai **kata kerja aktif** dan jelas apa yang terjadi — bukan generik seperti "Submit", tapi "Kirim Jawaban" atau "Selesaikan Tes".

### 6.2 Kartu Soal
- Background `surface-container`, border tipis `outline-variant`, radius besar (`1rem`).
- Nomor soal + progress ("Soal 3 dari 20") ditampilkan sebagai informasi navigasi, bukan tekanan waktu — hindari counter yang terasa seperti hitung mundur kecuali memang time-boxed dan peserta sudah diberi tahu sejak awal (transparansi penuh sebelum tes dimulai, sesuai prinsip informed consent).

### 6.3 Badge & Chip
- Pakai `tertiary` (`#A500A3`) untuk status non-evaluatif: "Belum Dikerjakan", "Selesai", "Draft".
- Jangan pakai badge warna evaluatif (mis. "Bagus"/"Kurang") di sisi peserta — feedback nilai hanya muncul di sisi admin/laporan, sesuai etika bahwa peserta pre-test/post-test biasanya tidak diberi tahu skor mentahnya secara langsung tanpa konteks dari asisten/psikolog.

### 6.4 Input & Form
- Border jelas, padding cukup besar (nyaman disentuh di mobile).
- Halaman token input (auth publik) didesain sederhana, satu kolom, satu CTA — tanpa elemen distraksi, karena ini titik pertama peserta masuk ke sistem dan harus terasa jelas & terpercaya.

### 6.5 Feedback & Empty State
- Pesan error ditulis jelas dan actionable dari sudut pandang sistem, bukan menyalahkan peserta: contoh "Token tidak ditemukan. Periksa kembali kode yang diberikan asisten lab." — bukan "Token salah!".
- Tidak ada micro-copy yang terkesan menghakimi kecepatan/ketepatan peserta menjawab.

---

## 7. Prinsip Etika Psikologi dalam Desain

1. **Informed consent secara visual** — sebelum tes dimulai, tampilkan halaman ringkasan singkat (tujuan tes, estimasi durasi, kerahasiaan data) dengan tombol konfirmasi eksplisit, bukan langsung lempar ke soal pertama.
2. **Tidak ada dark pattern** — tidak ada tombol "Lanjut" yang di-highlight secara manipulatif untuk mempercepat peserta melewati soal tanpa membaca, tidak ada elemen yang membuat peserta terburu-buru secara artifisial.
3. **Netralitas visual pada soal** — khususnya untuk skala psikometrik (mis. Likert), semua pilihan diberi bobot visual yang **sama persis** (ukuran, warna, posisi) supaya tidak ada bias visual yang mempengaruhi pilihan jawaban peserta.
4. **Privasi terlihat, bukan tersembunyi** — indikator "data Anda bersifat rahasia dan hanya digunakan untuk keperluan praktikum" ditampilkan sebagai elemen desain (ikon gembok/badge), bukan disembunyikan di footer kecil.
5. **Aksesibilitas sebagai etika, bukan fitur tambahan** — kontras warna, ukuran teks, dan navigasi keyboard bukan "nice to have", karena peserta tes seharusnya tidak gagal menjawab karena hambatan teknis desain, bukan karena kemampuan yang diukur.
6. **Playful di tempat yang tepat** — ilustrasi, warna cerah, dan micro-interaction ditempatkan di titik non-kritis (landing page, halaman "Terima kasih sudah mengerjakan", halaman admin) — bukan di tengah soal yang butuh fokus dan netralitas.

---

## 8. Motion

- Gunakan motion minimal dan bermakna: transisi antar soal (fade/slide halus, <200ms), konfirmasi saat jawaban tersimpan (checkmark singkat).
- Hindari animasi dekoratif berulang di setiap elemen (mis. semua card hover-bounce) — cukup satu momen halus yang menandai perpindahan soal, supaya tidak mengalihkan fokus peserta dari isi tes.
- Hormati preferensi `prefers-reduced-motion` peserta.