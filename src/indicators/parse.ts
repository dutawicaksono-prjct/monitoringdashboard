import Papa from 'papaparse';
import type { Dataset, Dokumen, HariLibur, Riwayat, Snapshot, UnitKerja } from './types';

type Baris = Record<string, string>;

function bacaCsv(teks: string): Baris[] {
  const hasil = Papa.parse<Baris>(teks.replace(/^﻿/, ''), { header: true, skipEmptyLines: true });
  if (hasil.errors.length) {
    const e = hasil.errors[0];
    throw new Error(`CSV tidak valid (baris ${(e.row ?? 0) + 2}): ${e.message}`);
  }
  return hasil.data;
}

const angka = (s: string) => (s === '' || s == null ? NaN : Number(s));

export function bacaDokumen(teks: string): Dokumen[] {
  return bacaCsv(teks).map((r) => ({
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
  return bacaCsv(teks) as unknown as Riwayat[];
}

export function bacaUnitKerja(teks: string): UnitKerja[] {
  return bacaCsv(teks) as unknown as UnitKerja[];
}

export function bacaHariLibur(teks: string): HariLibur[] {
  return bacaCsv(teks) as unknown as HariLibur[];
}

export function bacaSnapshot(teks: string): Snapshot[] {
  return bacaCsv(teks).map((r) => ({
    tanggal_snapshot: r.tanggal_snapshot,
    total_aset: angka(r.total_aset),
    terpublikasi: angka(r.terpublikasi),
    dalam_proses_entri: angka(r.dalam_proses_entri),
    tidak_tayang: angka(r.tidak_tayang),
    tertahan_lebih_dari_5_hk: angka(r.tertahan_lebih_dari_5_hk),
  }));
}

export interface TeksCsv {
  dokumen: string;
  riwayat_status: string;
  unit_kerja: string;
  hari_libur: string;
  /** Opsional: tanpa snapshot, "perubahan dibanding bulan lalu" ditampilkan "—". */
  snapshot_bulanan?: string | null;
}

export function bacaDataset(t: TeksCsv): Dataset {
  return {
    dokumen: bacaDokumen(t.dokumen),
    riwayat: bacaRiwayat(t.riwayat_status),
    unitKerja: bacaUnitKerja(t.unit_kerja),
    hariLibur: bacaHariLibur(t.hari_libur),
    snapshot: t.snapshot_bulanan ? bacaSnapshot(t.snapshot_bulanan) : [],
  };
}
