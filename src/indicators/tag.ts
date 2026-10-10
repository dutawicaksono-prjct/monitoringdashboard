// Konsistensi tag (spesifikasi 1.4, bagian 4.4). Implementasi acuan: tools/compute_indicators.py.
import { AMBANG_KEMIRIPAN_TAG } from '../config';
import { bulatkan, persen } from './angka';
import {
  JENIS_KAMUS_TAG,
  type Dataset,
  type KamusTag,
  type KandidatPadanan,
  type KonsepTag,
  type StatistikTag,
  type StatusTag,
} from './types';

const KATA_SAMBUNG = new Set(['dan', 'di', 'ke', 'dari', 'yang', 'untuk', 'atau', 'serta']);
/** Kemiripan ejaan hanya dinilai bila kedua bentuk paling sedikit sepanjang ini (menghindari salah pasang kata pendek). */
const PANJANG_MIN_KEMIRIPAN = 5;

/** Bentuk pembanding: huruf kecil, tanda baca menjadi spasi, spasi dirapikan. "Perubahan-Iklim" → "perubahan iklim". */
export function normalTag(t: string): string {
  return t
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^0-9a-zÀ-ɏ ]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .join(' ');
}

/** Kemiripan Jaro-Winkler (0–1), faktor awalan 0,1 hingga 4 huruf. */
export function jaroWinkler(a: string, b: string): number {
  if (a === b) return 1;
  const la = a.length;
  const lb = b.length;
  if (!la || !lb) return 0;
  const jarak = Math.max(0, Math.floor(Math.max(la, lb) / 2) - 1);
  const ma = new Array<boolean>(la).fill(false);
  const mb = new Array<boolean>(lb).fill(false);
  let m = 0;
  for (let i = 0; i < la; i++) {
    for (let j = Math.max(0, i - jarak); j < Math.min(lb, i + jarak + 1); j++) {
      if (!mb[j] && a[i] === b[j]) {
        ma[i] = mb[j] = true;
        m++;
        break;
      }
    }
  }
  if (!m) return 0;
  let t = 0;
  let k = 0;
  for (let i = 0; i < la; i++) {
    if (!ma[i]) continue;
    while (!mb[k]) k++;
    if (a[i] !== b[k]) t++;
    k++;
  }
  const jaro = (m / la + m / lb + (m - t / 2) / m) / 3;
  let p = 0;
  while (p < Math.min(4, la, lb) && a[p] === b[p]) p++;
  return jaro + p * 0.1 * (1 - jaro);
}

/** `pendek` adalah huruf awal kata-kata `panjang` (kata sambung dilewati), mis. "umkm" ← "usaha mikro kecil dan menengah". */
export function singkatanDari(pendek: string, panjang: string): boolean {
  const kata = panjang.split(' ');
  if (pendek.includes(' ') || pendek.length < 2 || pendek.length > 6 || kata.length < 2) return false;
  return pendek === kata.filter((w) => !KATA_SAMBUNG.has(w)).map((w) => w[0]).join('');
}

/** Satu pemakaian tag pada satu dokumen, sudah dicocokkan dengan kamus. */
export interface PemakaianTag {
  tulisan: string;
  normal: string;
  konsep: string;
  jenis: string;
  status: StatusTag;
}

export interface IndeksTag {
  /** Kunci dokumen_id; dokumen tanpa tag tidak ada di peta ini. */
  perDokumen: Map<string, PemakaianTag[]>;
  /** normal(tag_varian) → entri kamus pertama. */
  kamus: Map<string, KamusTag>;
}

function petaKamus(kamus: KamusTag[]): Map<string, KamusTag> {
  const m = new Map<string, KamusTag>();
  for (const k of kamus) {
    const n = normalTag(k.tag_varian);
    if (!m.has(n)) m.set(n, { tag_varian: k.tag_varian.trim(), tag_baku: k.tag_baku.trim(), jenis: k.jenis.trim().toLowerCase() });
  }
  return m;
}

export function siapkanTag(ds: Dataset): IndeksTag | null {
  if (!ds.tagDokumen) return null;
  const kamus = petaKamus(ds.kamusTag);
  const perDokumen = new Map<string, PemakaianTag[]>();
  for (const r of ds.tagDokumen) {
    const normal = normalTag(r.tag);
    if (!normal) continue;
    const arr = perDokumen.get(r.dokumen_id) ?? [];
    if (arr.some((p) => p.normal === normal)) continue; // satu konsep tulisan sama dihitung sekali per dokumen
    const k = kamus.get(normal);
    const status: StatusTag = !k ? 'belum_di_kamus' : k.jenis === 'baku' ? 'baku' : k.jenis === 'bahasa' ? 'padanan_bahasa' : 'varian';
    arr.push({ tulisan: r.tag.trim(), normal, konsep: k ? k.tag_baku : normal, jenis: k ? k.jenis : '', status });
    perDokumen.set(r.dokumen_id, arr);
  }
  return { perDokumen, kamus };
}

/** Pemeriksaan 8.2 untuk tag: setiap dokumen_id di tag_dokumen.csv ada di dokumen.csv, dan kamus konsisten. */
export function periksaTag(ds: Dataset): { tag_dokumen_ada_di_dokumen: boolean; kamus_tag_valid: boolean } {
  const id = new Set(ds.dokumen.map((d) => d.dokumen_id));
  const jenis = new Set<string>(JENIS_KAMUS_TAG);
  const kamus = petaKamus(ds.kamusTag);
  const bakuDari = new Map<string, Set<string>>();
  for (const k of ds.kamusTag) {
    const n = normalTag(k.tag_varian);
    const s = bakuDari.get(n) ?? new Set<string>();
    s.add(normalTag(k.tag_baku));
    bakuDari.set(n, s);
  }
  return {
    tag_dokumen_ada_di_dokumen: !ds.tagDokumen || ds.tagDokumen.every((t) => id.has(t.dokumen_id)),
    kamus_tag_valid:
      ds.kamusTag.every((k) => jenis.has(k.jenis.trim().toLowerCase())) &&
      [...bakuDari.values()].every((s) => s.size === 1) &&
      ds.kamusTag.every((k) => kamus.get(normalTag(k.tag_baku))?.jenis === 'baku'),
  };
}

/** Pemakaian tag untuk sekumpulan dokumen. */
export function pemakaianTag(idx: IndeksTag, idDokumen: Iterable<string>): { dokumen_id: string; p: PemakaianTag }[] {
  const out: { dokumen_id: string; p: PemakaianTag }[] = [];
  for (const id of idDokumen) for (const p of idx.perDokumen.get(id) ?? []) out.push({ dokumen_id: id, p });
  return out;
}

export function hitungTag(idx: IndeksTag, idDokumen: string[]): StatistikTag {
  const pakai = pemakaianTag(idx, idDokumen);
  const hit: Record<StatusTag, number> = { baku: 0, padanan_bahasa: 0, varian: 0, belum_di_kamus: 0 };
  for (const { p } of pakai) hit[p.status]++;

  const kelompok = new Map<string, { dokumen_id: string; p: PemakaianTag }[]>();
  for (const x of pakai) {
    const arr = kelompok.get(x.p.konsep);
    if (arr) arr.push(x);
    else kelompok.set(x.p.konsep, [x]);
  }
  const perKonsep: Record<string, KonsepTag> = {};
  for (const [konsep, g] of kelompok) {
    const bentuk: KonsepTag['bentuk'] = {};
    const tulisan = new Map<string, Map<string, number>>();
    for (const { p } of g) {
      const b = (bentuk[p.normal] ??= { tulisan: '', status: p.status, jenis: p.jenis, penggunaan: 0 });
      b.penggunaan++;
      const t = tulisan.get(p.normal) ?? new Map<string, number>();
      t.set(p.tulisan, (t.get(p.tulisan) ?? 0) + 1);
      tulisan.set(p.normal, t);
    }
    for (const [n, t] of tulisan) {
      bentuk[n].tulisan = [...t].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))[0][0];
    }
    const ok = g.filter(({ p }) => p.status === 'baku' || p.status === 'padanan_bahasa').length;
    const varian = g.filter(({ p }) => p.status === 'varian').length;
    perKonsep[konsep] = {
      penggunaan: g.length,
      dokumen: new Set(g.map((x) => x.dokumen_id)).size,
      persen_konsistensi: persen(ok, ok + varian),
      bentuk,
    };
  }

  // Kandidat padanan: bentuk yang belum di kamus dan mirip bentuk lain (di kamus atau terpakai) dengan konsep berbeda.
  const urut = (xs: Iterable<string>) => [...new Set(xs)].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  const belum = urut(pakai.filter(({ p }) => p.status === 'belum_di_kamus').map(({ p }) => p.normal));
  const pembanding = urut([...idx.kamus.keys(), ...pakai.map(({ p }) => p.normal)]);
  const kandidat: KandidatPadanan[] = [];
  type Calon = { s: number; alasan: KandidatPadanan['alasan']; b: string; kb: string };
  for (const a of belum) {
    let terbaik: Calon | null = null as Calon | null;
    for (const b of pembanding) {
      if (b === a) continue;
      const kb = idx.kamus.get(b)?.tag_baku ?? b;
      if (normalTag(kb) === a) continue;
      let c: Calon | null = null;
      if (singkatanDari(b, a) || singkatanDari(a, b)) c = { s: 2, alasan: 'singkatan', b, kb };
      else if (Math.min(a.length, b.length) >= PANJANG_MIN_KEMIRIPAN) {
        const s = jaroWinkler(a, b);
        if (s >= AMBANG_KEMIRIPAN_TAG) c = { s, alasan: 'ejaan mirip', b, kb };
      }
      if (!c) continue;
      if (!terbaik || c.s > terbaik.s || (c.s === terbaik.s && idx.kamus.has(c.b) && !idx.kamus.has(terbaik.b))) terbaik = c;
    }
    if (terbaik) {
      kandidat.push({
        tag: a,
        usulan_baku: terbaik.kb,
        alasan: terbaik.alasan,
        kemiripan: terbaik.alasan === 'singkatan' ? null : bulatkan(terbaik.s, 2),
        dokumen: new Set(pakai.filter(({ p }) => p.normal === a).map((x) => x.dokumen_id)).size,
      });
    }
  }
  kandidat.sort((x, y) => y.dokumen - x.dokumen || (x.tag < y.tag ? -1 : x.tag > y.tag ? 1 : 0));

  const bertag = new Set(pakai.map((x) => x.dokumen_id)).size;
  const ok = hit.baku + hit.padanan_bahasa;
  return {
    dokumen_bertag: bertag,
    dokumen_tanpa_tag: idDokumen.length - bertag,
    penggunaan_tag: pakai.length,
    bentuk_unik: new Set(pakai.map(({ p }) => p.normal)).size,
    konsep_unik: kelompok.size,
    penggunaan: hit,
    persen_konsistensi: persen(ok, ok + hit.varian),
    konsep_dengan_varian: Object.values(perKonsep).filter((k) => Object.values(k.bentuk).some((b) => b.status === 'varian')).length,
    per_konsep: perKonsep,
    kandidat_padanan: kandidat,
  };
}

/** Bentuk kandidat padanan sebagai baris kamus_tag.csv, siap ditinjau lalu ditempel ke kamus. */
export function kandidatKeCsv(k: KandidatPadanan[]): string {
  const sel = (s: string) => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
  const jenis = (x: KandidatPadanan) => (x.alasan === 'singkatan' ? 'singkatan' : 'ejaan');
  return ['tag_varian,tag_baku,jenis', ...k.map((x) => [x.tag, x.usulan_baku, jenis(x)].map(sel).join(','))].join('\n') + '\n';
}
