#!/usr/bin/env python3
"""Pemetaan makna tag ke daftar tag baku bawaan (spesifikasi 1.4, bagian 4.4; pilihan A: pra-proses).

Dijalankan setiap kali data tag diperbarui, SEBELUM dasbor dibuka/di-deploy:

    python tools/petakan_tag.py            # menulis data/pemetaan_tag.csv

Cara kerja
  1. Mengambil semua tag di data/tag_dokumen.csv yang belum ada di kamus (daftar baku bawaan
     src/indicators/kosakata-baku.json + tambahan data/kamus_tag.csv bila ada).
  2. Menghitung embedding tag tersebut dan semua bentuk di kamus (bentuk baku dan padanannya) dengan model
     multibahasa sentence-transformers, lalu mencari bentuk kamus dengan kemiripan kosinus tertinggi.
  3. Menulis tag dengan skor >= AMBANG_KANDIDAT_MAKNA ke data/pemetaan_tag.csv (tag, tag_baku, jenis, skor).
     jenis = "bahasa" bila bentuk terdekat adalah padanan bahasa Inggris, selain itu "makna".

Dasbor (dan tools/compute_indicators.py) lalu memakai skor itu:
  skor >= 0,85 -> langsung dihitung sebagai padanan tag baku; 0,70-0,85 -> tabel kandidat padanan; < 0,70 -> belum di kamus.

Pengecualian: pasangan yang salah dipetakan dapat dicatat di data/pengecualian_pemetaan.csv (kolom tag, tag_baku);
pasangan itu tidak ditulis ke pemetaan_tag.csv. Untuk memperbaiki secara permanen, tambahkan bentuk yang benar ke
daftar baku bawaan atau kamus_tag.csv.

Prasyarat: pip install sentence-transformers pandas. Model diunduh sekali dari huggingface.co (+-470 MB) lalu
disimpan di cache; setelah itu skrip dapat berjalan tanpa internet. Semua proses berjalan lokal, teks tag tidak
dikirim ke layanan luar.
"""
import argparse
import csv
import json
import re
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MODEL_BAWAAN = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
AMBANG_KANDIDAT_MAKNA = 0.70  # sama dengan src/config.ts


def norm_tag(t):
    """Sama dengan normalTag di src/indicators/tag.ts."""
    t = unicodedata.normalize("NFKC", str(t)).lower()
    return " ".join(re.sub(r"[^0-9a-zÀ-ɏ ]+", " ", t).split())


def baca_csv(path):
    if not path.exists():
        return []
    with open(path, newline="", encoding="utf-8-sig") as f:
        return list(csv.DictReader(f))


def bentuk_kamus(kosakata, tambahan):
    """norm(bentuk) -> (tag_baku, jenis). Daftar bawaan dulu; tambahan hanya untuk tag baku bawaan."""
    peta = {}
    for k in kosakata:
        peta.setdefault(norm_tag(k["baku"]), (k["baku"], "baku"))
    for k in kosakata:
        for p in k["padanan"]:
            peta.setdefault(norm_tag(p["tag"]), (k["baku"], p["jenis"]))
    for r in tambahan:
        b = peta.get(norm_tag(r.get("tag_baku", "")))
        if b and b[1] == "baku":
            peta.setdefault(norm_tag(r.get("tag_varian", "")), (b[0], (r.get("jenis") or "").strip().lower()))
    return peta


def petakan(tags, kamus, encode, ambang=AMBANG_KANDIDAT_MAKNA, pengecualian=frozenset()):
    """tags: bentuk ternormalisasi di luar kamus; kamus: norm(bentuk) -> (tag_baku, jenis);
    encode: fungsi daftar teks -> matriks embedding (baris ternormalisasi). Mengembalikan baris pemetaan_tag.csv."""
    import numpy as np

    if not tags or not kamus:
        return []
    bentuk = sorted(kamus)
    eb = np.asarray(encode(bentuk), dtype=float)
    et = np.asarray(encode(tags), dtype=float)
    sim = et @ eb.T
    baris = []
    for i, t in enumerate(tags):
        j = int(sim[i].argmax())
        skor = float(sim[i, j])
        baku, jenis = kamus[bentuk[j]]
        if skor < ambang or (t, norm_tag(baku)) in pengecualian:
            continue
        baris.append({"tag": t, "tag_baku": baku, "jenis": "bahasa" if jenis == "bahasa" else "makna",
                      "skor": f"{min(1.0, max(0.0, skor)):.4f}"})
    return baris


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--data", type=Path, default=ROOT / "data", help="folder data (default: data/)")
    ap.add_argument("--model", default=MODEL_BAWAAN, help="nama atau folder model sentence-transformers")
    args = ap.parse_args()

    kosakata = json.loads((ROOT / "src" / "indicators" / "kosakata-baku.json").read_text(encoding="utf-8"))
    kamus = bentuk_kamus(kosakata, baca_csv(args.data / "kamus_tag.csv"))
    tag_dok = baca_csv(args.data / "tag_dokumen.csv")
    if not tag_dok:
        raise SystemExit(f"{args.data / 'tag_dokumen.csv'} tidak ada atau kosong.")
    tags = sorted({n for r in tag_dok if (n := norm_tag(r.get("tag", ""))) and n not in kamus})
    pengecualian = {(norm_tag(r.get("tag", "")), norm_tag(r.get("tag_baku", "")))
                    for r in baca_csv(args.data / "pengecualian_pemetaan.csv")}

    from sentence_transformers import SentenceTransformer

    model = SentenceTransformer(args.model)
    baris = petakan(tags, kamus, lambda xs: model.encode(xs, normalize_embeddings=True), pengecualian=pengecualian)

    keluar = args.data / "pemetaan_tag.csv"
    with open(keluar, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, ["tag", "tag_baku", "jenis", "skor"], lineterminator="\n")
        w.writeheader()
        w.writerows(baris)
    print(f"{len(tags)} bentuk tag di luar kamus; {len(baris)} dipetakan (skor >= {AMBANG_KANDIDAT_MAKNA}) -> {keluar}")
    for r in baris:
        print(f"  {r['skor']}  {r['tag']} -> {r['tag_baku']} ({r['jenis']})")


if __name__ == "__main__":
    main()
