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
  jalanMenujuTarget,
  trenCapaian,
  sebaranUmur,
  bebanPic,
  masalahPerUke1,
  kurangMenujuTarget,
  bacaTanggalData,
  normalTag,
  jaroWinkler,
  singkatanDari,
  bacaKamusTag,
  periksaTag,
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
  tag_dokumen: baca('tag_dokumen.csv'),
  kamus_tag: baca('kamus_tag.csv'),
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

describe('indikator pendukung keputusan (spesifikasi 4.8)', () => {
  const sel = pilihDokumen(ctx, FILTER_AWAL);
  it('jalan menuju target: alur saja tidak cukup', () => {
    const j = jalanMenujuTarget(sel, hasil.ringkasan, 95);
    expect(j.target_dokumen).toBe(4810);
    expect(j.kekurangan).toBe(2123);
    expect(j.dari_alur).toBe(1202);
    expect(j.perlu_keputusan).toBe(921);
    expect(j.persen_maks_via_alur).toBe(76.8);
    expect(j.ditolak_entri + j.unpublish_entri + j.unpublish_menu_program).toBe(hasil.ringkasan.tidak_tayang);
    expect(j.unpublish_menu_teratas).toEqual({ nama: 'JDIH', jumlah: 962 });
  });
  it('tren capaian dari snapshot akhir bulan', () => {
    const t = trenCapaian(ds.snapshot, expected.tanggal_data, hasil.ringkasan, 95);
    expect(t.titik.map((x) => x.tanggal)).toEqual(['2026-07-31', '2026-08-31', '2026-09-30', '2026-10-08']);
    expect(t.titik.map((x) => x.kekurangan)).toEqual([2115, 2088, 2173, 2123]);
    expect(t.laju_kekurangan_per_bulan).toBe(29);
    expect(t.perkiraan_tercapai).toBeNull();
  });
  it('proyeksi bila kekurangan menyempit', () => {
    const snap = [
      { tanggal_snapshot: '2026-08-31', total_aset: 1000, terpublikasi: 500, dalam_proses_entri: 0, tidak_tayang: 500, tertahan_lebih_dari_5_hk: 0 },
      { tanggal_snapshot: '2026-09-30', total_aset: 1000, terpublikasi: 600, dalam_proses_entri: 0, tidak_tayang: 400, tertahan_lebih_dari_5_hk: 0 },
    ];
    const r = { ...hasil.ringkasan, total_aset: 1000, terpublikasi: 650, persen_publish: 65, kekurangan_menuju_target: 300 };
    const t = trenCapaian(snap, '2026-10-08', r, 95);
    expect(t.laju_kekurangan_per_bulan).toBe(-100);
    expect(t.bulan_menuju_target).toBe(3);
    expect(t.perkiraan_tercapai).toBe('2027-01');
  });
  it('sebaran umur menjumlah ke dalam proses', () => {
    const s = sebaranUmur(sel, 5);
    expect(s.dalam_batas + s.hk_6_10 + s.hk_11_20 + s.hk_lebih_20).toBe(hasil.ringkasan.dalam_proses_entri);
    expect(s.hk_6_10 + s.hk_11_20 + s.hk_lebih_20).toBe(hasil.ringkasan.tertahan_lebih_dari_5_hk);
  });
  it('beban per PIC menjumlah ke tahap PIC UKE', () => {
    const b = bebanPic(sel);
    expect(b.baris.reduce((a, x) => a + x.jumlah, 0) + b.tanpa_pic.length).toBe(hasil.tahap.PIC_UKE.jumlah);
    expect(b.tanpa_pic.length).toBe(31);
  });
  it('masalah per UKE I menjumlah ke total entri', () => {
    const m = masalahPerUke1(ctx, sel);
    expect(m.length).toBe(12);
    expect(m.reduce((a, x) => a + x.masalah.tanpa_pic, 0)).toBe(hasil.kualitas.masalah.tanpa_pic);
  });
  it('kurang menuju target', () => {
    expect(kurangMenujuTarget(5063, 2687, 95)).toBe(2123);
    expect(kurangMenujuTarget(10, 10, 95)).toBe(0);
  });
});

describe('konsistensi tagging (spesifikasi 1.4)', () => {
  it('bentuk pembanding mengabaikan huruf besar, tanda baca, dan spasi', () => {
    expect(normalTag('  Perubahan-Iklim ')).toBe('perubahan iklim');
    expect(normalTag('Tata  Kelola/')).toBe('tata kelola');
  });
  it('kemiripan ejaan dan singkatan', () => {
    expect(bulatkan(jaroWinkler('martha', 'marhta'), 3)).toBe(0.961);
    expect(jaroWinkler('pendidkan', 'pendidikan')).toBeGreaterThanOrEqual(0.92);
    expect(jaroWinkler('investasi', 'infrastruktur')).toBeLessThan(0.92);
    expect(singkatanDari('umkm', 'usaha mikro kecil dan menengah')).toBe(true);
    expect(singkatanDari('rpjmn', 'rencana pembangunan jangka menengah nasional')).toBe(true);
    expect(singkatanDari('ukm', 'usaha mikro kecil dan menengah')).toBe(false);
  });
  it('angka tag per UKE I menjumlah ke total entri', () => {
    const entri = pilihDokumen(ctx, { ...FILTER_AWAL, sumber: 'ENTRI' });
    const t = hitungIndikator(ctx, { ...FILTER_AWAL, sumber: 'ENTRI' }).kualitas.tag!;
    let n = 0;
    for (const u of new Set(entri.map((d) => d.uke1))) n += hitungIndikator(ctx, { ...FILTER_AWAL, uke1: u }).kualitas.tag!.penggunaan_tag;
    expect(n).toBe(t.penggunaan_tag);
  });
  it('tanpa tag_dokumen.csv bagian tag kosong dan masalah tag 0', () => {
    const c = siapkan({ ...ds, tagDokumen: null }, { tanggalData: expected.tanggal_data });
    const q = hitungIndikator(c, FILTER_AWAL).kualitas;
    expect(q.tag).toBeNull();
    expect(q.masalah.tag_tidak_baku).toBe(0);
    expect(c.pemeriksaan.tag_dokumen_ada_di_dokumen).toBe(true);
  });
  it('kamus berantai atau jenis tidak sah terdeteksi', () => {
    const kamus = bacaKamusTag('tag_varian,tag_baku,jenis\nprk,pembangunan rendah karbon,singkatan\nPRK,program,singkatan\n');
    expect(periksaTag({ ...ds, kamusTag: kamus }).kamus_tag_valid).toBe(false);
    const jenis = bacaKamusTag('tag_varian,tag_baku,jenis\nx,x,baku\ny,x,typo\n');
    expect(periksaTag({ ...ds, kamusTag: jenis }).kamus_tag_valid).toBe(false);
  });
});

describe('meta_data.csv', () => {
  it('membaca tanggal data yang valid dan menolak yang tidak valid', () => {
    expect(bacaTanggalData(baca('meta_data.csv'))).toBe(expected.tanggal_data);
    expect(bacaTanggalData('tanggal_data\n')).toBeNull();
    expect(bacaTanggalData('tanggal_data\n08/10/2026\n')).toBeNull();
  });
});
