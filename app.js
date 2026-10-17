(function () {
'use strict';

/* ================= Dasar ================= */
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const CFG = window.JEJAK_CONFIG || {};
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
const pad = n => String(n).padStart(2, '0');
const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseD = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const today = () => iso(new Date());
const monday = d => { const x = new Date(d); x.setDate(x.getDate() - (x.getDay() + 6) % 7); x.setHours(0, 0, 0, 0); return x; };
const ymOf = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
const DAYS = ['Min','Sen','Sel','Rab','Kam','Jum','Sab'];
const DAYF = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
const MONTHS = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
const MON_S = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
const MOODS = ['Sulit','Kurang','Biasa','Baik','Hebat'], MOOD_E = ['😞','😕','😐','🙂','😄'];
const rp = n => 'Rp ' + Math.round(n).toLocaleString('id-ID');
const rpc = n => Math.abs(n) >= 1e6 ? (n < 0 ? '-' : '') + 'Rp ' + (Math.round(Math.abs(n) / 1e4) / 100).toString().replace('.', ',') + ' jt' : rp(n);
const num = s => Number(String(s == null ? '' : s).replace(/\D/g, '')) || 0;
const f1 = v => (Math.round(v * 10) / 10).toString().replace('.', ',');
const fmtMin = m => m >= 60 ? `${Math.floor(m / 60)}j${m % 60 ? ' ' + (m % 60) + 'm' : ''}` : `${m} mnt`;
const uuid = () => (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : 'id' + Date.now() + Math.random().toString(16).slice(2);
const COLORS = ['var(--green)', 'var(--mint)', 'var(--lime)', 'var(--coral)', '#9A9A9A'];
const ICON = { Gaji:'💼', Usaha:'🏪', Freelance:'💻', Investasi:'📈', Makan:'🍜', Transport:'⛽', Tagihan:'💡', Belanja:'🛍️', Hiburan:'🎬', Tabungan:'🐖', Lainnya:'🧾' };
const C = 2 * Math.PI * 68;
const setRing = (id, pct) => { $(id).style.strokeDashoffset = C * (1 - Math.min(100, Math.max(0, pct)) / 100); };

let tt;
function toast(m, ms) { const t = $('#toast'); t.textContent = m; t.classList.add('show'); clearTimeout(tt); tt = setTimeout(() => t.classList.remove('show'), ms || 1900); }

/* ================= Supabase ================= */
const configured = CFG.SUPABASE_URL && CFG.SUPABASE_ANON_KEY && !/^ISI_/.test(CFG.SUPABASE_URL) && !/^ISI_/.test(CFG.SUPABASE_ANON_KEY);
let sb = null;
if (configured && window.supabase) sb = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY);

const S = { user: null, entries: [], goals: [], checks: [], trx: [], books: [], reading: [], settings: {}, moodOf: {} };

async function q(p) { const r = await p; if (r.error) { toast('Gagal: ' + r.error.message, 3500); throw r.error; } return r.data; }

async function loadAll() {
  const since = iso(addDays(new Date(), -400));
  const [en, go, ch, tr, bk, rl, st] = await Promise.all([
    sb.from('entries').select('*').gte('entry_date', since).order('entry_date', { ascending: false }),
    sb.from('goals').select('*').eq('archived', false).order('created_at'),
    sb.from('goal_checks').select('*').gte('check_date', since),
    sb.from('transactions').select('*').gte('trx_date', since).order('trx_date', { ascending: false }).order('created_at', { ascending: false }),
    sb.from('books').select('*').order('created_at', { ascending: false }),
    sb.from('reading_log').select('*').gte('log_date', since),
    sb.from('settings').select('*').maybeSingle()
  ]);
  const bad = [en, go, ch, tr, bk, rl, st].find(r => r.error);
  if (bad) toast('Gagal memuat data: ' + bad.error.message, 4000);
  S.entries = en.data || []; S.goals = go.data || []; S.checks = ch.data || []; S.trx = tr.data || [];
  S.books = bk.data || []; S.reading = rl.data || []; S.settings = st.data || {};
  const withRead = S.books.filter(b => b.last_read_at).sort((a, b) => b.last_read_at.localeCompare(a.last_read_at));
  lastBookId = (withRead[0] || S.books[0] || {}).id || null;
}

/* ================= Navigasi ================= */
const screens = ['masuk','beranda','target','keuangan','laporan','buku','baca','catat','transaksi','riwayat','pengaturan'];
const tabs = ['beranda','target','keuangan','laporan','buku'];
let stack = ['masuk'];

function render() {
  const cur = stack[stack.length - 1];
  if (cur !== 'baca') closeReader();
  screens.forEach(s => $('#s-' + s).hidden = (s !== cur));
  $('#nav').hidden = !tabs.includes(cur) || !S.user;
  $$('#nav [data-go]').forEach(b => b.setAttribute('aria-current', b.dataset.go === cur ? 'page' : 'false'));
  $('#main').scrollTop = 0; closeSheet();
}
function go(name) {
  if (!S.user && name !== 'masuk') return;
  if (tabs.includes(name) || name === 'masuk') stack = [name]; else stack.push(name);
  render();
}
function back() { if (stack.length > 1) stack.pop(); render(); }

function openSheet() { $('#scrim').hidden = false; $('#sheet').hidden = false; }
function closeSheet() { $('#scrim').hidden = true; $('#sheet').hidden = true; }

document.addEventListener('click', e => {
  const t = e.target;
  let el;
  if ((el = t.closest('[data-go]'))) return go(el.dataset.go);
  if (t.closest('[data-back]')) return back();
  if ((el = t.closest('[data-add]'))) {
    closeSheet();
    const k = el.dataset.add;
    if (k === 'catat') openCatat(today()); else if (k === 'buku') { go('buku'); $('#file').click(); } else openTrx(k);
    return;
  }
  if ((el = t.closest('[data-trx]'))) return openTrx(el.dataset.trx);
  if ((el = t.closest('[data-read]'))) return openBook(el.dataset.read);
  if ((el = t.closest('[data-goal]'))) return safe(() => toggleGoal(el.dataset.goal));
  if ((el = t.closest('[data-delgoal]'))) return safe(() => delGoal(el.dataset.delgoal));
  if ((el = t.closest('[data-trxid]'))) return safe(() => delTrx(el.dataset.trxid));
  if ((el = t.closest('[data-date]'))) return openCatat(el.dataset.date);
  if ((el = t.closest('[data-delact]'))) { cActs.splice(Number(el.dataset.delact), 1); return renderActs(); }
});
$('#plus').addEventListener('click', openSheet);
$('#scrim').addEventListener('click', closeSheet);
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeSheet(); });

async function safe(fn) { try { await fn(); } catch (e) { console.warn(e); try { await loadAll(); renderAll(); } catch (_) {} } }

/* ================= Grafik batang ================= */
function bars(id, o) {
  const el = $(id); el.innerHTML = '';
  o.vals.forEach((v, i) => {
    const b = document.createElement('button');
    b.className = 'col' + (i === o.sel ? ' on' : ''); b.setAttribute('aria-label', o.aria(i));
    const h = v == null ? 8 : (o.max ? Math.max(v > 0 ? 5 : 2, v / o.max * 100) : 2);
    b.innerHTML = `<span class="plot"><span class="bar${v == null ? ' nil' : ''}" style="height:${h}%"></span></span><em>${esc(o.labels[i])}</em>`;
    b.addEventListener('click', () => { o.sel = i; bars(id, o); o.onSel(i); });
    el.appendChild(b);
  });
  o.onSel(o.sel);
}

/* ================= Data turunan ================= */
function rebuildDerived() {
  S.moodOf = {}; S.entries.forEach(e => { if (e.mood) S.moodOf[e.entry_date] = e.mood; });
}
function activityCount(date) {
  return (S.entries.some(e => e.entry_date === date) ? 1 : 0) + S.checks.filter(c => c.check_date === date).length;
}
function activeSet() { const s = new Set(S.entries.map(e => e.entry_date)); S.checks.forEach(c => s.add(c.check_date)); return s; }
function streak() {
  const set = activeSet(); let d = new Date(); if (!set.has(iso(d))) d = addDays(d, -1);
  let n = 0; while (set.has(iso(d))) { n++; d = addDays(d, -1); } return n;
}
const userName = () => (S.user && S.user.user_metadata && S.user.user_metadata.name) || ((S.user && S.user.email) || 'Teman').split('@')[0];
const sumT = (list, type, cat) => list.filter(t => t.type === type && (!cat || t.category === cat)).reduce((a, t) => a + Number(t.amount), 0);

/* ================= Render semua ================= */
function renderAll() {
  rebuildDerived(); renderHome(); renderTarget(); renderMoney(); showPeriod(period); renderBooks(); renderHistory(); renderSettings();
}

/* ---- Beranda ---- */
function renderHome() {
  const name = userName();
  $('#hello').textContent = 'Halo, ' + name;
  $$('.avatar').forEach(a => a.textContent = (name[0] || 'H').toUpperCase());
  $('#dateNow').textContent = new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const td = today(), goals = S.goals;
  const done = goals.filter(g => S.checks.some(c => c.goal_id === g.id && c.check_date === td)).length;
  const p = goals.length ? Math.round(done / goals.length * 100) : 0;
  $('#goalN').textContent = goals.length; $('#doneN').textContent = done; $('#streakN').textContent = streak() + ' hari';
  $('#ringHomeTxt').textContent = p + '%'; setRing('#ringHome', p);
  $('#todoCount').textContent = `${done} dari ${goals.length}`;
  $('#todos').innerHTML = goals.length ? goals.map(g => {
    const on = S.checks.some(c => c.goal_id === g.id && c.check_date === td);
    return `<button class="row" role="checkbox" aria-checked="${on}" data-goal="${g.id}"><span class="box"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></span><span class="lbl">${esc(g.name)}</span></button>`;
  }).join('') : '<p class="empty">Belum ada target. Tambahkan di menu Target.</p>';

  const wk = iso(monday(new Date()));
  const mins = S.entries.filter(e => e.entry_date >= wk).flatMap(e => e.activities || []).filter(a => a.cat === 'Belajar').reduce((a, b) => a + (Number(b.min) || 0), 0);
  $('#studyVal').textContent = `${Math.floor(mins / 60)}j ${mins % 60}m`;
  $('#studyBar').style.width = Math.min(100, mins / (CFG.STUDY_TARGET_MIN || 480) * 100) + '%';

  const mt = S.trx.filter(t => t.trx_date.startsWith(ymOf(new Date()))), inc = sumT(mt, 'masuk'), out = sumT(mt, 'keluar');
  $('#saldoVal').textContent = rpc(inc - out);
  $('#saldoBar').style.width = (inc ? Math.min(100, Math.max(0, (inc - out) / inc * 100)) : 0) + '%';
  $('#saldoSub').textContent = inc ? 'Dari pemasukan ' + rpc(inc) : 'Belum ada pemasukan';

  const set = activeSet(), mon = monday(new Date());
  $('#week').innerHTML = [0, 1, 2, 3, 4, 5, 6].map(i => {
    const d = addDays(mon, i), k = iso(d), isT = k === td, dn = set.has(k);
    return `<div class="day${isT ? ' now' : ''}"><span class="dot${dn ? ' done' : ''}${isT && !dn ? ' today' : ''}">${dn ? '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>' : ''}</span>${DAYS[d.getDay()]}</div>`;
  }).join('');

  const days7 = [...Array(7)].map((_, i) => addDays(new Date(), i - 6));
  const vals = days7.map(d => S.moodOf[iso(d)] || null);
  const names = days7.map(d => DAYF[d.getDay()]);
  let sel = 6; for (let i = 6; i >= 0; i--) if (vals[i]) { sel = i; break; }
  bars('#barsMood', { vals, labels: days7.map(d => DAYS[d.getDay()]), max: 5, sel,
    aria: i => `${names[i]}: ${vals[i] ? MOODS[vals[i] - 1] : 'belum diisi'}`,
    onSel: i => $('#moodSel').textContent = vals[i] ? `${names[i]}: ${MOODS[vals[i] - 1]}` : `${names[i]}: belum diisi` });
}

async function toggleGoal(id) {
  const td = today(), ex = S.checks.find(c => c.goal_id === id && c.check_date === td);
  if (ex) {
    S.checks = S.checks.filter(c => c !== ex); rebuildDerived(); renderHome(); renderTarget();
    if (ex.id) await q(sb.from('goal_checks').delete().eq('id', ex.id));
  } else {
    const tmp = { goal_id: id, check_date: td }; S.checks.push(tmp); renderHome(); renderTarget();
    const r = await q(sb.from('goal_checks').insert({ user_id: S.user.id, goal_id: id, check_date: td }).select().single());
    Object.assign(tmp, r);
  }
}
async function delGoal(id) {
  const g = S.goals.find(x => x.id === id); if (!g || !confirm(`Hapus target “${g.name}”?`)) return;
  await q(sb.from('goals').delete().eq('id', id));
  S.goals = S.goals.filter(x => x.id !== id); S.checks = S.checks.filter(c => c.goal_id !== id); renderAll();
}

/* ---- Target ---- */
function renderTarget() {
  const wk = iso(monday(new Date()));
  let html = S.goals.map((g, i) => {
    const n = new Set(S.checks.filter(c => c.goal_id === g.id && c.check_date >= wk).map(c => c.check_date)).size;
    const pc = Math.min(100, n / g.per_week * 100), col = pc >= 70 ? 'var(--green)' : pc >= 40 ? 'var(--lime)' : 'var(--coral)';
    const due = g.deadline ? ` · tenggat ${parseD(g.deadline).getDate()} ${MON_S[parseD(g.deadline).getMonth()]}` : '';
    return `<div class="src"><div class="t"><span>${esc(g.name)}</span><span class="goalx"><em>${n} dari ${g.per_week} hari${due}</em><button class="x" data-delgoal="${g.id}" aria-label="Hapus target ${esc(g.name)}">✕</button></span></div><div class="pbar"><i style="width:${pc}%;background:${col}"></i></div></div>`;
  }).join('');
  const target = Number(S.settings.savings_target) || 0;
  if (target) {
    const saved = sumT(S.trx, 'keluar', 'Tabungan');
    html += `<div class="src"><div class="t"><span>Tabungan ${rpc(target)}</span><em>${rpc(saved)}</em></div><div class="pbar"><i style="width:${Math.min(100, saved / target * 100)}%;background:var(--mint)"></i></div></div>`;
  }
  $('#goalList').innerHTML = html || '<p class="empty">Belum ada target. Tekan “+ Target baru” untuk mulai.</p>';
}
$('#toggleForm').addEventListener('click', () => { const f = $('#formTarget'); f.hidden = !f.hidden; });
$('#saveTarget').addEventListener('click', () => safe(async () => {
  const name = $('#gName').value.trim(); if (!name) return toast('Isi nama target dulu');
  const r = await q(sb.from('goals').insert({ user_id: S.user.id, name, category: $('#gCat').value, per_week: Number($('#gFreq').value), deadline: $('#gDue').value || null }).select().single());
  S.goals.push(r); $('#gName').value = ''; $('#gDue').value = ''; $('#formTarget').hidden = true; renderAll(); toast('Target disimpan');
}));

/* ---- Keuangan ---- */
let viewMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
function listRows(items, total) {
  return items.map(([name, amt], i) => `<div class="src"><div class="t"><span><s style="background:${COLORS[i % 5]}"></s>${esc(name)}<em>${total ? Math.round(amt / total * 100) : 0}%</em></span><b>${rp(amt)}</b></div><div class="pbar"><i style="width:${total ? amt / total * 100 : 0}%;background:${COLORS[i % 5]}"></i></div></div>`).join('');
}
function groupBy(list, type) {
  const m = {}; list.filter(t => t.type === type).forEach(t => m[t.category] = (m[t.category] || 0) + Number(t.amount));
  return Object.entries(m).sort((a, b) => b[1] - a[1]);
}
function renderMoney() {
  const ym = ymOf(viewMonth), now = new Date();
  $('#monthLbl').textContent = MONTHS[viewMonth.getMonth()] + ' ' + viewMonth.getFullYear();
  $('#nextM').disabled = ym >= ymOf(now); $('#nextM').style.opacity = $('#nextM').disabled ? .35 : 1;
  const list = S.trx.filter(t => t.trx_date.startsWith(ym)), inc = sumT(list, 'masuk'), out = sumT(list, 'keluar');
  $('#cfIn').textContent = rp(inc); $('#cfOut').textContent = rp(out);
  const bud = Number(S.settings.monthly_budget) || 0;
  $('#cfBud').textContent = bud ? rp(bud) : 'Belum diatur';
  $('#ringMoneyTxt').textContent = rpc(inc - out); setRing('#ringMoney', inc ? out / inc * 100 : 0);
  $('#budVal').textContent = bud ? rpc(out) : rpc(out);
  $('#budBar').style.width = (bud ? Math.min(100, out / bud * 100) : 0) + '%';
  $('#budSub').textContent = bud ? `Terpakai dari ${rpc(bud)}` : 'Atur anggaran di Pengaturan';
  const sav = Number(S.settings.savings_target) || 0, saved = sumT(S.trx, 'keluar', 'Tabungan');
  $('#savVal').textContent = rpc(saved); $('#savBar').style.width = (sav ? Math.min(100, saved / sav * 100) : 0) + '%';
  $('#savSub').textContent = sav ? `Target ${rpc(sav)}` : 'Atur target di Pengaturan';

  const src = groupBy(list, 'masuk');
  $('#srcList').innerHTML = src.length ? listRows(src, inc) : '<p class="empty">Belum ada pemasukan bulan ini.</p>';
  const cats = groupBy(list, 'keluar');
  $('#catList').innerHTML = cats.length ? listRows(cats, out) : '<p class="empty">Belum ada pengeluaran bulan ini.</p>';
  $('#trxList').innerHTML = list.length ? list.slice(0, 30).map(t => {
    const d = parseD(t.trx_date), isIn = t.type === 'masuk';
    return `<div class="trx" data-trxid="${t.id}"><span class="ic">${ICON[t.category] || '🧾'}</span><div><b>${esc(t.note || t.category)}</b><small>${esc(t.category)}, ${d.getDate()} ${MON_S[d.getMonth()]}${t.wallet ? ' · ' + esc(t.wallet) : ''}</small></div><span class="am ${isIn ? 'in' : 'out'}">${isIn ? '+' : '-'}${rp(t.amount)}</span></div>`;
  }).join('') : '<p class="empty">Belum ada transaksi bulan ini.</p>';

  const days7 = [...Array(7)].map((_, i) => addDays(now, i - 6)), v = days7.map(d => sumT(S.trx.filter(t => t.trx_date === iso(d)), 'keluar'));
  const tot = v.reduce((a, b) => a + b, 0), mx = Math.max(...v, 1);
  bars('#barsExp', { vals: v, labels: days7.map(d => DAYS[d.getDay()]), max: mx, sel: 6,
    aria: i => `${DAYF[days7[i].getDay()]}: ${rp(v[i])}`,
    onSel: i => { $('#expSel').textContent = rp(v[i]); $('#expLbl').textContent = `${DAYF[days7[i].getDay()]}${i === 6 ? ' (hari ini)' : ''}. Total 7 hari ${rp(tot)}`; } });
}
$('#prevM').addEventListener('click', () => { viewMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1); renderMoney(); });
$('#nextM').addEventListener('click', () => { if (ymOf(viewMonth) < ymOf(new Date())) { viewMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1); renderMoney(); } });
async function delTrx(id) {
  const t = S.trx.find(x => x.id === id); if (!t || !confirm(`Hapus transaksi ${t.category} ${rp(t.amount)}?`)) return;
  await q(sb.from('transactions').delete().eq('id', id)); S.trx = S.trx.filter(x => x.id !== id); renderAll(); toast('Transaksi dihapus');
}

/* ---- Form transaksi ---- */
let trxType = 'keluar', trxCat = null;
function openTrx(t) { setType(t); $('#amt').value = ''; $('#tgl').value = today(); $('#tnote').value = ''; go('transaksi'); }
function setType(t) {
  trxType = t; const inc = t === 'masuk';
  $$('#trxType button').forEach(b => b.setAttribute('aria-pressed', b.dataset.t === t ? 'true' : 'false'));
  $('#catLabel').textContent = inc ? 'Sumber pemasukan' : 'Kategori pengeluaran';
  $('#walLabel').textContent = inc ? 'Masuk ke' : 'Dibayar dari';
  $('#saveTrx').textContent = inc ? 'Simpan pemasukan' : 'Simpan pengeluaran';
  const list = inc ? CFG.INCOME_SOURCES : CFG.EXPENSE_CATEGORIES; trxCat = list[0];
  $('#catChips').innerHTML = list.map((c, i) => `<button class="cb" aria-pressed="${i === 0}">${esc(c)}</button>`).join('');
}
$('#catChips').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  trxCat = b.textContent; $$('#catChips button').forEach(x => x.setAttribute('aria-pressed', x === b ? 'true' : 'false'));
});
$$('#trxType button').forEach(b => b.addEventListener('click', () => setType(b.dataset.t)));
function bindMoneyInput(el) { el.addEventListener('input', () => { const d = el.value.replace(/\D/g, ''); el.value = d ? Number(d).toLocaleString('id-ID') : ''; }); }
['#amt', '#setBud', '#setSav'].forEach(id => bindMoneyInput($(id)));
$('#saveTrx').addEventListener('click', () => safe(async () => {
  const amount = num($('#amt').value); if (!amount) return toast('Isi jumlah uang dulu');
  const r = await q(sb.from('transactions').insert({ user_id: S.user.id, type: trxType, amount, category: trxCat, wallet: $('#wal').value, trx_date: $('#tgl').value || today(), note: $('#tnote').value.trim() || null }).select().single());
  S.trx.push(r); S.trx.sort((a, b) => b.trx_date.localeCompare(a.trx_date) || String(b.created_at).localeCompare(String(a.created_at)));
  const m = trxType === 'masuk' ? 'Pemasukan disimpan' : 'Pengeluaran disimpan'; renderAll(); back(); toast(m);
}));

/* ---- Laporan ---- */
let period = 'minggu';
function avg(a) { const v = a.filter(Boolean); return v.length ? v.reduce((x, y) => x + y, 0) / v.length : null; }
function reportData(p) {
  const now = new Date();
  if (p === 'minggu') {
    const ds = [...Array(7)].map((_, i) => addDays(now, i - 6));
    return { title: 'Mood 7 hari terakhir', labels: ds.map(d => DAYS[d.getDay()]), names: ds.map(d => DAYF[d.getDay()]), vals: ds.map(d => S.moodOf[iso(d)] || null), from: iso(ds[0]), span: 7 };
  }
  if (p === 'bulan') {
    const vals = [0, 1, 2, 3].map(k => { const end = addDays(now, -7 * (3 - k)); return avg([...Array(7)].map((_, i) => S.moodOf[iso(addDays(end, -i))])); });
    return { title: 'Mood rata-rata per minggu', labels: ['Mgg 1','Mgg 2','Mgg 3','Mgg 4'], names: ['Minggu 1','Minggu 2','Minggu 3','Minggu 4'], vals, from: iso(addDays(now, -27)), span: 28 };
  }
  const y = now.getFullYear(), m = now.getMonth(), vals = [];
  for (let k = 0; k <= m; k++) vals.push(avg(S.entries.filter(e => e.entry_date.startsWith(`${y}-${pad(k + 1)}`)).map(e => e.mood)));
  return { title: 'Mood rata-rata per bulan', labels: MON_S.slice(0, m + 1), names: MONTHS.slice(0, m + 1), vals, from: `${y}-01-01`, span: 0 };
}
function showPeriod(p) {
  period = p; const o = reportData(p), n = S.entries.filter(e => e.entry_date >= o.from).length;
  $$('#tabs button').forEach(b => b.setAttribute('aria-selected', b.dataset.p === p ? 'true' : 'false'));
  $('#moodTitle').textContent = o.title;
  let text;
  if (!n) text = 'Belum ada catatan pada periode ini. Tekan tombol + di bawah untuk mulai mencatat.';
  else if (p === 'tahun') {
    const best = o.vals.reduce((bi, v, i) => v != null && (bi < 0 || v > o.vals[bi]) ? i : bi, -1);
    text = `Sepanjang ${new Date().getFullYear()} kamu mencatat ${n} hari.` + (best >= 0 ? ` Bulan dengan mood terbaik: ${o.names[best]}.` : '');
  } else {
    const a = avg(o.vals), nn = o.vals.filter(Boolean);
    text = `Dalam ${o.span} hari terakhir kamu mencatat ${n} dari ${o.span} hari.` + (p === 'minggu' && a ? ` Mood rata-rata ${f1(a)}.` : '');
    if (p === 'bulan' && nn.length > 1) text += nn[nn.length - 1] > nn[0] ? ' Mood rata-rata cenderung naik.' : nn[nn.length - 1] < nn[0] ? ' Mood rata-rata cenderung turun.' : '';
  }
  $('#summary').textContent = text;
  let sel = o.vals.length - 1; for (let i = o.vals.length - 1; i >= 0; i--) if (o.vals[i]) { sel = i; break; }
  const lbl = i => { const v = o.vals[i]; return v == null ? `${o.names[i]}: belum ada catatan` : `${o.names[i]}: ${Number.isInteger(v) ? MOODS[v - 1] : f1(v) + ' dari 5'}`; };
  bars('#barsRep', { vals: o.vals, labels: o.labels, max: 5, sel, aria: lbl, onSel: i => $('#repSel').textContent = lbl(i) });

  const cats = CFG.ACTIVITY_CATEGORIES, mins = cats.map(() => 0);
  S.entries.filter(e => e.entry_date >= o.from).forEach(e => (e.activities || []).forEach(a => { const i = cats.indexOf(a.cat); mins[i < 0 ? cats.length - 1 : i] += Number(a.min) || 0; }));
  const tot = mins.reduce((a, b) => a + b, 0);
  $('#catStack').innerHTML = tot ? `<div class="stack" role="img" aria-label="Pembagian waktu per kategori">${mins.map((m, i) => `<i style="width:${m / tot * 100}%;background:${COLORS[i % 5]}"></i>`).join('')}</div><div class="legend">${cats.map((c, i) => `<span><s style="background:${COLORS[i % 5]}"></s>${esc(c)} ${Math.round(mins[i] / tot * 100)}% (${fmtMin(mins[i])})</span>`).join('')}</div>` : '<p class="empty">Belum ada kegiatan tercatat pada periode ini.</p>';

  const start = addDays(monday(new Date()), -77), tdy = today(); let cells = '';
  for (let w = 0; w < 12; w++) for (let d = 0; d < 7; d++) {
    const k = iso(addDays(start, w * 7 + d));
    cells += k > tdy ? '<i class="fut"></i>' : `<i class="${activityCount(k) ? 'l' + Math.min(4, activityCount(k)) : ''}"></i>`;
  }
  $('#heat').innerHTML = cells;

  const ms = [5, 4, 3, 2, 1, 0].map(k => new Date(new Date().getFullYear(), new Date().getMonth() - k, 1));
  const fin = ms.map(d => { const l = S.trx.filter(t => t.trx_date.startsWith(ymOf(d))); return { l: MON_S[d.getMonth()], i: sumT(l, 'masuk'), o: sumT(l, 'keluar') }; });
  const mx = Math.max(1, ...fin.flatMap(f => [f.i, f.o]));
  $('#barsFin').innerHTML = fin.map(f => `<div class="col" role="img" aria-label="${f.l}: pemasukan ${rpc(f.i)}, pengeluaran ${rpc(f.o)}"><span class="plot"><span class="bar i" style="height:${f.i ? Math.max(4, f.i / mx * 100) : 2}%"></span><span class="bar o" style="height:${f.o ? Math.max(4, f.o / mx * 100) : 2}%"></span></span><em>${f.l}</em></div>`).join('');
  const net = fin.reduce((a, f) => a + f.i - f.o, 0) / 6;
  $('#finSub').textContent = `Selisih rata-rata ${rpc(net)} per bulan`;
}
$$('#tabs button').forEach(b => b.addEventListener('click', () => showPeriod(b.dataset.p)));
$('#exportPdf').addEventListener('click', () => window.print());

/* ---- Catat ---- */
let cDate = today(), cMood = null, cActs = [];
function openCatat(date) { cDate = date || today(); loadCatat(); go('catat'); }
function loadCatat() {
  const e = S.entries.find(x => x.entry_date === cDate);
  cMood = e ? e.mood : null; cActs = e ? JSON.parse(JSON.stringify(e.activities || [])) : [];
  $('#cDate').value = cDate; $('#cSyukur').value = (e && e.gratitude) || ''; $('#cLesson').value = (e && e.lesson) || ''; $('#cPlan').value = (e && e.plan) || '';
  renderMoodBtns(); renderActs();
}
function renderMoodBtns() { $$('#moods .mood').forEach((b, i) => b.setAttribute('aria-pressed', cMood === i + 1 ? 'true' : 'false')); }
function renderActs() {
  $('#actList').innerHTML = cActs.length ? cActs.map((a, i) => `<div class="act"><time>${esc(a.time || '')}</time><div><b>${esc(a.name)}</b><span class="tagc">${esc(a.cat)}</span></div><span class="dur">${fmtMin(Number(a.min) || 0)}</span><button class="x" data-delact="${i}" aria-label="Hapus kegiatan ${esc(a.name)}">✕</button></div>`).join('') : '<p class="empty" style="padding:14px 0 4px">Belum ada kegiatan.</p>';
}
$$('#moods .mood').forEach((b, i) => b.addEventListener('click', () => { cMood = i + 1; renderMoodBtns(); }));
$('#cDate').addEventListener('change', e => { if (e.target.value) { cDate = e.target.value; loadCatat(); } });
$('#aAdd').addEventListener('click', () => {
  const name = $('#aName').value.trim(); if (!name) return toast('Isi nama kegiatan dulu');
  cActs.push({ time: $('#aTime').value, name, cat: $('#aCat').value, min: Number($('#aMin').value) || 0 });
  cActs.sort((a, b) => (a.time || '99').localeCompare(b.time || '99'));
  $('#aName').value = ''; $('#aTime').value = ''; $('#aMin').value = ''; renderActs();
});
$('#saveEntry').addEventListener('click', () => safe(async () => {
  const g = $('#cSyukur').value.trim(), l = $('#cLesson').value.trim(), p = $('#cPlan').value.trim();
  if (!cMood && !cActs.length && !g && !l && !p) return toast('Isi sesuatu dulu sebelum menyimpan');
  const r = await q(sb.from('entries').upsert({ user_id: S.user.id, entry_date: cDate, mood: cMood, gratitude: g || null, lesson: l || null, plan: p || null, activities: cActs }, { onConflict: 'user_id,entry_date' }).select().single());
  S.entries = S.entries.filter(x => x.entry_date !== cDate); S.entries.push(r); S.entries.sort((a, b) => b.entry_date.localeCompare(a.entry_date));
  renderAll(); back(); toast('Catatan disimpan');
}));

/* ---- Riwayat ---- */
let histFilter = 'semua';
function renderHistory() {
  const term = $('#q').value.trim().toLowerCase();
  const list = S.entries.filter(e => {
    const cats = (e.activities || []).map(a => a.cat);
    if (histFilter === 'baik' && !(e.mood >= 4)) return false;
    if (histFilter !== 'semua' && histFilter !== 'baik' && !cats.includes(histFilter)) return false;
    if (!term) return true;
    return [e.gratitude, e.lesson, e.plan, ...(e.activities || []).map(a => a.name)].join(' ').toLowerCase().includes(term);
  }).slice(0, 100);
  $('#hist').hidden = !list.length; $('#noHist').hidden = !!list.length;
  $('#noHist').textContent = S.entries.length ? 'Tidak ada catatan yang cocok. Coba kata kunci atau filter lain.' : 'Belum ada catatan. Mulai dengan tombol + di bawah.';
  $('#hist').innerHTML = list.map(e => {
    const d = parseD(e.entry_date), cats = [...new Set((e.activities || []).map(a => a.cat))];
    const text = e.lesson || e.gratitude || e.plan || (e.activities || []).map(a => a.name).join(', ') || 'Tanpa catatan teks';
    return `<button class="entry" data-date="${e.entry_date}"><div class="d">${DAYF[d.getDay()]}<b>${d.getDate()}</b>${MON_S[d.getMonth()]}</div><div><p>${esc(text)}</p>${cats.map(c => `<span class="tagc">${esc(c)}</span>`).join('')}</div><div class="e">${e.mood ? MOOD_E[e.mood - 1] : ''}</div></button>`;
  }).join('');
}
$('#q').addEventListener('input', renderHistory);
$$('#filters button').forEach(b => b.addEventListener('click', () => { histFilter = b.dataset.f; $$('#filters button').forEach(x => x.setAttribute('aria-pressed', x === b ? 'true' : 'false')); renderHistory(); }));

/* ---- Pengaturan ---- */
function renderSettings() {
  $('#setName').value = userName(); $('#setEmail').value = (S.user && S.user.email) || '';
  const b = Number(S.settings.monthly_budget) || 0, s = Number(S.settings.savings_target) || 0;
  $('#setBud').value = b ? b.toLocaleString('id-ID') : ''; $('#setSav').value = s ? s.toLocaleString('id-ID') : '';
}
$('#saveSettings').addEventListener('click', () => safe(async () => {
  const r = await q(sb.from('settings').upsert({ user_id: S.user.id, monthly_budget: num($('#setBud').value), savings_target: num($('#setSav').value) }, { onConflict: 'user_id' }).select().single());
  S.settings = r;
  const nm = $('#setName').value.trim();
  if (nm && nm !== userName()) { const u = await sb.auth.updateUser({ data: { name: nm } }); if (!u.error && u.data && u.data.user) S.user = u.data.user; }
  renderAll(); toast('Pengaturan disimpan');
}));
$('#exportJson').addEventListener('click', () => {
  const data = { diekspor: new Date().toISOString(), catatan: S.entries, target: S.goals, centang_target: S.checks, transaksi: S.trx,
    buku: S.books.map(b => ({ judul: b.title, penulis: b.author, halaman_terakhir: b.current_page, total_halaman: b.total_pages })), log_baca: S.reading, pengaturan: S.settings };
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
  a.download = `jejak-cadangan-${today()}.json`; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 3000);
});
$('#logout').addEventListener('click', async () => { if (sb) await sb.auth.signOut(); resetSession(); });
function resetSession() { S.user = null; Object.assign(S, { entries: [], goals: [], checks: [], trx: [], books: [], reading: [], settings: {} }); stack = ['masuk']; render(); }

/* ================= Buku dan pembaca ================= */
const PDFJS = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
const PDFJS_WORKER = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
const JSZIP = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
const EPUBJS = 'https://cdnjs.cloudflare.com/ajax/libs/epub.js/0.3.93/epub.min.js';
const PALETTE = [['#1F7A58','#0F4634'], ['#3F5F96','#243A63'], ['#9A6038','#5E3A20'], ['#6F4E94','#41295E'], ['#5E7A32','#38491B']];
const ZOOMS = [1, 1.25, 1.5, 1.8], EPUB_SIZES = [95, 110, 130, 150], ZOOM_NAME = ['kecil', 'sedang', 'besar', 'sangat besar'];
let lastBookId = null, bookFilter = 'semua';
const loaded = {};
const loadScript = u => loaded[u] || (loaded[u] = new Promise((res, rej) => { const s = document.createElement('script'); s.src = u; s.onload = res; s.onerror = () => { delete loaded[u]; rej(new Error('Gagal memuat pustaka pembaca. Periksa koneksi internet.')); }; document.head.appendChild(s); }));

const idb = {
  open: () => new Promise((res, rej) => { const r = indexedDB.open('jejak', 1); r.onupgradeneeded = () => r.result.createObjectStore('files'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }),
  async get(k) { const db = await this.open(); return new Promise(res => { const r = db.transaction('files').objectStore('files').get(k); r.onsuccess = () => res(r.result || null); r.onerror = () => res(null); }); },
  async set(k, v) { const db = await this.open(); return new Promise(res => { const t = db.transaction('files', 'readwrite'); t.objectStore('files').put(v, k); t.oncomplete = () => res(); t.onerror = () => res(); }); },
  async del(k) { const db = await this.open(); return new Promise(res => { const t = db.transaction('files', 'readwrite'); t.objectStore('files').delete(k); t.oncomplete = () => res(); t.onerror = () => res(); }); }
};

const bookById = id => S.books.find(b => String(b.id) === String(id));
const bStatus = b => !b.current_page ? 'baru' : (b.total_pages && b.current_page >= b.total_pages ? 'selesai' : 'baca');
const bPct = b => b.total_pages ? Math.min(100, Math.round(b.current_page / b.total_pages * 100)) : 0;
const ST = { baru: 'Belum dibaca', baca: 'Sedang dibaca', selesai: 'Selesai' };
const initials = t => String(t).split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() || 'B';
const hash = s => [...String(s)].reduce((a, c) => a + c.charCodeAt(0), 0);
const cover = (b, sm) => { const c = PALETTE[hash(b.id) % PALETTE.length]; return `<span class="cover${sm ? ' sm' : ''}" style="background:linear-gradient(160deg,${c[0]},${c[1]})" aria-hidden="true">${esc(initials(b.title))}</span>`; };
function agoText(iso_) {
  if (!iso_) return 'Belum dibuka';
  const d = new Date(iso_), now = new Date(), diff = Math.floor((new Date(now.getFullYear(), now.getMonth(), now.getDate()) - new Date(d.getFullYear(), d.getMonth(), d.getDate())) / 864e5);
  const t = `${pad(d.getHours())}.${pad(d.getMinutes())}`;
  return diff <= 0 ? `Hari ini pukul ${t}` : diff === 1 ? `Kemarin pukul ${t}` : `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}
function lastHTML(label) {
  const b = bookById(lastBookId);
  if (!b) return `<div class="inf"><b>${label === 'Terakhir dibaca' ? 'Belum ada buku' : 'Perpustakaan masih kosong'}</b><small>Unggah e-book PDF atau EPUB pertamamu, lalu halaman terakhir yang kamu baca akan tercatat otomatis.</small><button class="btn" data-add="buku" style="margin-top:12px;height:44px">Unggah e-book</button></div>`;
  const p = bPct(b), st = bStatus(b);
  return `${cover(b)}<div class="inf"><span class="cs" style="margin:0">${label}</span><b>${esc(b.title)}</b><small>${esc(b.author || '')}</small>
    <div class="pbar" style="margin:10px 0 6px;height:6px"><i style="width:${p}%;background:var(--green)"></i></div>
    <small>${b.current_page ? `Halaman ${b.current_page}${b.total_pages ? ` dari ${b.total_pages} (${p}%)` : ''}` : 'Belum mulai dibaca'}</small><br><small>${agoText(b.last_read_at)}</small>
    <button class="btn" data-read="${b.id}" style="margin-top:12px;height:44px">${st === 'selesai' ? 'Baca lagi' : st === 'baru' ? 'Mulai baca' : 'Lanjut baca'}</button></div>`;
}
function renderBooks() {
  $('#homeRead').innerHTML = lastHTML('Sedang dibaca'); $('#lastCard').innerHTML = lastHTML('Terakhir dibaca');
  $('#stDone').innerHTML = `${S.books.filter(b => bStatus(b) === 'selesai').length}<small>buku</small>`;
  $('#stNow').innerHTML = `${S.books.filter(b => bStatus(b) === 'baca').length}<small>buku</small>`;
  const list = S.books.filter(b => bookFilter === 'semua' || bStatus(b) === bookFilter);
  $('#bookList').innerHTML = list.map(b => `<button class="brow" data-read="${b.id}">${cover(b, true)}<span class="bi"><b>${esc(b.title)}</b><small>${esc(b.author || '')}</small><span class="pbar"><i style="width:${bPct(b)}%;background:var(--green)"></i></span><small>${b.current_page ? `Halaman ${b.current_page}${b.total_pages ? ` dari ${b.total_pages} (${bPct(b)}%)` : ''}` : 'Belum dibaca'}</small></span><span class="stt ${bStatus(b)}">${ST[bStatus(b)]}</span></button>`).join('');
  $('#bookList').hidden = !list.length; $('#noBook').hidden = !!list.length;
  $('#noBook').textContent = S.books.length ? 'Belum ada buku di kategori ini.' : 'Belum ada buku. Tekan “+ Unggah e-book” untuk menambahkan.';
  renderReadChart();
}
let readOpts = null;
function renderReadChart() {
  const days7 = [...Array(7)].map((_, i) => addDays(new Date(), i - 6));
  const vals = days7.map(d => (S.reading.find(r => r.log_date === iso(d)) || {}).pages || 0);
  const tot = vals.reduce((a, b) => a + b, 0), mx = Math.max(...vals, 1);
  bars('#barsRead', { vals, labels: days7.map(d => DAYS[d.getDay()]), max: mx, sel: 6, aria: i => `${DAYF[days7[i].getDay()]}: ${vals[i]} halaman`,
    onSel: i => { $('#readSel').textContent = tot + ' halaman'; $('#readLbl').textContent = `${DAYF[days7[i].getDay()]}: ${vals[i]} halaman. Total 7 hari terakhir`; } });
}
$$('#bookFilters button').forEach(b => b.addEventListener('click', () => { bookFilter = b.dataset.bf; $$('#bookFilters button').forEach(x => x.setAttribute('aria-pressed', x === b ? 'true' : 'false')); renderBooks(); }));

/* Unggah */
$('#uploadBtn').addEventListener('click', () => $('#file').click());
$('#file').addEventListener('change', async e => {
  const files = [...e.target.files]; e.target.value = '';
  for (const f of files) {
    const ext = (f.name.split('.').pop() || '').toLowerCase();
    if (!['pdf', 'epub'].includes(ext)) { toast('Format harus PDF atau EPUB'); continue; }
    if (f.size > (CFG.MAX_FILE_MB || 50) * 1048576) { toast(`Ukuran file maksimal ${CFG.MAX_FILE_MB || 50} MB`, 3000); continue; }
    toast('Mengunggah ' + f.name.slice(0, 26) + '…', 60000);
    const path = `${S.user.id}/${uuid()}.${ext}`;
    const up = await sb.storage.from('ebooks').upload(path, f, { contentType: ext === 'pdf' ? 'application/pdf' : 'application/epub+zip', upsert: false });
    if (up.error) { toast('Gagal mengunggah: ' + up.error.message, 4000); continue; }
    const title = f.name.replace(/\.[^.]+$/, '').replace(/_+/g, ' ').trim() || 'Buku baru';
    const r = await sb.from('books').insert({ user_id: S.user.id, title, author: '', file_path: path, file_type: ext }).select().single();
    if (r.error) { await sb.storage.from('ebooks').remove([path]); toast('Gagal menyimpan buku: ' + r.error.message, 4000); continue; }
    S.books.unshift(r.data); if (!lastBookId) lastBookId = r.data.id;
    idb.set(r.data.id, f).catch(() => {}); renderBooks(); toast('Buku ditambahkan');
  }
});

/* Pembaca */
const R = { id: null, type: null, pdf: null, book: null, rend: null, zoom: 1, night: true, locReady: false, opened: false, seq: 0, timer: null, pending: null, task: null, cfi: null };
const setStatus = m => $('#rdStatus').textContent = m;

async function getBlob(b) {
  try { const c = await idb.get(b.id); if (c) return c; } catch (_) {}
  const r = await sb.storage.from('ebooks').download(b.file_path); if (r.error) throw r.error;
  idb.set(b.id, r.data).catch(() => {}); return r.data;
}
async function openBook(id) {
  const b = bookById(id); if (!b) return;
  closeReader(); R.id = b.id; lastBookId = b.id; R.seq++;
  $('#rdTitle').textContent = b.title; $('#rdAuthor').textContent = b.author || '';
  $('#pdfWrap').hidden = true; $('#epubWrap').hidden = true; $('#rdPos').textContent = ''; $('#slider').disabled = true;
  setStatus('Memuat buku…'); go('baca'); R.id = b.id;
  try {
    const blob = await getBlob(b);
    if (R.id !== b.id) return;
    if (b.file_type === 'pdf') await openPdf(blob, b); else await openEpub(blob, b);
    if (R.id === b.id) setStatus('');
  } catch (err) { console.error(err); if (R.id === b.id) setStatus('Gagal membuka buku: ' + (err.message || err)); }
}
async function openPdf(blob, b) {
  await loadScript(PDFJS); const lib = window.pdfjsLib; lib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
  const pdf = await lib.getDocument({ data: await blob.arrayBuffer() }).promise;
  if (R.id !== b.id) { try { pdf.destroy(); } catch (_) {} return; }
  R.type = 'pdf'; R.pdf = pdf; R.opened = false; b.total_pages = pdf.numPages;
  $('#pdfWrap').hidden = false; $('#pdfWrap').classList.toggle('night', R.night);
  await showPdf(Math.min(Math.max(1, b.current_page || 1), pdf.numPages)); R.opened = true;
}
async function showPdf(n) {
  const pdf = R.pdf; if (!pdf) return; n = Math.min(Math.max(1, n), pdf.numPages);
  const my = ++R.seq; if (R.task) { try { R.task.cancel(); } catch (_) {} }
  const page = await pdf.getPage(n); if (my !== R.seq) return;
  const wrap = $('#pdfWrap'), cssW = wrap.clientWidth * ZOOMS[R.zoom], vp0 = page.getViewport({ scale: 1 }), dpr = window.devicePixelRatio || 1;
  const vp = page.getViewport({ scale: cssW / vp0.width * dpr }), cv = $('#pdfCanvas');
  cv.width = vp.width; cv.height = vp.height; cv.style.width = cssW + 'px'; cv.style.height = (vp.height / dpr) + 'px';
  R.task = page.render({ canvasContext: cv.getContext('2d'), viewport: vp });
  try { await R.task.promise; } catch (e) { if (e && e.name === 'RenderingCancelledException') return; throw e; }
  if (my !== R.seq) return;
  wrap.scrollTop = 0; onPage(n, pdf.numPages, null);
}
async function openEpub(blob, b) {
  await loadScript(JSZIP); await loadScript(EPUBJS);
  if (R.id !== b.id) return;
  R.type = 'epub'; R.locReady = false; R.opened = false;
  const box = $('#epubWrap'); box.hidden = false; box.innerHTML = '';
  const buf = await blob.arrayBuffer(); if (R.id !== b.id) return;
  const bk = window.ePub(); bk.open(buf, 'binary'); R.book = bk;
  R.rend = bk.renderTo(box, { width: '100%', height: box.clientHeight || 480, flow: 'paginated', spread: 'none' });
  applyEpubTheme();
  R.rend.on('relocated', loc => {
    R.cfi = loc.start.cfi; if (!R.locReady) return;
    const idx = bk.locations.locationFromCfi(loc.start.cfi); onPage((idx < 0 ? 0 : idx) + 1, bk.locations.total, loc.start.cfi);
  });
  await R.rend.display(b.current_cfi || undefined);
  if (R.id !== b.id) return;
  $('#rdPos').textContent = 'Menghitung halaman…';
  bk.loaded.metadata.then(m => { if (R.id === b.id && m && !b.author && (m.creator || m.title)) { b.title = m.title || b.title; b.author = m.creator || ''; sb.from('books').update({ title: b.title, author: b.author }).eq('id', b.id).then(() => {}); $('#rdTitle').textContent = b.title; $('#rdAuthor').textContent = b.author; renderBooks(); } }).catch(() => {});
  bk.locations.generate(1600).then(() => {
    if (R.id !== b.id) return;
    R.locReady = true; const cfi = R.cfi || b.current_cfi, idx = cfi ? bk.locations.locationFromCfi(cfi) : 0;
    onPage(Math.max(0, idx) + 1, bk.locations.total, cfi); R.opened = true;
  }).catch(() => { $('#rdPos').textContent = 'Gagal menghitung halaman'; });
}
function applyEpubTheme() {
  if (!R.rend) return; const n = R.night;
  R.rend.themes.override('color', n ? '#E4E4E4' : '#111111'); R.rend.themes.override('background', n ? '#080808' : '#FFFFFF');
  R.rend.themes.font('Georgia, serif'); R.rend.themes.fontSize(EPUB_SIZES[R.zoom] + '%');
  $('#epubWrap').style.background = n ? '#080808' : '#FFFFFF';
}
function onPage(n, total, cfi) {
  const b = bookById(R.id); if (!b) return;
  const prev = b.current_page || 0;
  if (R.opened && n === prev + 1) logPages(1);
  b.current_page = n; if (total) b.total_pages = total; if (cfi) b.current_cfi = cfi; b.last_read_at = new Date().toISOString();
  $('#rdPos').textContent = total ? `Halaman ${n} dari ${total}` : `Halaman ${n}`;
  const sl = $('#slider'); sl.max = total || n; sl.value = n; sl.disabled = !total;
  renderBooks(); renderHome(); queueSave(b);
}
function queueSave(b) { clearTimeout(R.timer); R.pending = b; R.timer = setTimeout(flushSave, 800); }
async function flushSave() {
  clearTimeout(R.timer); const b = R.pending; if (!b || !sb) return; R.pending = null;
  const r = await sb.from('books').update({ current_page: b.current_page, current_cfi: b.current_cfi || null, total_pages: b.total_pages || null, last_read_at: b.last_read_at }).eq('id', b.id);
  if (r.error) console.warn(r.error.message);
}
let logTimer = null;
function logPages(n) {
  const d = today(); let row = S.reading.find(r => r.log_date === d);
  if (row) row.pages += n; else { row = { log_date: d, pages: n }; S.reading.push(row); }
  renderReadChart(); clearTimeout(logTimer);
  logTimer = setTimeout(() => { sb.from('reading_log').upsert({ user_id: S.user.id, log_date: d, pages: row.pages }, { onConflict: 'user_id,log_date' }).then(r => { if (r.error) console.warn(r.error.message); }); }, 1200);
}
function closeReader() {
  if (!R.id && !R.type) return;
  flushSave(); R.seq++;
  try { R.rend && R.rend.destroy(); } catch (_) {} try { R.book && R.book.destroy(); } catch (_) {} try { R.pdf && R.pdf.destroy(); } catch (_) {}
  R.id = null; R.type = null; R.rend = null; R.book = null; R.pdf = null; R.locReady = false; R.opened = false; R.cfi = null;
  $('#epubWrap').innerHTML = ''; $('#epubWrap').hidden = true; $('#pdfWrap').hidden = true;
}
$('#prevP').addEventListener('click', () => { const b = bookById(R.id); if (!b) return; if (R.type === 'pdf') showPdf((b.current_page || 1) - 1); else if (R.rend) R.rend.prev(); });
$('#nextP').addEventListener('click', () => { const b = bookById(R.id); if (!b) return; if (R.type === 'pdf') showPdf((b.current_page || 1) + 1); else if (R.rend) R.rend.next(); });
$('#slider').addEventListener('change', e => {
  const n = Number(e.target.value); if (R.type === 'pdf') showPdf(n); else if (R.book && R.locReady) R.rend.display(R.book.locations.cfiFromLocation(n - 1));
});
$('#slider').addEventListener('input', e => { const b = bookById(R.id); if (b) $('#rdPos').textContent = `Halaman ${e.target.value} dari ${b.total_pages || '?'}`; });
$('#fontBtn').addEventListener('click', () => {
  R.zoom = (R.zoom + 1) % ZOOMS.length;
  if (R.type === 'pdf') { const b = bookById(R.id); showPdf((b && b.current_page) || 1); } else applyEpubTheme();
  toast('Ukuran ' + ZOOM_NAME[R.zoom]);
});
$('#nightBtn').addEventListener('click', e => {
  R.night = !R.night; e.currentTarget.setAttribute('aria-pressed', R.night ? 'true' : 'false');
  $('#pdfWrap').classList.toggle('night', R.night); applyEpubTheme();
});
$('#delBook').addEventListener('click', () => safe(async () => {
  const b = bookById(R.id); if (!b || !confirm(`Hapus “${b.title}” dari perpustakaan?`)) return;
  clearTimeout(R.timer); R.pending = null;
  await sb.storage.from('ebooks').remove([b.file_path]); await q(sb.from('books').delete().eq('id', b.id)); idb.del(b.id);
  S.books = S.books.filter(x => x.id !== b.id); if (lastBookId === b.id) lastBookId = (S.books[0] || {}).id || null;
  back(); renderAll(); toast('Buku dihapus');
}));
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flushSave(); });

/* ================= Masuk dan daftar ================= */
let authMode = 'masuk';
function setAuthMode(m) {
  authMode = m; const reg = m === 'daftar';
  $('#authTitle').textContent = reg ? 'Buat akun' : 'Masuk'; $('#authGo').textContent = reg ? 'Daftar' : 'Masuk';
  $('#authSwitch').textContent = reg ? 'Sudah punya akun? Masuk' : 'Belum punya akun? Daftar';
  $('#authNameWrap').hidden = !reg; $('#authPass').autocomplete = reg ? 'new-password' : 'current-password';
  authMsg('');
}
function authMsg(t, ok) { const m = $('#authMsg'); m.textContent = t; m.classList.toggle('ok', !!ok); }
function authErr(e) {
  const m = (e && e.message) || String(e);
  if (/invalid login/i.test(m)) return 'Email atau kata sandi salah.';
  if (/already registered|already been registered/i.test(m)) return 'Email ini sudah terdaftar. Silakan masuk.';
  if (/password/i.test(m) && /6/.test(m)) return 'Kata sandi minimal 6 karakter.';
  if (/email not confirmed/i.test(m)) return 'Email belum dikonfirmasi. Cek kotak masuk emailmu.';
  if (/invalid.*email|valid email/i.test(m)) return 'Format email belum benar.';
  if (/fetch|network/i.test(m)) return 'Tidak bisa terhubung. Periksa koneksi internet.';
  return m;
}
$('#authSwitch').addEventListener('click', () => setAuthMode(authMode === 'masuk' ? 'daftar' : 'masuk'));
$('#authGo').addEventListener('click', async () => {
  if (!sb) return authMsg('Aplikasi belum terhubung ke Supabase. Isi config.js dulu (lihat PANDUAN.md).');
  const email = $('#authEmail').value.trim(), password = $('#authPass').value;
  if (!email || !password) return authMsg('Isi email dan kata sandi.');
  const btn = $('#authGo'); btn.disabled = true; authMsg('');
  try {
    if (authMode === 'masuk') {
      const { data, error } = await sb.auth.signInWithPassword({ email, password }); if (error) throw error; await start(data.user);
    } else {
      const name = $('#authName').value.trim();
      const { data, error } = await sb.auth.signUp({ email, password, options: { data: { name } } }); if (error) throw error;
      if (data.session) await start(data.user); else { setAuthMode('masuk'); authMsg('Akun dibuat. Cek emailmu untuk konfirmasi, lalu masuk.', true); }
    }
  } catch (e) { authMsg(authErr(e)); } finally { btn.disabled = false; }
});
['#authEmail', '#authPass', '#authName'].forEach(id => $(id).addEventListener('keydown', e => { if (e.key === 'Enter') $('#authGo').click(); }));

async function start(user) {
  S.user = user; $('#authPass').value = '';
  try { await loadAll(); } catch (e) { console.warn(e); }
  const sel = $('#aCat'); sel.innerHTML = CFG.ACTIVITY_CATEGORIES.map(c => `<option>${esc(c)}</option>`).join('');
  $('#wal').innerHTML = CFG.WALLETS.map(c => `<option>${esc(c)}</option>`).join('');
  renderAll(); stack = ['beranda']; render();
}

/* ================= Mulai ================= */
async function init() {
  render(); setAuthMode('masuk');
  if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});
  if (!sb) { authMsg(configured ? 'Pustaka Supabase gagal dimuat. Periksa koneksi internet lalu muat ulang.' : 'Aplikasi belum terhubung ke Supabase. Isi config.js dulu (lihat PANDUAN.md).'); return; }
  sb.auth.onAuthStateChange(ev => { if (ev === 'SIGNED_OUT' && S.user) resetSession(); });
  try {
    const { data } = await sb.auth.getSession();
    if (data && data.session) await start(data.session.user);
  } catch (e) { console.warn(e); }
}
init();
})();
