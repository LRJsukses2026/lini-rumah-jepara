# Jejak Harian: panduan pemasangan

Aplikasi ini berupa website yang bisa dipasang di layar utama HP (PWA). Datamu disimpan online di akun Supabase milikmu sendiri, jadi catatan di HP dan laptop selalu sama.

Yang dibutuhkan: akun **GitHub**, **Supabase**, dan **Vercel** (semuanya punya paket gratis). Total waktu sekitar 20 menit.

## Isi folder

| File | Fungsi |
|---|---|
| `index.html`, `style.css`, `app.js` | Aplikasi |
| `config.js` | **Satu-satunya file yang perlu kamu isi** (alamat dan kunci Supabase) |
| `manifest.webmanifest`, `sw.js`, `icons/` | Agar bisa dipasang seperti aplikasi |
| `supabase/schema.sql` | Membuat tabel dan aturan keamanan di Supabase |

## Langkah 1. Siapkan Supabase (database, login, penyimpanan buku)

1. Daftar di supabase.com, lalu klik **New project**. Beri nama bebas (misalnya `jejak`), buat kata sandi database (simpan), pilih wilayah terdekat (misalnya Singapore).
2. Tunggu project selesai dibuat. Buka menu **SQL Editor** > **New query**, tempel seluruh isi `supabase/schema.sql`, lalu klik **Run**. Harus muncul pesan sukses tanpa error.
3. Buka **Project Settings > API** (di tampilan baru bisa bernama **API Keys**). Salin dua hal:
   - **Project URL**
   - **anon public key** (di tampilan baru disebut *publishable key*)
4. Buka file `config.js`, ganti `ISI_URL_PROJECT_SUPABASE` dan `ISI_KUNCI_PUBLIK_SUPABASE` dengan dua nilai itu.

> Jangan pernah memasukkan kunci **service_role** atau **secret** ke aplikasi. Kunci publik aman berada di aplikasi karena setiap pengguna hanya bisa membaca datanya sendiri (diatur oleh `schema.sql`).

5. (Opsional, disarankan untuk pemakaian pribadi) Di menu **Authentication**, bagian pengaturan **Email**, matikan **Confirm email** supaya kamu bisa langsung masuk setelah mendaftar. Jika dibiarkan aktif, kamu harus klik tautan konfirmasi di email dulu.

## Langkah 2. Simpan kode di GitHub

1. Daftar di github.com, klik **New repository**, beri nama `jejak-harian`, pilih **Private**, lalu **Create repository**.
2. Klik **uploading an existing file**, seret **semua isi folder** ini (termasuk folder `icons` dan `supabase`), lalu klik **Commit changes**.

## Langkah 3. Tayangkan lewat Vercel

1. Daftar di vercel.com dengan **Continue with GitHub**.
2. Klik **Add New > Project**, pilih repositori `jejak-harian`, lalu **Import**.
3. Biarkan pengaturan bawaan (**Framework Preset: Other**, kolom Build Command dan Output Directory dikosongkan). Klik **Deploy**.
4. Setelah selesai kamu mendapat alamat tetap, misalnya `https://jejak-harian.vercel.app`. Buka alamat itu.
5. Kembali ke Supabase, buka **Authentication > URL Configuration**, isi **Site URL** dengan alamat Vercel tadi. Ini diperlukan agar tautan email (konfirmasi, reset) mengarah ke aplikasimu.

## Langkah 4. Pasang di HP dan laptop

- **Android (Chrome):** buka alamatnya, ketuk menu ⋮, lalu **Instal aplikasi** atau **Tambahkan ke layar utama**.
- **iPhone (Safari):** buka alamatnya, ketuk tombol **Bagikan**, lalu **Tambah ke Layar Utama**.
- **Laptop (Chrome atau Edge):** klik ikon pasang di kolom alamat.

Lalu buka aplikasinya, pilih **Daftar**, dan buat akunmu. Di perangkat lain, cukup **Masuk** dengan email dan kata sandi yang sama.

## Memperbarui aplikasi

Ubah file di GitHub (atau unggah versi baru dari saya), lalu Vercel otomatis menayangkan versi terbaru dalam beberapa menit.

## Cara kerja fitur utama

- **Catatan harian, target, keuangan:** disimpan di Supabase begitu kamu menekan Simpan.
- **E-book:** unggah PDF atau EPUB lewat menu Buku atau tombol +. File disimpan privat di akunmu. Halaman terakhir dibaca disimpan otomatis dan tampil di Beranda serta menu Buku. Buku yang pernah dibuka juga tersimpan di perangkat, jadi bisa dibuka lagi tanpa mengunduh ulang.
- **Nomor halaman EPUB** adalah perkiraan (EPUB tidak punya halaman tetap seperti PDF).
- **Sumber pemasukan dan kategori:** bisa diubah di `config.js` (`INCOME_SOURCES`, `EXPENSE_CATEGORIES`, `ACTIVITY_CATEGORIES`, `WALLETS`).
- **Anggaran bulanan dan target tabungan:** diatur di Pengaturan. Tabungan dihitung dari pengeluaran berkategori **Tabungan**.
- **Cadangan:** Pengaturan > Unduh cadangan data (JSON).

## Batas paket gratis yang perlu diketahui

- Project Supabase gratis akan **dijeda otomatis jika tidak ada aktivitas selama sekitar seminggu**. Data tetap aman, dan kamu bisa memulihkannya dengan satu klik lewat dashboard Supabase. Jika dipakai rutin, ini tidak akan terjadi.
- Kapasitas database dan penyimpanan file di paket gratis terbatas, dan ukuran satu file juga dibatasi (di aplikasi ini 50 MB, ubah lewat `MAX_FILE_MB`). Cek angka terbaru di dashboard Supabase bagian **Usage** atau **Billing**.
- Tanpa internet, aplikasi tetap bisa terbuka, tetapi data baru perlu koneksi untuk dimuat dan disimpan.

## Jika ada masalah

| Gejala | Penyebab dan solusi |
|---|---|
| "Aplikasi belum terhubung ke Supabase" | `config.js` belum diisi, atau file yang di-upload ke GitHub belum yang terbaru. |
| Muncul "relation ... does not exist" atau "permission denied" | `schema.sql` belum dijalankan sampai selesai. Jalankan ulang (aman diulang). |
| Gagal mengunggah buku, menyebut "row-level security" | Bagian penyimpanan di `schema.sql` belum terpasang. Jalankan ulang file itu. |
| "Email belum dikonfirmasi" | Klik tautan di email konfirmasi, atau matikan **Confirm email** (Langkah 1 nomor 5). |
| Buku tidak mau terbuka | Pastikan internet aktif saat pertama kali membuka (pustaka pembaca dimuat dari internet). |
| Tampilan tidak berubah setelah update | Tutup aplikasi sepenuhnya lalu buka lagi, atau muat ulang halaman. |

## Keamanan data keuangan

- Gunakan kata sandi yang kuat dan unik.
- Biarkan repositori GitHub tetap **Private**.
- Lakukan cadangan JSON secara berkala.
