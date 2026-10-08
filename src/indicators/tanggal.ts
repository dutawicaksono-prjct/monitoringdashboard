// Utilitas tanggal. Semua tanggal kalender diperlakukan sebagai string YYYY-MM-DD dan dihitung di UTC
// agar tidak terpengaruh zona waktu peramban. Cap waktu data dikonversi ke WIB (UTC+7, tanpa DST).

const MS_HARI = 86_400_000;
const OFFSET_WIB = 7 * 3_600_000;

/** Tanggal kalender WIB dari cap waktu ISO 8601 (mis. 2026-09-10T09:59:18+07:00). */
export function tanggalWib(iso: string): string {
  return new Date(Date.parse(iso) + OFFSET_WIB).toISOString().slice(0, 10);
}

export function bulanWib(iso: string): string {
  return tanggalWib(iso).slice(0, 7);
}

/** Akhir hari D (23:59:59 WIB) dalam milidetik epoch. */
export function akhirHariWib(d: string): number {
  return Date.parse(`${d}T23:59:59+07:00`);
}

function keUtc(d: string): number {
  return Date.parse(`${d}T00:00:00Z`);
}

function dariUtc(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/**
 * HK(a, b): jumlah hari kerja pada rentang (a, b]. Tanggal a tidak dihitung, tanggal b dihitung.
 * Hari kerja = Senin–Jumat yang tidak tercantum di `libur`. HK(a, a) = 0; bila b < a hasilnya 0.
 */
export function hariKerja(a: string, b: string, libur: ReadonlySet<string>): number {
  let n = 0;
  const akhir = keUtc(b);
  for (let t = keUtc(a) + MS_HARI; t <= akhir; t += MS_HARI) {
    const hari = new Date(t).getUTCDay();
    if (hari !== 0 && hari !== 6 && !libur.has(dariUtc(t))) n++;
  }
  return n;
}

/** Tanggal yang sama `bulan` bulan sebelumnya; hari dipangkas ke akhir bulan bila perlu (31 Mar → 28/29 Feb). */
export function kurangiBulan(d: string, bulan: number): string {
  const [y, m, day] = d.split('-').map(Number);
  const total = y * 12 + (m - 1) - bulan;
  const ty = Math.floor(total / 12);
  const tm = (total % 12) + 1;
  const akhirBulan = new Date(Date.UTC(ty, tm, 0)).getUTCDate();
  return `${ty}-${String(tm).padStart(2, '0')}-${String(Math.min(day, akhirBulan)).padStart(2, '0')}`;
}

/** Hari terakhir bulan sebelum bulan tanggal d. */
export function akhirBulanLalu(d: string): string {
  const [y, m] = d.split('-').map(Number);
  return dariUtc(Date.UTC(y, m - 1, 0));
}
