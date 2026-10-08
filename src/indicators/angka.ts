/**
 * Pembulatan ke `digits` desimal dengan aturan yang sama dengan implementasi acuan (Python `round`):
 * nilai biner yang persis berada di tengah dibulatkan ke genap terdekat; selain itu ke yang terdekat.
 * Dihitung tepat dengan BigInt agar tidak bergantung pada galat `x * 10`.
 */
export function bulatkan(x: number, digits = 1): number {
  if (!Number.isFinite(x) || x === 0) return x;
  const neg = x < 0;
  const { mant, exp } = uraikan(Math.abs(x));
  const skala = 10n ** BigInt(digits);
  let n: bigint;
  if (exp >= 0) {
    n = mant * skala * (1n << BigInt(exp));
  } else {
    const pembagi = 1n << BigInt(-exp);
    const pembilang = mant * skala;
    n = pembilang / pembagi;
    const sisa2 = (pembilang % pembagi) * 2n;
    if (sisa2 > pembagi || (sisa2 === pembagi && n % 2n === 1n)) n += 1n;
  }
  const hasil = Number(n) / Number(skala);
  return neg ? -hasil : hasil;
}

/** x = mant * 2^exp, mant bilangan bulat (x positif dan berhingga). */
function uraikan(x: number): { mant: bigint; exp: number } {
  const buf = new DataView(new ArrayBuffer(8));
  buf.setFloat64(0, x);
  const hi = buf.getUint32(0);
  const lo = buf.getUint32(4);
  const e = (hi >>> 20) & 0x7ff;
  const frac = (BigInt(hi & 0xfffff) << 32n) | BigInt(lo);
  return e === 0 ? { mant: frac, exp: -1074 } : { mant: frac | (1n << 52n), exp: e - 1075 };
}

/** Persentase x/y dibulatkan 1 desimal; null bila penyebut 0. */
export function persen(x: number, y: number): number | null {
  return y ? bulatkan((100 * x) / y, 1) : null;
}

export function rataRata(xs: number[]): number | null {
  if (!xs.length) return null;
  let s = 0;
  for (const v of xs) s += v;
  return bulatkan(s / xs.length, 1);
}

/** Rata-rata nilai berdesimal satu (skor 0–100): dijumlahkan sebagai bilangan bulat persepuluhan agar tepat. */
export function rataRataSkor(xs: number[]): number | null {
  if (!xs.length) return null;
  let s = 0;
  for (const v of xs) s += Math.round(v * 10);
  return bulatkan(s / (10 * xs.length), 1);
}
