import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  FILTER_AWAL,
  bacaDataset,
  bulatkan,
  hariKerja,
  hitungIndikator,
  pilihDokumen,
  rekonstruksiSnapshot,
  siapkan,
} from '../src/indicators';
import { TANGGAL_DATA } from '../src/config';

const DATA = resolve(__dirname, '../data');
const baca = (f: string) => readFileSync(resolve(DATA, f), 'utf-8');
const expected = JSON.parse(baca('expected_indicators.json'));
const ds = bacaDataset({
  dokumen: baca('dokumen.csv'),
  riwayat_status: baca('riwayat_status.csv'),
  unit_kerja: baca('unit_kerja.csv'),
  hari_libur: baca('hari_libur.csv'),
  snapshot_bulanan: baca('snapshot_bulanan.csv'),
});
const ctx = siapkan(ds, { tanggalData: expected.tanggal_data });
const hasil = hitungIndikator(ctx, FILTER_AWAL);

describe('modul indikator vs data/expected_indicators.json', () => {
  it('tanggal data konfigurasi sama dengan fixture', () => expect(TANGGAL_DATA).toBe(expected.tanggal_data));
  it('parameter', () => {
    expect(hasil.tanggal_data).toBe(expected.tanggal_data);
    expect(hasil.batas_tertahan_hari_kerja).toBe(expected.batas_tertahan_hari_kerja);
    expect(hasil.target_publikasi_persen).toBe(expected.target_publikasi_persen);
  });
  it('pemeriksaan_data', () => expect(hasil.pemeriksaan_data).toEqual(expected.pemeriksaan_data));
  it('ringkasan', () => expect(hasil.ringkasan).toEqual(expected.ringkasan));
  it('status_entri', () => expect(hasil.status_entri).toEqual(expected.status_entri));
  it('tahap', () => expect(hasil.tahap).toEqual(expected.tahap));
  it('uke1 dan uke2', () => expect(hasil.uke1).toEqual(expected.uke1));
  it('dokumen_baru_per_bulan_2026', () => {
    expect(hasil.tahun_tren).toBe(2026);
    expect(hasil.dokumen_baru_per_bulan).toEqual(expected.dokumen_baru_per_bulan_2026);
  });
  it('rata_rata_bulanan_bulan_lengkap', () =>
    expect(hasil.rata_rata_bulanan_bulan_lengkap).toBe(expected.rata_rata_bulanan_bulan_lengkap));
  it('dokumen_per_menu_program', () => expect(hasil.dokumen_per_menu_program).toEqual(expected.dokumen_per_menu_program));
  it('snapshot_bulanan.csv sama dengan fixture', () => expect(ds.snapshot).toEqual(expected.snapshot_bulanan));
  it('snapshot_bulanan dapat direkonstruksi dari riwayat', () => {
    const tgl = expected.snapshot_bulanan.map((s: { tanggal_snapshot: string }) => s.tanggal_snapshot);
    expect(tgl.map((d: string) => rekonstruksiSnapshot(ds, d))).toEqual(expected.snapshot_bulanan);
  });
  it('perubahan_dibanding_akhir_bulan_lalu', () => {
    expect(hasil.snapshot_pembanding?.tanggal_snapshot).toBe('2026-09-30');
    expect(hasil.perubahan_dibanding_akhir_bulan_lalu).toEqual(expected.perubahan_dibanding_akhir_bulan_lalu);
  });
  it('kualitas', () => expect(hasil.kualitas).toEqual(expected.kualitas));
});

describe('aturan rinci', () => {
  const libur = new Set(['2026-08-17']);
  it('HK(a, b) pada rentang (a, b]', () => {
    expect(hariKerja('2026-10-08', '2026-10-08', libur)).toBe(0); // berubah hari ini → 0
    expect(hariKerja('2026-10-07', '2026-10-08', libur)).toBe(1);
    expect(hariKerja('2026-10-02', '2026-10-05', libur)).toBe(1); // Jumat → Senin: Sabtu, Minggu tidak dihitung
    expect(hariKerja('2026-08-14', '2026-08-18', libur)).toBe(1); // Senin 17 Agustus libur
  });
  it('pembulatan meniru acuan (setengah ke genap pada nilai biner tepat)', () => {
    expect(bulatkan(0.25, 1)).toBe(0.2);
    expect(bulatkan(0.35, 1)).toBe(0.3); // 0,35 tersimpan sebagai 0,34999…
    expect(bulatkan(53.0713, 1)).toBe(53.1);
  });
  it('filter UKE I hanya memuat entri dan konsisten dengan tabel', () => {
    const u1 = 'Inspektorat Utama';
    const h = hitungIndikator(ctx, { ...FILTER_AWAL, uke1: u1 });
    expect(h.ringkasan.menu_program).toBe(0);
    expect(h.ringkasan.total_aset).toBe(expected.uke1[u1].total);
    expect(h.ringkasan.terpublikasi).toBe(expected.uke1[u1].publish);
    expect(h.ringkasan.dalam_proses_entri).toBe(expected.uke1[u1].dalam_proses);
    expect(h.ringkasan.tertahan_lebih_dari_5_hk).toBe(expected.uke1[u1].lebih_dari_5_hk);
    expect(h.perubahan_dibanding_akhir_bulan_lalu).toBeNull();
  });
  it('filter sumber dan periode menjumlah ke total', () => {
    const e = hitungIndikator(ctx, { ...FILTER_AWAL, sumber: 'ENTRI' }).ringkasan.total_aset;
    const p = hitungIndikator(ctx, { ...FILTER_AWAL, sumber: 'MENU_PROGRAM' }).ringkasan.total_aset;
    expect(e + p).toBe(expected.ringkasan.total_aset);
    const tahun = [2023, 2024, 2025, 2026].map((y) => pilihDokumen(ctx, { ...FILTER_AWAL, periode: y }).length);
    expect(tahun.reduce((a, b) => a + b, 0)).toBe(expected.ringkasan.total_aset);
  });
  it('tanpa snapshot, perubahan bernilai null (ditampilkan "—")', () => {
    const c = siapkan({ ...ds, snapshot: [] }, { tanggalData: expected.tanggal_data });
    expect(hitungIndikator(c, FILTER_AWAL).perubahan_dibanding_akhir_bulan_lalu).toBeNull();
  });
  it('persamaan total gagal terdeteksi bila status tidak dikenal', () => {
    const rusak = { ...ds, dokumen: ds.dokumen.map((d, i) => (i === 0 ? { ...d, status_saat_ini: 'ARSIP' } : d)) };
    const pd = siapkan(rusak, { tanggalData: expected.tanggal_data }).pemeriksaan;
    expect(pd.persamaan_total).toBe(false);
    expect(pd.status_valid).toBe(false);
  });
});

describe('validasi berkas', () => {
  it('kolom wajib yang hilang menghasilkan pesan yang jelas', () => {
    const tanpaKolom = baca('dokumen.csv').replace('hash_konten,', 'hash,');
    expect(() =>
      bacaDataset({
        dokumen: tanpaKolom,
        riwayat_status: baca('riwayat_status.csv'),
        unit_kerja: baca('unit_kerja.csv'),
        hari_libur: baca('hari_libur.csv'),
      }),
    ).toThrow('dokumen.csv: kolom wajib tidak ditemukan: hash_konten.');
  });
});
