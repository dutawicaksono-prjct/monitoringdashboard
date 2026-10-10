// Menambah atau memperbarui baris snapshot_bulanan.csv dari riwayat status (docs/spesifikasi.md bagian 4.6).
// Jalankan sekali setelah akhir bulan. Pemakaian: npm run snapshot [-- 2026-10-31] [--data folder]
// Tanpa argumen tanggal: akhir bulan sebelum tanggal data (meta_data.csv, atau TANGGAL_DATA di src/config.ts).
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { tanggalDataFolder } from './tanggal-data';
import { akhirBulanLalu, bacaDataset, rekonstruksiSnapshot, type Snapshot } from '../src/indicators';

const args = process.argv.slice(2);
const iData = args.indexOf('--data');
const folder = resolve(iData > -1 ? args[iData + 1] : 'data');
const daftarTanggal = args.filter((a, i) => /^\d{4}-\d{2}-\d{2}$/.test(a) && args[i - 1] !== '--data');
if (!daftarTanggal.length) daftarTanggal.push(akhirBulanLalu(tanggalDataFolder(folder)));

const baca = (f: string) => readFileSync(resolve(folder, f), 'utf-8');
const berkas = resolve(folder, 'snapshot_bulanan.csv');
const ds = bacaDataset({
  dokumen: baca('dokumen.csv'),
  riwayat_status: baca('riwayat_status.csv'),
  unit_kerja: baca('unit_kerja.csv'),
  hari_libur: baca('hari_libur.csv'),
  snapshot_bulanan: existsSync(berkas) ? baca('snapshot_bulanan.csv') : null,
});

const peta = new Map<string, Snapshot>(ds.snapshot.map((s) => [s.tanggal_snapshot, s]));
for (const d of daftarTanggal) {
  const s = rekonstruksiSnapshot(ds, d);
  const lama = peta.get(d);
  peta.set(d, s);
  console.log(`${lama ? 'Perbarui' : 'Tambah '} ${d}: total ${s.total_aset}, terpublikasi ${s.terpublikasi}, ` +
    `dalam proses ${s.dalam_proses_entri}, tidak tayang ${s.tidak_tayang}, tertahan > 5 HK ${s.tertahan_lebih_dari_5_hk}`);
}

const kolom: (keyof Snapshot)[] = ['tanggal_snapshot', 'total_aset', 'terpublikasi', 'dalam_proses_entri', 'tidak_tayang', 'tertahan_lebih_dari_5_hk'];
const isi = [kolom.join(','), ...[...peta.values()].sort((a, b) => a.tanggal_snapshot.localeCompare(b.tanggal_snapshot)).map((s) => kolom.map((k) => s[k]).join(','))];
writeFileSync(berkas, isi.join('\n') + '\n');
console.log(`Tersimpan: ${berkas}`);
