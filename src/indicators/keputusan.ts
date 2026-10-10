// Indikator pendukung keputusan (spesifikasi 4.8, versi 1.3): jalan menuju target, tren capaian dan proyeksi,
// arus masuk/keluar, sebaran umur tertahan, beban per PIC, dan masalah kualitas per UKE I.
// Fungsi murni tanpa ketergantungan UI; tidak mengubah indikator yang diuji terhadap expected_indicators.json.
import { persen } from './angka';
import { bulanWib } from './tanggal';
import { isProses, isPublish, isTidakTayang, predikatMasalah, type Konteks } from './hitung';
import type { DokumenSiap, Kualitas, Ringkasan, Snapshot } from './types';

/** Jumlah dokumen yang masih kurang agar `pub` mencapai target% dari `total`. */
export function kurangMenujuTarget(total: number, pub: number, targetPersen: number): number {
  return Math.max(0, Math.ceil((targetPersen * total) / 100) - pub);
}

// ------------------------------------------------------------------ jalan menuju target

export interface JalanTarget {
  target_dokumen: number;
  terpublikasi: number;
  kekurangan: number;
  /** Bagian kekurangan yang dapat ditutup bila dokumen dalam proses selesai dipublikasikan. */
  dari_alur: number;
  /** Sisa kekurangan yang hanya dapat ditutup dari dokumen tidak tayang (perlu keputusan). */
  perlu_keputusan: number;
  /** Capaian maksimal bila seluruh dokumen dalam proses dipublikasikan. */
  persen_maks_via_alur: number | null;
  ditolak_entri: number;
  unpublish_entri: number;
  unpublish_menu_program: number;
  /** Menu Program dengan UnPublish terbanyak. */
  unpublish_menu_teratas: { nama: string; jumlah: number } | null;
}

export function jalanMenujuTarget(sel: DokumenSiap[], r: Ringkasan, targetPersen: number): JalanTarget {
  const kekurangan = r.kekurangan_menuju_target;
  const dariAlur = Math.min(r.dalam_proses_entri, kekurangan);
  const unpubMenu = new Map<string, number>();
  let ditolak = 0;
  let unpubEntri = 0;
  for (const d of sel) {
    if (!isTidakTayang(d)) continue;
    if (d.sumber === 'ENTRI') {
      if (d.status_saat_ini === 'UNPUBLISH') unpubEntri++;
      else ditolak++;
    } else unpubMenu.set(d.menu_program, (unpubMenu.get(d.menu_program) ?? 0) + 1);
  }
  const teratas = [...unpubMenu.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'id'))[0];
  return {
    target_dokumen: Math.ceil((targetPersen * r.total_aset) / 100),
    terpublikasi: r.terpublikasi,
    kekurangan,
    dari_alur: dariAlur,
    perlu_keputusan: kekurangan - dariAlur,
    persen_maks_via_alur: persen(r.terpublikasi + r.dalam_proses_entri, r.total_aset),
    ditolak_entri: ditolak,
    unpublish_entri: unpubEntri,
    unpublish_menu_program: r.tidak_tayang_menu_program,
    unpublish_menu_teratas: teratas ? { nama: teratas[0], jumlah: teratas[1] } : null,
  };
}

// ------------------------------------------------------------------ tren capaian dan proyeksi

export interface TitikCapaian {
  tanggal: string;
  total: number;
  terpublikasi: number;
  persen_publish: number | null;
  kekurangan: number;
  /** true untuk titik tanggal data (bukan akhir bulan). */
  berjalan: boolean;
}

export interface TrenCapaian {
  titik: TitikCapaian[];
  /** Rata-rata perubahan per bulan dari snapshot akhir bulan (paling banyak 3 bulan terakhir); null bila < 2 snapshot. */
  laju_publish_per_bulan: number | null;
  laju_total_per_bulan: number | null;
  laju_kekurangan_per_bulan: number | null;
  /** Perkiraan bulan target tercapai (YYYY-MM) bila kekurangan menyempit; null bila tidak menyempit. */
  perkiraan_tercapai: string | null;
  bulan_menuju_target: number | null;
}

const akhirBulan = (d: string) => {
  const [y, m, day] = d.split('-').map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate() === day;
};

function tambahBulan(ym: string, n: number): string {
  const [y, m] = ym.split('-').map(Number);
  const t = y * 12 + (m - 1) + n;
  return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, '0')}`;
}

export function trenCapaian(snapshot: Snapshot[], tanggalData: string, r: Ringkasan, targetPersen: number): TrenCapaian {
  const bulanan = snapshot
    .filter((s) => s.tanggal_snapshot < tanggalData && akhirBulan(s.tanggal_snapshot))
    .sort((a, b) => a.tanggal_snapshot.localeCompare(b.tanggal_snapshot));
  const titik: TitikCapaian[] = bulanan.map((s) => ({
    tanggal: s.tanggal_snapshot,
    total: s.total_aset,
    terpublikasi: s.terpublikasi,
    persen_publish: persen(s.terpublikasi, s.total_aset),
    kekurangan: kurangMenujuTarget(s.total_aset, s.terpublikasi, targetPersen),
    berjalan: false,
  }));
  titik.push({
    tanggal: tanggalData,
    total: r.total_aset,
    terpublikasi: r.terpublikasi,
    persen_publish: r.persen_publish,
    kekurangan: r.kekurangan_menuju_target,
    berjalan: true,
  });

  const jendela = titik.filter((t) => !t.berjalan).slice(-4);
  if (jendela.length < 2) {
    return { titik, laju_publish_per_bulan: null, laju_total_per_bulan: null, laju_kekurangan_per_bulan: null, perkiraan_tercapai: null, bulan_menuju_target: null };
  }
  const n = jendela.length - 1;
  const a = jendela[0];
  const b = jendela[jendela.length - 1];
  const laju = (x: number, y: number) => Math.round(((y - x) / n) * 10) / 10;
  const lajuKurang = laju(a.kekurangan, b.kekurangan);
  let bulan: number | null = null;
  let perkiraan: string | null = null;
  if (r.kekurangan_menuju_target === 0) {
    bulan = 0;
    perkiraan = tanggalData.slice(0, 7);
  } else if (lajuKurang < 0) {
    bulan = Math.ceil(r.kekurangan_menuju_target / -lajuKurang);
    perkiraan = tambahBulan(tanggalData.slice(0, 7), bulan);
  }
  return {
    titik,
    laju_publish_per_bulan: laju(a.terpublikasi, b.terpublikasi),
    laju_total_per_bulan: laju(a.total, b.total),
    laju_kekurangan_per_bulan: lajuKurang,
    perkiraan_tercapai: perkiraan,
    bulan_menuju_target: bulan,
  };
}

// ------------------------------------------------------------------ arus masuk dan keluar

/** Dokumen entri yang dipublikasikan per bulan (menurut tgl_publish WIB) untuk bulan-bulan pada `bulan`. */
export function publishPerBulan(sel: DokumenSiap[], bulan: string[]): Record<string, number> {
  const hasil: Record<string, number> = Object.fromEntries(bulan.map((b) => [b, 0]));
  for (const d of sel) {
    if (d.sumber !== 'ENTRI' || !isPublish(d) || !d.tgl_publish) continue;
    const b = bulanWib(d.tgl_publish);
    if (b in hasil) hasil[b]++;
  }
  return hasil;
}

// ------------------------------------------------------------------ sebaran umur tertahan

export interface SebaranUmur {
  dalam_batas: number;
  hk_6_10: number;
  hk_11_20: number;
  hk_lebih_20: number;
  terlama: number | null;
}

/** Sebaran lama tertahan dokumen dalam proses: ≤ batas, batas+1–10, 11–20, > 20 hari kerja. */
export function sebaranUmur(docs: DokumenSiap[], batasHk: number): SebaranUmur {
  const s: SebaranUmur = { dalam_batas: 0, hk_6_10: 0, hk_11_20: 0, hk_lebih_20: 0, terlama: null };
  for (const d of docs) {
    if (!isProses(d) || d.lama_hk == null) continue;
    const l = d.lama_hk;
    if (l <= batasHk) s.dalam_batas++;
    else if (l <= 10) s.hk_6_10++;
    else if (l <= 20) s.hk_11_20++;
    else s.hk_lebih_20++;
    s.terlama = Math.max(s.terlama ?? 0, l);
  }
  return s;
}

// ------------------------------------------------------------------ beban per PIC

export interface BebanPic {
  pic: string;
  jumlah: number;
  lebih_dari_batas: number;
  terlama: number;
  uke2: string[];
}

/** Dokumen yang sedang di tahap PIC UKE, dikelompokkan per PIC; PIC kosong dilaporkan terpisah. */
export function bebanPic(sel: DokumenSiap[]): { baris: BebanPic[]; tanpa_pic: DokumenSiap[] } {
  const m = new Map<string, BebanPic>();
  const tanpa: DokumenSiap[] = [];
  for (const d of sel) {
    if (d.sumber !== 'ENTRI' || d.status_saat_ini !== 'PIC_UKE') continue;
    const pic = d.pic_uke.trim();
    if (!pic) {
      tanpa.push(d);
      continue;
    }
    const b = m.get(pic) ?? { pic, jumlah: 0, lebih_dari_batas: 0, terlama: 0, uke2: [] };
    b.jumlah++;
    if (d.lewat_batas) b.lebih_dari_batas++;
    b.terlama = Math.max(b.terlama, d.lama_hk ?? 0);
    if (!b.uke2.includes(d.uke2)) b.uke2.push(d.uke2);
    m.set(pic, b);
  }
  const baris = [...m.values()].sort(
    (a, b) => b.lebih_dari_batas - a.lebih_dari_batas || b.jumlah - a.jumlah || a.pic.localeCompare(b.pic, 'id'),
  );
  return { baris, tanpa_pic: tanpa.sort((a, b) => (b.lama_hk ?? 0) - (a.lama_hk ?? 0)) };
}

// ------------------------------------------------------------------ masalah kualitas per UKE I

export type KunciMasalah = keyof Kualitas['masalah'];

/** Jumlah dokumen entri per UKE I untuk setiap masalah kualitas. */
export function masalahPerUke1(ctx: Konteks, sel: DokumenSiap[]): { uke1: string; total: number; masalah: Record<KunciMasalah, number> }[] {
  const pred = predikatMasalah(ctx);
  const kunci = Object.keys(pred) as KunciMasalah[];
  const m = new Map<string, { uke1: string; total: number; masalah: Record<KunciMasalah, number> }>();
  for (const d of sel) {
    if (d.sumber !== 'ENTRI') continue;
    const b = m.get(d.uke1) ?? { uke1: d.uke1, total: 0, masalah: Object.fromEntries(kunci.map((k) => [k, 0])) as Record<KunciMasalah, number> };
    b.total++;
    for (const k of kunci) if (pred[k](d)) b.masalah[k]++;
    m.set(d.uke1, b);
  }
  return [...m.values()];
}
