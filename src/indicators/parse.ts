import Papa from 'papaparse';
import type { Dataset, Dokumen, HariLibur, KamusTag, Riwayat, Snapshot, TagDokumen, UnitKerja } from './types';

type Baris = Record<string, string>;

/** Kolom wajib setiap berkas (docs/spesifikasi.md bagian 3). Kolom tambahan diabaikan. */
export const KOLOM_WAJIB = {
  'dokumen.csv': [
    'dokumen_id', 'judul', 'sumber', 'menu_program', 'uke1', 'uke2', 'pic_uke', 'status_saat_ini', 'tgl_dibuat',
    'tgl_status_terakhir', 'tgl_publish', 'skor_metadata', 'skor_dimensi_1', 'skor_dimensi_2', 'skor_dimensi_3',
    'skor_dimensi_4', 'skor_dimensi_5', 'skor_dimensi_6', 'skor_dimensi_7', 'tgl_pembaruan_terakhir', 'hash_konten',
    'ocr_berhasil',
  ],
  'riwayat_status.csv': ['dokumen_id', 'status_dari', 'status_ke', 'tgl_perubahan', 'diubah_oleh'],
  'unit_kerja.csv': ['uke1', 'uke2'],
  'hari_libur.csv': ['tanggal', 'keterangan', 'jenis'],
  'snapshot_bulanan.csv': [
    'tanggal_snapshot', 'total_aset', 'terpublikasi', 'dalam_proses_entri', 'tidak_tayang', 'tertahan_lebih_dari_5_hk',
  ],
  'tag_dokumen.csv': ['dokumen_id', 'tag'],
  'kamus_tag.csv': ['tag_varian', 'tag_baku', 'jenis'],
} as const;

export type NamaBerkas = keyof typeof KOLOM_WAJIB;

function bacaCsv(teks: string, berkas: NamaBerkas): Baris[] {
  const hasil = Papa.parse<Baris>(teks.replace(/^\uFEFF/, ''), { header: true, skipEmptyLines: true });
  if (hasil.errors.length) {
    const e = hasil.errors[0];
    throw new Error(`${berkas}: CSV tidak valid (baris ${(e.row ?? 0) + 2}): ${e.message}`);
  }
  const ada = new Set(hasil.meta.fields ?? []);
  const kurang = KOLOM_WAJIB[berkas].filter((k) => !ada.has(k));
  if (kurang.length) throw new Error(`${berkas}: kolom wajib tidak ditemukan: ${kurang.join(', ')}.`);
  return hasil.data;
}

const angka = (s: string) => (s === '' || s == null ? NaN : Number(s));

export function bacaDokumen(teks: string): Dokumen[] {
  return bacaCsv(teks, 'dokumen.csv').map((r) => ({
    dokumen_id: r.dokumen_id,
    judul: r.judul,
    sumber: r.sumber,
    menu_program: r.menu_program ?? '',
    uke1: r.uke1 ?? '',
    uke2: r.uke2 ?? '',
    pic_uke: r.pic_uke ?? '',
    status_saat_ini: r.status_saat_ini,
    tgl_dibuat: r.tgl_dibuat,
    tgl_status_terakhir: r.tgl_status_terakhir,
    tgl_publish: r.tgl_publish ?? '',
    skor_metadata: angka(r.skor_metadata),
    skor_dimensi: [1, 2, 3, 4, 5, 6, 7].map((k) => angka(r[`skor_dimensi_${k}`])),
    tgl_pembaruan_terakhir: r.tgl_pembaruan_terakhir,
    hash_konten: r.hash_konten,
    ocr_berhasil: String(r.ocr_berhasil).toLowerCase() !== 'false',
  }));
}

export function bacaRiwayat(teks: string): Riwayat[] {
  return bacaCsv(teks, 'riwayat_status.csv') as unknown as Riwayat[];
}

export function bacaUnitKerja(teks: string): UnitKerja[] {
  return bacaCsv(teks, 'unit_kerja.csv') as unknown as UnitKerja[];
}

export function bacaHariLibur(teks: string): HariLibur[] {
  return bacaCsv(teks, 'hari_libur.csv') as unknown as HariLibur[];
}

export function bacaSnapshot(teks: string): Snapshot[] {
  return bacaCsv(teks, 'snapshot_bulanan.csv').map((r) => ({
    tanggal_snapshot: r.tanggal_snapshot,
    total_aset: angka(r.total_aset),
    terpublikasi: angka(r.terpublikasi),
    dalam_proses_entri: angka(r.dalam_proses_entri),
    tidak_tayang: angka(r.tidak_tayang),
    tertahan_lebih_dari_5_hk: angka(r.tertahan_lebih_dari_5_hk),
  }));
}

export function bacaTagDokumen(teks: string): TagDokumen[] {
  return bacaCsv(teks, 'tag_dokumen.csv').map((r) => ({ dokumen_id: r.dokumen_id, tag: r.tag ?? '' }));
}

export function bacaKamusTag(teks: string): KamusTag[] {
  return bacaCsv(teks, 'kamus_tag.csv').map((r) => ({ tag_varian: r.tag_varian ?? '', tag_baku: r.tag_baku ?? '', jenis: r.jenis ?? '' }));
}

export interface TeksCsv {
  dokumen: string;
  riwayat_status: string;
  unit_kerja: string;
  hari_libur: string;
  /** Opsional: tanpa snapshot, "perubahan dibanding bulan lalu" ditampilkan "—". */
  snapshot_bulanan?: string | null;
  /** Opsional: tanpa tag_dokumen.csv, bagian konsistensi tag tidak ditampilkan. */
  tag_dokumen?: string | null;
  /** Opsional: tanpa kamus, semua tag berstatus "belum di kamus". */
  kamus_tag?: string | null;
}

export function bacaDataset(t: TeksCsv): Dataset {
  return {
    dokumen: bacaDokumen(t.dokumen),
    riwayat: bacaRiwayat(t.riwayat_status),
    unitKerja: bacaUnitKerja(t.unit_kerja),
    hariLibur: bacaHariLibur(t.hari_libur),
    snapshot: t.snapshot_bulanan ? bacaSnapshot(t.snapshot_bulanan) : [],
    tagDokumen: t.tag_dokumen ? bacaTagDokumen(t.tag_dokumen) : null,
    kamusTag: t.kamus_tag ? bacaKamusTag(t.kamus_tag) : [],
  };
}

/** Tanggal data dari meta_data.csv (kolom `tanggal_data`, YYYY-MM-DD); null bila kosong atau tidak valid. */
export function bacaTanggalData(teks: string): string | null {
  const hasil = Papa.parse<Baris>(teks.replace(/^﻿/, ''), { header: true, skipEmptyLines: true });
  const t = (hasil.data[0]?.tanggal_data ?? '').trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(t) && !Number.isNaN(Date.parse(`${t}T00:00:00Z`)) ? t : null;
}
