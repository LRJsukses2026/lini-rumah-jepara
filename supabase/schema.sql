-- =====================================================================
-- Jejak Harian: skema database untuk Supabase
-- Cara pakai: buka Supabase > SQL Editor > New query > tempel seluruh isi
-- file ini > klik Run. Aman dijalankan ulang.
-- =====================================================================

-- Catatan harian (satu baris per tanggal)
create table if not exists public.entries (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  entry_date  date not null,
  mood        smallint check (mood between 1 and 5),
  gratitude   text,
  lesson      text,
  plan        text,
  activities  jsonb not null default '[]'::jsonb,
  created_at  timestamptz not null default now(),
  unique (user_id, entry_date)
);

-- Target dan kebiasaan
create table if not exists public.goals (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name        text not null,
  category    text,
  per_week    smallint not null default 7 check (per_week between 1 and 7),
  deadline    date,
  archived    boolean not null default false,
  created_at  timestamptz not null default now()
);

-- Centang harian untuk target
create table if not exists public.goal_checks (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  goal_id     uuid not null references public.goals(id) on delete cascade,
  check_date  date not null,
  unique (goal_id, check_date)
);

-- Transaksi keuangan (type: 'masuk' = pemasukan, 'keluar' = pengeluaran)
-- Untuk pemasukan, kolom category berisi sumber pemasukan (Gaji, Usaha, dst.)
create table if not exists public.transactions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  type        text not null check (type in ('masuk', 'keluar')),
  amount      bigint not null check (amount > 0),
  category    text not null,
  wallet      text,
  trx_date    date not null,
  note        text,
  created_at  timestamptz not null default now()
);
create index if not exists transactions_user_date_idx on public.transactions (user_id, trx_date desc);

-- Perpustakaan e-book beserta halaman terakhir dibaca
create table if not exists public.books (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title         text not null,
  author        text,
  file_path     text not null,
  file_type     text not null check (file_type in ('pdf', 'epub')),
  total_pages   int,
  current_page  int not null default 0,
  current_cfi   text,
  last_read_at  timestamptz,
  created_at    timestamptz not null default now()
);

-- Jumlah halaman dibaca per hari
create table if not exists public.reading_log (
  user_id   uuid not null default auth.uid() references auth.users(id) on delete cascade,
  log_date  date not null,
  pages     int not null default 0,
  primary key (user_id, log_date)
);

-- Pengaturan pribadi (anggaran bulanan dan target tabungan)
create table if not exists public.settings (
  user_id         uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  monthly_budget  bigint not null default 0,
  savings_target  bigint not null default 0
);

-- ---------------------------------------------------------------------
-- Keamanan: setiap pengguna hanya bisa melihat dan mengubah datanya sendiri
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['entries','goals','goal_checks','transactions','books','reading_log','settings'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "milik sendiri" on public.%I', t);
    execute format(
      'create policy "milik sendiri" on public.%I for all to authenticated
         using (user_id = (select auth.uid()))
         with check (user_id = (select auth.uid()))', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- Penyimpanan e-book: bucket privat, satu folder per pengguna
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit)
values ('ebooks', 'ebooks', false, 52428800)
on conflict (id) do nothing;

drop policy if exists "ebooks baca milik sendiri"   on storage.objects;
drop policy if exists "ebooks unggah milik sendiri" on storage.objects;
drop policy if exists "ebooks ubah milik sendiri"   on storage.objects;
drop policy if exists "ebooks hapus milik sendiri"  on storage.objects;

create policy "ebooks baca milik sendiri" on storage.objects for select to authenticated
  using (bucket_id = 'ebooks' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "ebooks unggah milik sendiri" on storage.objects for insert to authenticated
  with check (bucket_id = 'ebooks' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "ebooks ubah milik sendiri" on storage.objects for update to authenticated
  using (bucket_id = 'ebooks' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "ebooks hapus milik sendiri" on storage.objects for delete to authenticated
  using (bucket_id = 'ebooks' and (storage.foldername(name))[1] = (select auth.uid())::text);
