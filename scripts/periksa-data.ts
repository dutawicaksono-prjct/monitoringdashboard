// Pemeriksaan data sebelum dipasang (docs/spesifikasi.md bagian 8.2) dengan rincian baris bermasalah.
// Pemakaian: npm run periksa-data [-- --data folder] [--tanggal YYYY-MM-DD]
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { tanggalDataFolder } from './tanggal-data';
import {
  FILTER_AWAL,
  LABEL_PEMERIKSAAN,
  STATUS_ENTRI,
  akhirBulanLalu,
  bacaDataset,
  hitungIndikator,
  isProses,
  siapkan,
  tanggalWib,
  type PemeriksaanData,
} from '../src/indicators';

const arg = (nama: string, bawaan: string) => {
  const i = process.argv.indexOf(nama);
  return i > -1 ? process.argv[i + 1] : bawaan;
};
const folder = resolve(arg('--data', 'data'));
const TANGGAL_DATA = tanggalDataFolder(folder);
const tanggal = arg('--tanggal', TANGGAL_DATA);
const baca = (f: string) => readFileSync(resolve(folder, f), 'utf-8');
const opsional = (f: string) => (existsSync(resolve(folder, f)) ? baca(f) : null);

let ds;
try {
  ds = bacaDataset({
    dokumen: baca('dokumen.csv'),
    riwayat_status: baca('riwayat_status.csv'),
    unit_kerja: baca('unit_kerja.csv'),
    hari_libur: baca('hari_libur.csv'),
    snapshot_bulanan: opsional('snapshot_bulanan.csv'),
    tag_dokumen: opsional('tag_dokumen.csv'),
    kamus_tag: opsional('kamus_tag.csv'),
    pemetaan_tag: opsional('pemetaan_tag.csv'),
  });
} catch (e) {
  console.error(`GAGAL MEMBACA DATA: ${(e as Error).message}`);
  process.exit(1);
}

const ctx = siapkan(ds, { tanggalData: tanggal });
const ind = hitungIndikator(ctx, FILTER_AWAL);
const p = ctx.pemeriksaan;
const contoh = (xs: string[]) => (xs.length ? ` Contoh: ${xs.slice(0, 5).join(', ')}${xs.length > 5 ? ` (+${xs.length - 5} lainnya)` : ''}` : '');

// Rincian untuk pemeriksaan yang gagal.
const entri = ds.dokumen.filter((d) => d.sumber === 'ENTRI');
const ref = new Map(ds.unitKerja.map((u) => [u.uke2, u.uke1]));
const statusSah = new Set<string>(STATUS_ENTRI);
const terakhir = new Map<string, { t: number; s: string }>();
for (const r of ds.riwayat) {
  const t = Date.parse(r.tgl_perubahan);
  const c = terakhir.get(r.dokumen_id);
  if (!c || t >= c.t) terakhir.set(r.dokumen_id, { t, s: r.status_ke });
}
const hitungId = new Map<string, number>();
for (const d of ds.dokumen) hitungId.set(d.dokumen_id, (hitungId.get(d.dokumen_id) ?? 0) + 1);

const rincian: Record<keyof PemeriksaanData, () => string> = {
  persamaan_total: () => {
    const r = ind.ringkasan;
    return ` ${r.total_aset} ≠ ${r.terpublikasi} + ${r.dalam_proses_entri} + ${r.tidak_tayang} (biasanya akibat status tidak dikenal).`;
  },
  dokumen_id_unik: () => contoh([...hitungId].filter(([, n]) => n > 1).map(([id]) => id)),
  uke2_ada_di_referensi: () => contoh([...new Set(entri.filter((d) => !ref.has(d.uke2)).map((d) => `"${d.uke2}"`))]),
  uke1_turunan_uke2: () => contoh(entri.filter((d) => ref.has(d.uke2) && ref.get(d.uke2) !== d.uke1).map((d) => d.dokumen_id)),
  status_valid: () =>
    contoh(
      ds.dokumen
        .filter((d) => (d.sumber === 'ENTRI' ? !statusSah.has(d.status_saat_ini) : !['PUBLISH', 'UNPUBLISH'].includes(d.status_saat_ini)))
        .map((d) => `${d.dokumen_id}=${d.status_saat_ini}`),
    ),
  riwayat_sesuai_status: () =>
    contoh(entri.filter((d) => terakhir.get(d.dokumen_id)?.s !== d.status_saat_ini).map((d) => d.dokumen_id)),
  tanggal_logis: () =>
    contoh(
      entri
        .filter((d) => Date.parse(d.tgl_status_terakhir) < Date.parse(d.tgl_dibuat) || tanggalWib(d.tgl_status_terakhir) > tanggal)
        .map((d) => d.dokumen_id),
    ),
  snapshot_persamaan_total: () =>
    contoh(ds.snapshot.filter((s) => s.total_aset !== s.terpublikasi + s.dalam_proses_entri + s.tidak_tayang).map((s) => s.tanggal_snapshot)),
  tag_dokumen_ada_di_dokumen: () => {
    const id = new Set(ds.dokumen.map((d) => d.dokumen_id));
    return contoh([...new Set((ds.tagDokumen ?? []).filter((t) => !id.has(t.dokumen_id)).map((t) => t.dokumen_id))]);
  },
  kamus_tag_valid: () =>
    ' Periksa kamus_tag.csv: jenis harus ejaan, singkatan, sinonim, bentuk, atau bahasa (bentuk baku hanya dari daftar bawaan ' +
    'src/indicators/kosakata-baku.json), tag_baku harus tag baku bawaan, dan varian tidak boleh mengacu ke konsep lain.',
  pemetaan_tag_valid: () =>
    ' Periksa pemetaan_tag.csv: tag_baku harus tag baku bawaan, jenis makna atau bahasa, skor angka 0–1. ' +
    'Buat ulang dengan: python tools/petakan_tag.py',
};

console.log(`Pemeriksaan data · folder ${folder} · tanggal data ${tanggal}\n`);
let gagal = 0;
for (const k of Object.keys(p) as (keyof PemeriksaanData)[]) {
  if (!p[k]) gagal++;
  console.log(`${p[k] ? '  [OK]   ' : '  [GAGAL]'} ${LABEL_PEMERIKSAAN[k]}${p[k] ? '' : `.${rincian[k]()}`}`);
}

// Peringatan (tidak menggagalkan): hal yang membuat angka kurang akurat.
const peringatan: string[] = [];
const tahunLibur = new Set(ds.hariLibur.map((h) => h.tanggal.slice(0, 4)));
const tahunProses = new Set(ctx.dokumen.filter(isProses).map((d) => tanggalWib(d.tgl_status_terakhir).slice(0, 4)));
tahunProses.add(tanggal.slice(0, 4));
for (const y of [...tahunProses].sort()) {
  if (!tahunLibur.has(y)) peringatan.push(`hari_libur.csv tidak memuat tanggal tahun ${y}; umur tertahan dokumen sejak ${y} bisa terlalu besar.`);
}
if (!ds.snapshot.some((s) => s.tanggal_snapshot === akhirBulanLalu(tanggal))) {
  peringatan.push(`snapshot_bulanan.csv tidak memuat ${akhirBulanLalu(tanggal)}; "perubahan dibanding akhir bulan lalu" akan tampil "—". Jalankan: npm run snapshot -- ${akhirBulanLalu(tanggal)}`);
}
const tanpaSkor = ds.dokumen.filter((d) => Number.isNaN(d.skor_metadata) || d.skor_dimensi.some(Number.isNaN)).length;
if (tanpaSkor) peringatan.push(`${tanpaSkor} dokumen memiliki skor kosong atau bukan angka.`);
if (!ds.tagDokumen) peringatan.push('tag_dokumen.csv tidak ada; bagian konsistensi tag tidak ditampilkan.');
else if (!ds.pemetaanTag.length) peringatan.push('pemetaan_tag.csv tidak ada; tag di luar daftar baku tidak dipetakan menurut makna. Jalankan: python tools/petakan_tag.py');
if (tanggal !== TANGGAL_DATA) peringatan.push(`Tanggal yang diperiksa (${tanggal}) berbeda dengan tanggal data (meta_data.csv atau src/config.ts: ${TANGGAL_DATA}).`);

console.log(`\nRingkasan: ${ind.ringkasan.total_aset} dokumen (entri ${ind.ringkasan.entri}, Menu Program ${ind.ringkasan.menu_program}), ` +
  `${ds.riwayat.length} baris riwayat, ${ds.unitKerja.length} UKE II, ${ds.hariLibur.length} hari libur, ${ds.snapshot.length} snapshot.`);
if (peringatan.length) {
  console.log('\nPeringatan:');
  for (const w of peringatan) console.log(`  - ${w}`);
}
console.log(gagal ? `\nHASIL: ${gagal} pemeriksaan GAGAL. Perbaiki data sebelum dipasang.` : '\nHASIL: semua pemeriksaan terpenuhi.');
process.exit(gagal ? 1 : 0);
