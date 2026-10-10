// Modul indikator: fungsi murni tanpa ketergantungan UI. Rumus mengikuti docs/spesifikasi.md bagian 4
// dan implementasi acuan tools/compute_indicators.py; diuji terhadap data/expected_indicators.json.
import {
  AMBANG_KELENGKAPAN,
  AMBANG_MENDEKATI_HK,
  BATAS_BELUM_DIPERBARUI_BULAN,
  BATAS_TERTAHAN_HK,
  TARGET_PUBLIKASI_PERSEN,
} from '../config';
import { persen, rataRata, rataRataSkor } from './angka';
import { hitungTag, periksaTag, siapkanTag, type IndeksTag } from './tag';
import { akhirBulanLalu, akhirHariWib, bulanWib, hariKerja, kurangiBulan, tanggalWib } from './tanggal';
import {
  STATUS_ENTRI,
  STATUS_MENU_PROGRAM,
  STATUS_PROSES,
  STATUS_TIDAK_TAYANG,
  type BarisUke1,
  type BarisUnit,
  type Dataset,
  type DokumenSiap,
  type Filter,
  type Indikator,
  type Kualitas,
  type PemeriksaanData,
  type Ringkasan,
  type Snapshot,
  type StatusProses,
  type StatusWaktu,
  type Tahap,
} from './types';

export interface Opsi {
  tanggalData: string;
  batasHk: number;
  ambangMendekatiHk: number;
  targetPersen: number;
  ambangKelengkapan: number;
  bulanBelumDiperbarui: number;
}

export const OPSI_BAWAAN: Omit<Opsi, 'tanggalData'> = {
  batasHk: BATAS_TERTAHAN_HK,
  ambangMendekatiHk: AMBANG_MENDEKATI_HK,
  targetPersen: TARGET_PUBLIKASI_PERSEN,
  ambangKelengkapan: AMBANG_KELENGKAPAN,
  bulanBelumDiperbarui: BATAS_BELUM_DIPERBARUI_BULAN,
};

const PROSES = new Set<string>(STATUS_PROSES);
const TIDAK_TAYANG = new Set<string>(STATUS_TIDAK_TAYANG);

export const isProses = (d: { sumber: string; status_saat_ini: string }) =>
  d.sumber === 'ENTRI' && PROSES.has(d.status_saat_ini);
export const isTidakTayang = (d: { sumber: string; status_saat_ini: string }) =>
  d.sumber === 'ENTRI' ? TIDAK_TAYANG.has(d.status_saat_ini) : d.status_saat_ini === 'UNPUBLISH';
export const isPublish = (d: { status_saat_ini: string }) => d.status_saat_ini === 'PUBLISH';

/** Data yang sudah disiapkan untuk satu tanggal data: umur tertahan dihitung sekali. */
export interface Konteks {
  ds: Dataset;
  opsi: Opsi;
  libur: ReadonlySet<string>;
  dokumen: DokumenSiap[];
  /** Jumlah kemunculan tiap hash_konten di seluruh KOMENS (dasar kandidat duplikat). */
  jumlahHash: ReadonlyMap<string, number>;
  /** null bila tag_dokumen.csv tidak tersedia. */
  tag: IndeksTag | null;
  pemeriksaan: PemeriksaanData;
}

export function siapkan(ds: Dataset, opsi: Partial<Opsi> & { tanggalData: string }): Konteks {
  const o: Opsi = { ...OPSI_BAWAAN, ...opsi };
  const libur = new Set(ds.hariLibur.map((h) => h.tanggal.trim()));
  const dokumen: DokumenSiap[] = ds.dokumen.map((d) => {
    const lama = isProses(d) ? hariKerja(tanggalWib(d.tgl_status_terakhir), o.tanggalData, libur) : null;
    return {
      ...d,
      tahun_dibuat: Number(tanggalWib(d.tgl_dibuat).slice(0, 4)),
      lama_hk: lama,
      lewat_batas: lama !== null && lama > o.batasHk,
    };
  });
  const jumlahHash = new Map<string, number>();
  for (const d of ds.dokumen) jumlahHash.set(d.hash_konten, (jumlahHash.get(d.hash_konten) ?? 0) + 1);
  return { ds, opsi: o, libur, dokumen, jumlahHash, tag: siapkanTag(ds), pemeriksaan: periksaData(ds, o.tanggalData) };
}

// ------------------------------------------------------------------ pemeriksaan data (bagian 8.2)

export const LABEL_PEMERIKSAAN: Record<keyof PemeriksaanData, string> = {
  persamaan_total: 'Total aset = terpublikasi + dalam proses (entri) + tidak tayang',
  dokumen_id_unik: 'ID dokumen unik',
  uke2_ada_di_referensi: 'Setiap UKE II dokumen entri ada di referensi unit kerja',
  uke1_turunan_uke2: 'UKE I dokumen entri sesuai induk UKE II-nya',
  status_valid: 'Status dokumen sesuai daftar status yang sah',
  riwayat_sesuai_status: 'Status terakhir pada riwayat sama dengan status saat ini',
  tanggal_logis: 'Tanggal status terakhir tidak sebelum tanggal dibuat dan tidak melewati tanggal data',
  snapshot_persamaan_total: 'Persamaan total terpenuhi pada setiap snapshot bulanan',
  tag_dokumen_ada_di_dokumen: 'Setiap dokumen di tag_dokumen.csv ada di dokumen.csv',
  kamus_tag_valid: 'Kamus tag: jenis sah, satu bentuk baku per varian, dan setiap bentuk baku terdaftar',
};

export function periksaData(ds: Dataset, tanggalData: string): PemeriksaanData {
  const entri = ds.dokumen.filter((d) => d.sumber === 'ENTRI');
  const prog = ds.dokumen.filter((d) => d.sumber === 'MENU_PROGRAM');

  const total = ds.dokumen.length;
  const pub = ds.dokumen.filter(isPublish).length;
  const proses = entri.filter(isProses).length;
  const tt = ds.dokumen.filter(isTidakTayang).length;

  const refUke2 = new Map<string, string>();
  for (const u of ds.unitKerja) refUke2.set(u.uke2, u.uke1);

  const statusEntri = new Set<string>(STATUS_ENTRI);
  const statusProg = new Set<string>(STATUS_MENU_PROGRAM);

  const terakhir = new Map<string, { t: number; status: string }>();
  for (const r of ds.riwayat) {
    const t = Date.parse(r.tgl_perubahan);
    const cur = terakhir.get(r.dokumen_id);
    if (!cur || t >= cur.t) terakhir.set(r.dokumen_id, { t, status: r.status_ke });
  }
  const idEntri = new Set(entri.map((d) => d.dokumen_id));

  return {
    persamaan_total: total === pub + proses + tt,
    dokumen_id_unik: new Set(ds.dokumen.map((d) => d.dokumen_id)).size === total,
    uke2_ada_di_referensi: entri.every((d) => refUke2.has(d.uke2)),
    uke1_turunan_uke2: entri.every((d) => !refUke2.has(d.uke2) || refUke2.get(d.uke2) === d.uke1),
    status_valid:
      entri.every((d) => statusEntri.has(d.status_saat_ini)) && prog.every((d) => statusProg.has(d.status_saat_ini)),
    riwayat_sesuai_status:
      [...terakhir.keys()].every((id) => idEntri.has(id)) &&
      entri.every((d) => terakhir.get(d.dokumen_id)?.status === d.status_saat_ini),
    tanggal_logis: entri.every(
      (d) =>
        Date.parse(d.tgl_status_terakhir) >= Date.parse(d.tgl_dibuat) && tanggalWib(d.tgl_status_terakhir) <= tanggalData,
    ),
    snapshot_persamaan_total: ds.snapshot.every(
      (s) => s.total_aset === s.terpublikasi + s.dalam_proses_entri + s.tidak_tayang,
    ),
    ...periksaTag(ds),
  };
}

// ------------------------------------------------------------------ filter

export function filterAwal(f: Filter): boolean {
  return f.periode === 'SEMUA' && !f.uke1 && !f.uke2 && f.sumber === 'SEMUA';
}

/**
 * Dokumen yang masuk hitungan untuk filter tertentu.
 * Filter UKE I/UKE II hanya dapat dipenuhi dokumen entri (Menu Program tidak memiliki atribusi unit).
 */
export function pilihDokumen(ctx: Konteks, f: Filter): DokumenSiap[] {
  return ctx.dokumen.filter(
    (d) =>
      (f.periode === 'SEMUA' || d.tahun_dibuat === f.periode) &&
      (f.sumber === 'SEMUA' || d.sumber === f.sumber) &&
      (!f.uke1 || (d.sumber === 'ENTRI' && d.uke1 === f.uke1)) &&
      (!f.uke2 || (d.sumber === 'ENTRI' && d.uke2 === f.uke2)),
  );
}

// ------------------------------------------------------------------ indikator

export function statusWaktu(rata: number | null, ambangMendekati = AMBANG_MENDEKATI_HK, batas = BATAS_TERTAHAN_HK): StatusWaktu {
  if (rata === null) return 'Tidak ada antrean';
  if (rata > batas) return 'Melewati batas';
  return rata >= ambangMendekati ? 'Mendekati batas' : 'Dalam batas';
}

function barisUnit(g: DokumenSiap[], o: Opsi): BarisUnit {
  const p = g.filter(isProses);
  const pub = g.filter(isPublish).length;
  const rata = rataRata(p.map((d) => d.lama_hk as number));
  return {
    total: g.length,
    publish: pub,
    persen_publish: persen(pub, g.length),
    dalam_proses: p.length,
    lebih_dari_5_hk: p.filter((d) => d.lewat_batas).length,
    rata_rata_tertahan_hk: rata,
    status: statusWaktu(rata, o.ambangMendekatiHk, o.batasHk),
  };
}

function kelompokkan<T>(xs: T[], kunci: (x: T) => string): Map<string, T[]> {
  const m = new Map<string, T[]>();
  for (const x of xs) {
    const k = kunci(x);
    const arr = m.get(k);
    if (arr) arr.push(x);
    else m.set(k, [x]);
  }
  return m;
}

function hitungRingkasan(sel: DokumenSiap[], o: Opsi): Ringkasan {
  const entri = sel.filter((d) => d.sumber === 'ENTRI');
  const prog = sel.filter((d) => d.sumber === 'MENU_PROGRAM');
  const total = sel.length;
  const pub = sel.filter(isPublish).length;
  return {
    total_aset: total,
    entri: entri.length,
    menu_program: prog.length,
    terpublikasi: pub,
    terpublikasi_entri: entri.filter(isPublish).length,
    terpublikasi_menu_program: prog.filter(isPublish).length,
    persen_publish: persen(pub, total),
    // CEILING(target% × total) dihitung dengan bilangan bulat agar bebas galat pecahan biner.
    kekurangan_menuju_target: Math.max(0, Math.ceil((o.targetPersen * total) / 100) - pub),
    dalam_proses_entri: entri.filter(isProses).length,
    tidak_tayang: sel.filter(isTidakTayang).length,
    tidak_tayang_entri: entri.filter(isTidakTayang).length,
    tidak_tayang_menu_program: prog.filter(isTidakTayang).length,
    tertahan_lebih_dari_5_hk: entri.filter((d) => d.lewat_batas).length,
  };
}

/** Predikat masalah kualitas (bagian 4.4), dipakai juga untuk daftar dokumen. */
export function predikatMasalah(ctx: Konteks): Record<keyof Kualitas['masalah'], (d: DokumenSiap) => boolean> {
  const batas = kurangiBulan(ctx.opsi.tanggalData, ctx.opsi.bulanBelumDiperbarui);
  return {
    metadata_belum_lengkap: (d) => d.skor_dimensi[0] < ctx.opsi.ambangKelengkapan,
    tanpa_pic: (d) => d.sumber === 'ENTRI' && d.pic_uke.trim() === '',
    belum_diperbarui_12_bulan: (d) => d.tgl_pembaruan_terakhir.slice(0, 10) < batas,
    kandidat_duplikat: (d) => (ctx.jumlahHash.get(d.hash_konten) ?? 0) > 1,
    file_tidak_terbaca: (d) => !d.ocr_berhasil,
    tag_tidak_baku: (d) => !!ctx.tag?.perDokumen.get(d.dokumen_id)?.some((p) => p.status === 'varian'),
  };
}

function hitungKualitas(ctx: Konteks, sel: DokumenSiap[]): Kualitas {
  const skor = sel.map((d) => d.skor_metadata);
  const pred = predikatMasalah(ctx);
  const hitung = (p: (d: DokumenSiap) => boolean) => sel.filter(p).length;
  const perDimensi: Record<string, number | null> = {};
  for (let k = 0; k < 7; k++) perDimensi[`dimensi_${k + 1}`] = rataRataSkor(sel.map((d) => d.skor_dimensi[k]));
  return {
    skor_rata_rata: rataRataSkor(skor),
    skor_per_dimensi: perDimensi,
    sebaran_skor: {
      di_bawah_50: skor.filter((s) => s < 50).length,
      '50_69': skor.filter((s) => s >= 50 && s < 70).length,
      '70_84': skor.filter((s) => s >= 70 && s < 85).length,
      '85_ke_atas': skor.filter((s) => s >= 85).length,
    },
    masalah: {
      metadata_belum_lengkap: hitung(pred.metadata_belum_lengkap),
      tanpa_pic: hitung(pred.tanpa_pic),
      belum_diperbarui_12_bulan: hitung(pred.belum_diperbarui_12_bulan),
      kandidat_duplikat: hitung(pred.kandidat_duplikat),
      file_tidak_terbaca: hitung(pred.file_tidak_terbaca),
      tag_tidak_baku: hitung(pred.tag_tidak_baku),
    },
    ambang_kelengkapan: ctx.opsi.ambangKelengkapan,
    tag: ctx.tag ? hitungTag(ctx.tag, sel.map((d) => d.dokumen_id)) : null,
  };
}

export function hitungIndikator(ctx: Konteks, f: Filter): Indikator {
  const o = ctx.opsi;
  const sel = pilihDokumen(ctx, f);
  const entri = sel.filter((d) => d.sumber === 'ENTRI');
  const prog = sel.filter((d) => d.sumber === 'MENU_PROGRAM');

  const statusEntri: Record<string, number> = {};
  for (const d of entri) statusEntri[d.status_saat_ini] = (statusEntri[d.status_saat_ini] ?? 0) + 1;

  const tahap = {} as Record<StatusProses, Tahap>;
  for (const s of STATUS_PROSES) {
    const g = entri.filter((d) => d.status_saat_ini === s);
    const lewat = g.filter((d) => d.lewat_batas).length;
    tahap[s] = {
      jumlah: g.length,
      lebih_dari_5_hk: lewat,
      persen_melewati: persen(lewat, g.length),
      rata_rata_tertahan_hk: rataRata(g.map((d) => d.lama_hk as number)),
    };
  }

  const uke1: Record<string, BarisUke1> = {};
  for (const [u1, g] of kelompokkan(entri, (d) => d.uke1)) {
    const anak: Record<string, BarisUnit> = {};
    for (const [u2, g2] of kelompokkan(g, (d) => d.uke2)) anak[u2] = barisUnit(g2, o);
    uke1[u1] = { ...barisUnit(g, o), uke2: anak };
  }

  // Tren dokumen entri baru per bulan pada satu tahun; bulan tanpa dokumen tetap ditampilkan sebagai 0.
  const tahunData = Number(o.tanggalData.slice(0, 4));
  const bulanData = o.tanggalData.slice(0, 7);
  const tahunTren = f.periode === 'SEMUA' ? tahunData : f.periode;
  const bulanTerakhir = tahunTren === tahunData ? Number(bulanData.slice(5, 7)) : 12;
  const tren: Record<string, number> = {};
  for (let m = 1; m <= bulanTerakhir; m++) tren[`${tahunTren}-${String(m).padStart(2, '0')}`] = 0;
  for (const d of entri) {
    const b = bulanWib(d.tgl_dibuat);
    if (b in tren) tren[b]++;
  }
  const lengkap = Object.entries(tren)
    .filter(([b]) => b < bulanData)
    .map(([, v]) => v);

  const menu: Record<string, number> = {};
  for (const d of prog) menu[d.menu_program] = (menu[d.menu_program] ?? 0) + 1;

  const ringkasan = hitungRingkasan(sel, o);
  const pembanding = ctx.ds.snapshot.find((s) => s.tanggal_snapshot === akhirBulanLalu(o.tanggalData)) ?? null;
  const perubahan =
    pembanding && filterAwal(f)
      ? {
          total_aset: ringkasan.total_aset - pembanding.total_aset,
          terpublikasi: ringkasan.terpublikasi - pembanding.terpublikasi,
          dalam_proses_entri: ringkasan.dalam_proses_entri - pembanding.dalam_proses_entri,
          tidak_tayang: ringkasan.tidak_tayang - pembanding.tidak_tayang,
          tertahan_lebih_dari_5_hk: ringkasan.tertahan_lebih_dari_5_hk - pembanding.tertahan_lebih_dari_5_hk,
        }
      : null;

  return {
    tanggal_data: o.tanggalData,
    batas_tertahan_hari_kerja: o.batasHk,
    target_publikasi_persen: o.targetPersen,
    pemeriksaan_data: ctx.pemeriksaan,
    ringkasan,
    status_entri: statusEntri,
    tahap,
    uke1,
    tahun_tren: tahunTren,
    dokumen_baru_per_bulan: tren,
    rata_rata_bulanan_bulan_lengkap: rataRata(lengkap),
    dokumen_per_menu_program: menu,
    snapshot_pembanding: pembanding,
    perubahan_dibanding_akhir_bulan_lalu: perubahan,
    kualitas: hitungKualitas(ctx, sel),
  };
}

// ------------------------------------------------------------------ snapshot

/**
 * Merekonstruksi keadaan pada akhir hari D (23:59:59 WIB) dari riwayat status (entri) dan tanggal
 * dibuat/publish (Menu Program). Dipakai untuk membangun atau memverifikasi snapshot_bulanan.csv.
 */
export function rekonstruksiSnapshot(ds: Dataset, d: string, batasHk = BATAS_TERTAHAN_HK): Snapshot {
  const libur = new Set(ds.hariLibur.map((h) => h.tanggal.trim()));
  const batas = akhirHariWib(d);
  const terakhir = new Map<string, { t: number; status: string }>();
  for (const r of ds.riwayat) {
    const t = Date.parse(r.tgl_perubahan);
    if (t > batas) continue;
    const cur = terakhir.get(r.dokumen_id);
    if (!cur || t >= cur.t) terakhir.set(r.dokumen_id, { t, status: r.status_ke });
  }
  let ePub = 0;
  let eProses = 0;
  let eTt = 0;
  let lewat = 0;
  for (const { t, status } of terakhir.values()) {
    if (status === 'PUBLISH') ePub++;
    else if (PROSES.has(status)) {
      eProses++;
      if (hariKerja(tanggalWib(new Date(t).toISOString()), d, libur) > batasHk) lewat++;
    } else if (TIDAK_TAYANG.has(status)) eTt++;
  }
  const prog = ds.dokumen.filter((x) => x.sumber === 'MENU_PROGRAM' && Date.parse(x.tgl_dibuat) <= batas);
  const pPub = prog.filter((x) => x.status_saat_ini === 'PUBLISH' && x.tgl_publish && Date.parse(x.tgl_publish) <= batas).length;
  return {
    tanggal_snapshot: d,
    total_aset: terakhir.size + prog.length,
    terpublikasi: ePub + pPub,
    dalam_proses_entri: eProses,
    tidak_tayang: eTt + (prog.length - pPub),
    tertahan_lebih_dari_5_hk: lewat,
  };
}
