// Pengaturan aplikasi Jejak Harian.
// Isi dua baris pertama setelah project Supabase dibuat (lihat PANDUAN.md).
window.JEJAK_CONFIG = {
  SUPABASE_URL: 'https://qiqgxwyfefwolubatmjq.supabase.co',
  SUPABASE_ANON_KEY: 'sb_publishable_vXg1omohSYzH87zD9lCb3Q_aA3m-GG4',

  // Boleh diubah sesuai kebutuhan
  INCOME_SOURCES: ['Gaji', 'Usaha', 'Freelance', 'Investasi', 'Lainnya'],
  EXPENSE_CATEGORIES: ['Makan', 'Transport', 'Tagihan', 'Belanja', 'Hiburan', 'Tabungan', 'Traveling', 'Lainnya'],
  ACTIVITY_CATEGORIES: ['Belajar', 'Kerja', 'Olahraga', 'Ibadah', 'Lainnya'],
  WALLETS: ['Tunai', 'Rekening bank', 'E-wallet'],
  STUDY_TARGET_MIN: 480,   // target waktu belajar per minggu (menit)
  MAX_FILE_MB: 50          // batas ukuran satu e-book (MB)
};
