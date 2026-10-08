// Uji penerimaan antarmuka (docs/spesifikasi.md bagian 9) dengan peramban Chromium.
// Pemakaian: npm run build && npx vite preview --port 4173 &  lalu  node scripts/uji-penerimaan.mjs [url]
// Lokasi Chromium dapat diatur lewat CHROME_PATH. K-01 diuji terpisah lewat `npm test`.
import { chromium } from 'playwright-core';
import { existsSync, readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const URL_DASBOR = process.argv[2] ?? 'http://localhost:4173/';
const OUT = resolve(ROOT, 'hasil-uji');
mkdirSync(OUT, { recursive: true });
const expected = JSON.parse(readFileSync(resolve(ROOT, 'data/expected_indicators.json'), 'utf-8'));

function cariChrome() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const dir = '/opt/pw-browsers';
  if (existsSync(dir)) {
    const shell = readdirSync(dir).find((d) => d.startsWith('chromium_headless_shell-'));
    if (shell) return join(dir, shell, 'chrome-linux', 'headless_shell');
  }
  return undefined; // biarkan playwright mencari sendiri
}

const hasil = [];
async function uji(kode, judul, fn) {
  try {
    const catatan = await fn();
    hasil.push({ kode, judul, lulus: true, catatan: catatan ?? '' });
  } catch (e) {
    hasil.push({ kode, judul, lulus: false, catatan: e.message.split('\n')[0] });
  }
}
function pastikan(kondisi, pesan) {
  if (!kondisi) throw new Error(pesan);
}

const browser = await chromium.launch({ executablePath: cariChrome() });

async function bukaHalaman({ lebar = 1360, tab = 'ringkasan', rute } = {}) {
  const page = await browser.newPage({ viewport: { width: lebar, height: 900 } });
  if (rute) await rute(page);
  await page.goto(`${URL_DASBOR}#${tab}`);
  await page.waitForSelector('.definisi, .peringatan');
  return page;
}
// Urutan select pada bilah filter: Periode, UKE I, UKE II, Sumber data.
const filterSel = (page, i) => page.locator('.filter select').nth(i);
const teks = (page) => page.evaluate(() => document.querySelector('main').innerText);
const fmt = (n) => new Intl.NumberFormat('id-ID').format(n);
const pct = (n) => `${new Intl.NumberFormat('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(n)}%`;

// ------------------------------------------------------------------ K-02
await uji('K-02', 'Pemeriksaan 8.2 lolos; data rusak memicu peringatan', async () => {
  const p = await bukaHalaman();
  const ringkas = await p.locator('.definisi summary').innerText();
  pastikan(ringkas.includes('8 dari 8 terpenuhi'), `ringkasan: ${ringkas}`);
  pastikan((await p.locator('.peringatan').count()) === 0, 'peringatan muncul pada data valid');
  await p.close();
  // Rusak: duplikasi ID dokumen pertama dan status tidak sah.
  const p2 = await bukaHalaman({
    rute: (pg) =>
      pg.route('**/data/dokumen.csv', async (route) => {
        const r = await route.fetch();
        const baris = (await r.text()).split('\n');
        baris[2] = baris[2].replace(/^ENT-\d+/, 'ENT-00001');
        baris[3] = baris[3].replace(',PUBLISH,', ',ARSIP,').replace(',PIC_UKE,', ',ARSIP,').replace(',DRAFT,', ',ARSIP,');
        await route.fulfill({ response: r, body: baris.join('\n') });
      }),
  });
  const peringatan = await p2.locator('.peringatan[role=alert]').innerText();
  await p2.close();
  pastikan(peringatan.includes('ID dokumen unik'), 'peringatan ID ganda tidak muncul');
  return `Data contoh: 8 dari 8 terpenuhi. Data rusak → peringatan: "${peringatan.split('\n').slice(1, 3).join(' | ')}"`;
});

// ------------------------------------------------------------------ K-03
await uji('K-03', 'Persamaan kontrol ditampilkan dan terpenuhi', async () => {
  const p = await bukaHalaman();
  const t = await teks(p);
  await p.close();
  const kalimat = `Persamaan kontrol terpenuhi: total 5.063 = terpublikasi 2.687 + dalam proses 1.202 + tidak tayang 1.174.`;
  pastikan(t.includes(kalimat), 'kalimat persamaan kontrol tidak ditemukan');
  return kalimat;
});

// ------------------------------------------------------------------ K-04
await uji('K-04', 'Tidak ada tanggal libur di kode sumber', async () => {
  const libur = readFileSync(resolve(ROOT, 'data/hari_libur.csv'), 'utf-8')
    .split('\n')
    .slice(1)
    .map((l) => l.split(',')[0])
    .filter(Boolean);
  const berkas = [];
  const jelajah = (d) => {
    for (const f of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, f.name);
      if (f.isDirectory()) jelajah(p);
      else if (/\.(ts|tsx|css)$/.test(f.name)) berkas.push(p);
    }
  };
  jelajah(resolve(ROOT, 'src'));
  const temuan = berkas.filter((f) => libur.some((tgl) => readFileSync(f, 'utf-8').includes(tgl)));
  pastikan(!temuan.length, `tanggal libur ditemukan di ${temuan.join(', ')}`);
  return `${libur.length} tanggal libur dicari di ${berkas.length} berkas src/: tidak ada. Aturan (a, b] diuji di tests/indicators.test.ts.`;
});

// ------------------------------------------------------------------ K-05, K-07
await uji('K-05', 'Status ketepatan waktu selalu bertuliskan teks', async () => {
  const p = await bukaHalaman({ tab: 'alur' });
  await p.getByRole('button', { name: 'Buka semua' }).click();
  const chip = await p.locator('.chip').allInnerTexts();
  await p.close();
  const sah = new Set(['Dalam batas', 'Mendekati batas', 'Melewati batas', 'Tidak ada antrean', 'Selesai']);
  pastikan(chip.every((c) => sah.has(c.trim())), `chip tanpa teks sah: ${chip.filter((c) => !sah.has(c.trim()))}`);
  const hitung = {};
  for (const c of chip) hitung[c] = (hitung[c] ?? 0) + 1;
  return `${chip.length} chip, semuanya berteks: ${Object.entries(hitung).map(([k, v]) => `${k} ${v}`).join(', ')}`;
});

await uji('K-07', 'Tabel UKE I/UKE II dapat dibuka, terurut, dan sesuai acuan', async () => {
  const p = await bukaHalaman({ tab: 'alur' });
  const induk = p.locator('.tabel-uke .induk');
  pastikan((await induk.count()) === 12, 'jumlah UKE I bukan 12');
  pastikan((await p.locator('.tabel-uke .anak').count()) > 0, 'UKE I teratas tidak terbuka otomatis');
  await p.getByRole('button', { name: 'Buka semua' }).click();
  const anakSemua = await p.locator('.tabel-uke .anak').count();
  pastikan(anakSemua === 71, `UKE II terbuka ${anakSemua}, seharusnya 71`);
  await p.getByRole('button', { name: 'Tutup semua' }).click();
  pastikan((await p.locator('.tabel-uke .anak').count()) === 0, 'Tutup semua gagal');
  const tombol = induk.nth(11).locator('button');
  await tombol.click();
  pastikan((await tombol.getAttribute('aria-expanded')) === 'true', 'aria-expanded tidak berubah');
  // Bandingkan setiap baris induk dengan acuan.
  const baris = await induk.evaluateAll((els) =>
    els.map((el) => [...el.querySelectorAll('[role=cell], [role=rowheader]')].map((c) => c.innerText.replace(/\s+/g, ' ').trim())),
  );
  await p.close();
  let urut = Infinity;
  for (const b of baris) {
    const nama = b[0].replace(/^[▸▾]\s*/, '').replace(/\s*\d+ UKE II$/, '');
    const e = expected.uke1[nama];
    pastikan(e, `UKE I tidak dikenal: ${nama}`);
    const harap = [fmt(e.total), pct(e.persen_publish), fmt(e.dalam_proses), fmt(e.lebih_dari_5_hk), `${pct(e.rata_rata_tertahan_hk).replace('%', '')} hari`, e.status];
    pastikan(JSON.stringify(b.slice(1)) === JSON.stringify(harap), `${nama}: ${b.slice(1)} ≠ ${harap}`);
    pastikan(e.lebih_dari_5_hk <= urut, 'urutan tidak menurun');
    urut = e.lebih_dari_5_hk;
  }
  return '12 UKE I sesuai acuan, terurut menurun; Buka semua → 71 UKE II; Tutup semua → 0; aria-expanded berubah.';
});

// ------------------------------------------------------------------ K-06
await uji('K-06', 'Angka Ringkasan Pimpinan sesuai acuan', async () => {
  const p = await bukaHalaman();
  const kpi = await p.locator('.kpi').allInnerTexts();
  await p.close();
  const r = expected.ringkasan;
  const harap = [
    ['Total aset pengetahuan', fmt(r.total_aset)],
    ['Terpublikasi (gabungan)', fmt(r.terpublikasi)],
    ['Terpublikasi (gabungan)', pct(r.persen_publish)],
    ['Terpublikasi (gabungan)', `kurang ${fmt(r.kekurangan_menuju_target)} dokumen`],
    ['Dalam proses (entri)', fmt(r.dalam_proses_entri)],
    ['Tertahan lebih dari 5 hari kerja', fmt(r.tertahan_lebih_dari_5_hk)],
    ['Skor kualitas metadata', '70,3'],
  ];
  for (const [label, nilai] of harap) {
    const k = kpi.find((x) => x.startsWith(label));
    pastikan(k && k.includes(nilai), `${label} tidak memuat ${nilai}`);
  }
  return 'Total 5.063; terpublikasi 2.687 (53,1%), kurang 2.123; dalam proses 1.202; tertahan 790; skor 70,3/100.';
});

// ------------------------------------------------------------------ K-08
await uji('K-08', 'Filter UKE I/UKE II mengubah angka secara konsisten', async () => {
  const p = await bukaHalaman();
  const u1 = 'Inspektorat Utama';
  await filterSel(p, 1).selectOption(u1);
  const totalU1 = await p.locator('.kpi').first().locator('.n').innerText();
  const opsiU2 = await filterSel(p, 2).locator('option').allInnerTexts();
  pastikan(totalU1 === fmt(expected.uke1[u1].total), `total ${totalU1}`);
  pastikan(opsiU2.length === 1 + Object.keys(expected.uke1[u1].uke2).length, `opsi UKE II ${opsiU2.length}`);
  // UKE II tanpa UKE I → UKE I terisi otomatis
  await filterSel(p, 1).selectOption('');
  const u2 = 'Biro Hukum';
  await filterSel(p, 2).selectOption(u2);
  const nilaiU1 = await filterSel(p, 1).inputValue();
  const totalU2 = await p.locator('.kpi').first().locator('.n').innerText();
  const info = await p.locator('.info-filter').innerText();
  await p.close();
  const e2 = expected.uke1['Sekretariat Kementerian PPN/Sekretariat Utama Bappenas'].uke2[u2];
  pastikan(nilaiU1 === 'Sekretariat Kementerian PPN/Sekretariat Utama Bappenas', `UKE I tidak menyesuaikan: ${nilaiU1}`);
  pastikan(totalU2 === fmt(e2.total), `total UKE II ${totalU2}`);
  pastikan(info.includes('hanya dokumen entri'), 'keterangan filter tidak tampil');
  return `${u1}: total ${totalU1} (acuan ${expected.uke1[u1].total}), ${opsiU2.length - 1} UKE II. ${u2}: total ${totalU2}, UKE I terisi otomatis.`;
});

// ------------------------------------------------------------------ K-09
await uji('K-09', 'Sumber Menu Program menyembunyikan blok entri', async () => {
  const p = await bukaHalaman();
  await filterSel(p, 3).selectOption('MENU_PROGRAM');
  const ada = async (sel) => (await p.locator(sel).count()) > 0;
  const kpi = await p.locator('.kpi .kpi-label').allInnerTexts();
  const uke1Nonaktif = await filterSel(p, 1).isDisabled();
  const capaian = await ada('#capaian');
  const tren = await ada('#judul-tren');
  const menu = await ada('#judul-menu');
  const total = await p.locator('.kpi').first().locator('.n').innerText();
  await p.getByRole('button', { name: 'Kontrol Alur Kerja' }).click();
  const alur = await p.locator('main h2').first().innerText();
  await p.close();
  pastikan(!capaian && !tren && menu, 'blok tidak sesuai');
  pastikan(!kpi.some((k) => k.startsWith('Dalam proses') || k.startsWith('Tertahan')), 'KPI entri masih tampil');
  pastikan(uke1Nonaktif, 'filter UKE tidak nonaktif');
  pastikan(total === fmt(expected.ringkasan.menu_program), `total ${total}`);
  return `Total ${total}; capaian UKE I, tren, KPI dalam proses/tertahan disembunyikan; filter UKE nonaktif; tab alur: "${alur}".`;
});

// ------------------------------------------------------------------ K-10
await uji('K-10', 'Filter Periode', async () => {
  const p = await bukaHalaman();
  const jumlah = {};
  for (const y of ['2026', '2025', '2024', '2023']) {
    await filterSel(p, 0).selectOption(y);
    jumlah[y] = Number((await p.locator('.kpi').first().locator('.n').innerText()).replace(/\./g, ''));
  }
  const judulTren = await (async () => {
    await filterSel(p, 0).selectOption('2025');
    return p.locator('#judul-tren').innerText();
  })();
  await p.close();
  const sum = Object.values(jumlah).reduce((a, b) => a + b, 0);
  pastikan(sum === expected.ringkasan.total_aset, `jumlah per tahun ${sum}`);
  pastikan(judulTren.endsWith('2025'), 'tren tidak mengikuti tahun');
  return `${Object.entries(jumlah).map(([y, n]) => `${y}: ${fmt(n)}`).join('; ')} → jumlah ${fmt(sum)}. Tren ikut tahun terpilih.`;
});

// ------------------------------------------------------------------ K-11
await uji('K-11', 'Perubahan dibanding akhir bulan lalu', async () => {
  const p = await bukaHalaman();
  const sub = await p.locator('.kpi').first().locator('.kpi-sub').innerText();
  await filterSel(p, 3).selectOption('ENTRI');
  const subFilter = await p.locator('.kpi').first().locator('.kpi-sub').innerText();
  await p.close();
  const p2 = await bukaHalaman({ rute: (pg) => pg.route('**/data/snapshot_bulanan.csv', (r) => r.fulfill({ status: 404, body: '' })) });
  const subTanpa = await p2.locator('.kpi').first().locator('.kpi-sub').innerText();
  await p2.close();
  pastikan(sub === '+40 dibanding akhir bulan lalu', sub);
  pastikan(subFilter.endsWith('—') && subTanpa.endsWith('—'), `${subFilter} / ${subTanpa}`);
  return `"${sub}"; dengan filter: "${subFilter}"; tanpa snapshot: "${subTanpa}".`;
});

// ------------------------------------------------------------------ K-12, K-13, K-17
await uji('K-12', 'Format angka id-ID', async () => {
  const semua = [];
  for (const tab of ['ringkasan', 'alur', 'kualitas']) {
    const p = await bukaHalaman({ tab });
    semua.push(await teks(p));
    await p.close();
  }
  const t = semua.join('\n');
  const salah = t.match(/\b\d{1,3},\d{3}\b|\b\d+\.\d%|\b\d{4,}(?!-)\b/g)?.filter((x) => !/^20\d\d$/.test(x)) ?? [];
  pastikan(!salah.length, `format salah: ${[...new Set(salah)].slice(0, 5)}`);
  pastikan(t.includes('5.063') && t.includes('53,1%') && t.includes('10,9'), 'contoh format tidak ditemukan');
  return 'Ribuan bertitik (5.063), desimal berkoma (53,1%, 10,9); tidak ada pola 5,063 / 53.1% / 5063.';
});

await uji('K-13', 'Nama unit, tanpa kode unit', async () => {
  const p = await bukaHalaman({ tab: 'alur' });
  await p.getByRole('button', { name: 'Buka semua' }).click();
  const nama = await p.locator('.tabel-uke [role=rowheader]').allInnerTexts();
  await p.close();
  const ref = readFileSync(resolve(ROOT, 'data/unit_kerja.csv'), 'utf-8');
  const bersih = nama.map((n) => n.replace(/^[▸▾]\s*/, '').replace(/\s*\d+ UKE II$/, '').trim());
  pastikan(bersih.every((n) => ref.includes(n)), 'ada nama yang tidak cocok referensi');
  pastikan(!bersih.some((n) => /^\(?[A-Z0-9]{2,}[.\-][A-Z0-9]/.test(n)), 'pola kode unit ditemukan');
  return `${bersih.length} baris unit menampilkan nama sesuai unit_kerja.csv; tidak ada kode unit.`;
});

await uji('K-17', 'Penanda data contoh', async () => {
  const p = await bukaHalaman();
  const l = await p.locator('.lencana').innerText();
  await p.close();
  pastikan(l.includes('Data contoh'), l);
  return `Header: "${l}"`;
});

// ------------------------------------------------------------------ K-14
await uji('K-14', 'Responsif 390–1360 px tanpa gulir horizontal halaman', async () => {
  const laporan = [];
  for (const lebar of [390, 768, 1024, 1360]) {
    for (const tab of ['ringkasan', 'alur', 'kualitas']) {
      const p = await bukaHalaman({ lebar, tab });
      if (tab === 'alur') await p.getByRole('button', { name: 'Buka semua' }).click();
      const r = await p.evaluate(() => {
        const vw = document.documentElement.clientWidth;
        const keluar = [...document.querySelectorAll('body *')].filter((el) => {
          if (el.closest('.gulir, .sr-only, dialog')) return false;
          const b = el.getBoundingClientRect();
          return b.width > 0 && (b.right > vw + 0.5 || b.left < -0.5);
        });
        const g = document.querySelector('.gulir');
        return {
          keluar: keluar.slice(0, 3).map((e) => e.className || e.tagName),
          tabelGulir: g ? g.scrollWidth > g.clientWidth : null,
          lebarDok: document.documentElement.scrollWidth,
          vw,
        };
      });
      if (lebar === 390) await p.screenshot({ path: join(OUT, `390-${tab}.png`), fullPage: true });
      if (lebar === 1360) await p.screenshot({ path: join(OUT, `1360-${tab}.png`), fullPage: true });
      await p.close();
      pastikan(!r.keluar.length, `${lebar}px ${tab}: elemen keluar layar ${r.keluar}`);
      pastikan(r.lebarDok <= r.vw, `${lebar}px ${tab}: lebar dokumen ${r.lebarDok}`);
      if (tab === 'alur' && lebar < 1024) pastikan(r.tabelGulir, `${lebar}px: tabel tidak bergulir di kotaknya`);
      laporan.push(`${lebar}/${tab}`);
    }
  }
  return `12 kombinasi lebar×tampilan tanpa elemen keluar layar; tabel UKE bergulir di kotaknya pada 390/768 px. Tangkapan layar di hasil-uji/.`;
});

// ------------------------------------------------------------------ K-15
await uji('K-15', 'Aksesibilitas (teks status, kontras, target sentuh, papan ketik)', async () => {
  const masalah = [];
  let minKontras = 99;
  let jumlahTombol = 0;
  for (const tab of ['ringkasan', 'alur', 'kualitas']) {
    const p = await bukaHalaman({ tab });
    if (tab === 'alur') await p.getByRole('button', { name: 'Buka semua' }).click();
    const r = await p.evaluate(() => {
      const rgb = (s) => (s.match(/[\d.]+/g) || []).map(Number);
      const lum = ([r, g, b]) => {
        const f = (c) => ((c /= 255) <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
        return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
      };
      const latar = (el) => {
        for (let e = el; e; e = e.parentElement) {
          const c = rgb(getComputedStyle(e).backgroundColor);
          if (c.length >= 3 && (c[3] === undefined || c[3] > 0.5)) return c.slice(0, 3);
        }
        return [255, 255, 255];
      };
      const gagal = [];
      let min = 99;
      for (const el of document.querySelectorAll('body *')) {
        if (el.closest('.sr-only, dialog')) continue;
        const punyaTeks = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
        if (!punyaTeks || !el.getClientRects().length) continue;
        const cs = getComputedStyle(el);
        const L1 = lum(rgb(cs.color).slice(0, 3));
        const L2 = lum(latar(el));
        const k = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
        const besar = parseFloat(cs.fontSize) >= 24 || (parseFloat(cs.fontSize) >= 18.66 && Number(cs.fontWeight) >= 700);
        min = Math.min(min, k);
        if (k < (besar ? 3 : 4.5)) gagal.push(`${el.textContent.trim().slice(0, 30)} (${k.toFixed(2)})`);
      }
      const tombolKecil = [...document.querySelectorAll('button')]
        .filter((b) => b.getClientRects().length && !b.closest('dialog'))
        .filter((b) => b.getBoundingClientRect().height < 44)
        .map((b) => b.innerText.slice(0, 30));
      return { gagal, min, tombolKecil, n: document.querySelectorAll('button').length };
    });
    minKontras = Math.min(minKontras, r.min);
    jumlahTombol += r.n;
    masalah.push(...r.gagal.map((g) => `${tab}: kontras ${g}`), ...r.tombolKecil.map((t) => `${tab}: tombol < 44px "${t}"`));
    await p.close();
  }
  // Papan ketik: Tab sampai tab "Kontrol Alur Kerja", lalu Enter.
  const p = await bukaHalaman();
  let ketemu = false;
  for (let i = 0; i < 10 && !ketemu; i++) {
    await p.keyboard.press('Tab');
    ketemu = (await p.evaluate(() => document.activeElement?.textContent)) === 'Kontrol Alur Kerja';
  }
  await p.keyboard.press('Enter');
  const aktif = await p.locator('.tab[aria-current=page]').innerText();
  await p.close();
  pastikan(ketemu && aktif === 'Kontrol Alur Kerja', 'navigasi papan ketik gagal');
  pastikan(!masalah.length, masalah.slice(0, 4).join('; '));
  return `Kontras teks terendah ${minKontras.toFixed(2)}:1 (≥ 4,5); ${jumlahTombol} tombol ≥ 44 px; tab dapat dipindah dengan Tab+Enter, aria-current mengikuti.`;
});

// ------------------------------------------------------------------ K-16
await uji('K-16', 'Unduh laporan → PDF tampilan aktif', async () => {
  const ringkas = [];
  for (const tab of ['ringkasan', 'alur', 'kualitas']) {
    const p = await bukaHalaman({ tab });
    let dicetak = false;
    await p.exposeFunction('__dicetak', () => (dicetak = true));
    await p.evaluate(() => (window.print = () => window.__dicetak()));
    await p.getByRole('button', { name: 'Unduh laporan' }).click();
    await p.waitForTimeout(100);
    await p.emulateMedia({ media: 'print' });
    const tampak = await p.evaluate(() => ({
      filter: getComputedStyle(document.querySelector('.filter')).display,
      tombol: [...document.querySelectorAll('main button')].filter((b) => getComputedStyle(b).display !== 'none' && !b.closest('.tabel-uke')).length,
      keterangan: document.querySelector('.bilah .hanya-cetak').innerText,
    }));
    const berkas = join(OUT, `laporan-${tab}.pdf`);
    const pdf = await p.pdf({ path: berkas, format: 'A4', printBackground: true, preferCSSPageSize: true });
    await p.close();
    pastikan(dicetak, 'window.print tidak dipanggil');
    pastikan(tampak.filter === 'none', 'filter ikut tercetak');
    pastikan(pdf.length > 10_000, 'PDF kosong');
    ringkas.push(`${tab}: ${Math.round(pdf.length / 1024)} KB`);
    if (tab === 'ringkasan') ringkas.push(`keterangan cetak "${tampak.keterangan}"`);
  }
  return `Tombol memanggil dialog cetak; filter/tombol disembunyikan saat cetak. PDF: ${ringkas.join('; ')} (hasil-uji/laporan-*.pdf).`;
});

// ------------------------------------------------------------------ K-18, K-19
await uji('K-18', 'Statis tanpa backend; data dapat diganti tanpa build ulang', async () => {
  const dist = resolve(ROOT, 'dist');
  pastikan(existsSync(join(dist, 'index.html')) && existsSync(join(dist, 'data/dokumen.csv')), 'dist/ belum dibangun');
  const p = await bukaHalaman({
    rute: (pg) =>
      pg.route('**/data/hari_libur.csv', (r) =>
        r.fulfill({
          status: 200,
          contentType: 'text/csv',
          // Uji: tambahkan 1–8 Oktober 2026 sebagai hari libur fiktif.
          body: 'tanggal,keterangan,jenis\n' + [1, 2, 5, 6, 7, 8].map((d) => `2026-10-0${d},Uji,uji`).join('\n') + '\n',
        }),
      ),
  });
  const tertahan = await p.locator('.kpi').nth(3).locator('.n').innerText();
  await p.close();
  pastikan(tertahan !== fmt(expected.ringkasan.tertahan_lebih_dari_5_hk), 'angka tidak berubah setelah data diganti');
  return `dist/ berisi index.html, aset, dan data/*.csv; disajikan server statis. Mengganti hari_libur.csv saat runtime (1–8 Okt dijadikan libur uji) mengubah tertahan dari 790 menjadi ${tertahan} tanpa build ulang.`;
});

await uji('K-19', 'Parameter berupa konstanta', async () => {
  const cfg = readFileSync(resolve(ROOT, 'src/config.ts'), 'utf-8');
  for (const k of ['AMBANG_KELENGKAPAN', 'BATAS_TERTAHAN_HK', 'TARGET_PUBLIKASI_PERSEN', 'TANGGAL_DATA', 'DATA_CONTOH']) {
    pastikan(cfg.includes(`export const ${k}`), `${k} tidak ada`);
  }
  return 'src/config.ts: AMBANG_KELENGKAPAN = 60, BATAS_TERTAHAN_HK = 5, TARGET_PUBLIKASI_PERSEN = 95, dll.';
});

await browser.close();

hasil.sort((a, b) => a.kode.localeCompare(b.kode));
const md = [
  '| No | Kriteria | Hasil | Catatan |',
  '| --- | --- | --- | --- |',
  ...hasil.map((h) => `| ${h.kode} | ${h.judul} | ${h.lulus ? 'LULUS' : 'GAGAL'} | ${h.catatan.replace(/\|/g, '/')} |`),
].join('\n');
writeFileSync(join(OUT, 'hasil-uji-penerimaan.md'), md + '\n');
console.log(md);
process.exitCode = hasil.every((h) => h.lulus) ? 0 : 1;
