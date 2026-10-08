import { persen as hitungPersen } from './indicators/angka';

const fmtBulat = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 });
const fmt1 = new Intl.NumberFormat('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export const KOSONG = '—';

/** 5063 → "5.063" */
export function angka(n: number | null | undefined): string {
  return n == null || Number.isNaN(n) ? KOSONG : fmtBulat.format(n);
}

/** 10.9 → "10,9" (nilai sudah dibulatkan oleh modul indikator) */
export function desimal(n: number | null | undefined): string {
  return n == null || Number.isNaN(n) ? KOSONG : fmt1.format(n);
}

/** 53.1 → "53,1%" */
export function persen(n: number | null | undefined): string {
  return n == null || Number.isNaN(n) ? KOSONG : `${fmt1.format(n)}%`;
}

/** Persentase x/y untuk teks keterangan; "—" bila penyebut 0. */
export function rasio(x: number, y: number): string {
  return persen(hitungPersen(x, y));
}

/** +40 / −88 / 0; null → "—" */
export function selisih(n: number | null | undefined): string {
  if (n == null) return KOSONG;
  if (n === 0) return '0';
  return `${n > 0 ? '+' : '−'}${fmtBulat.format(Math.abs(n))}`;
}

const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
export const BULAN_PENDEK = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

/** "2026-10-08" → "8 Oktober 2026" */
export function tanggalPanjang(d: string): string {
  const [y, m, day] = d.slice(0, 10).split('-').map(Number);
  return `${day} ${BULAN[m - 1]} ${y}`;
}

export function namaBulan(m: number): string {
  return BULAN[m - 1];
}

export const LABEL_STATUS: Record<string, string> = {
  DRAFT: 'Draft',
  OPERATOR_KONTEN: 'Operator Konten',
  PIC_UKE: 'PIC UKE',
  TERVALIDASI: 'Tervalidasi',
  PUBLISH: 'Publish',
  UNPUBLISH: 'UnPublish',
  DITOLAK_OPERATOR: 'Ditolak Operator Konten',
  DITOLAK_PIC: 'Ditolak PIC UKE',
};

export const LABEL_SUMBER: Record<string, string> = { ENTRI: 'Entri', MENU_PROGRAM: 'Menu Program' };
