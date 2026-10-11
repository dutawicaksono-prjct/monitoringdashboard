#!/usr/bin/env python3
"""Mengimpor controlled vocabulary Tim PIP (Excel) menjadi daftar tag baku bawaan dasbor.

    python tools/impor_kosakata.py "Controlled Vocabulary.xlsx"    # menulis src/indicators/kosakata-baku.json

Saat ini hanya lembar "Boarder Term" (kolom cakupanSektor (ID) dan cakupanSektor (EN)) yang dipakai: setiap istilah
Indonesia menjadi tag baku, dan istilah Inggrisnya menjadi padanan berjenis "bahasa". Istilah yang berulang (mis.
Kesekretariatan pada beberapa kedeputian) hanya diambil sekali; padanan yang tulisannya sama dengan tag baku
(mis. Moneter/Moneter) tidak ditulis. Lembar Narrower Term belum dipakai.

Setelah mengimpor, jalankan tools/petakan_tag.py lalu tools/compute_indicators.py.
Prasyarat: pip install openpyxl.
"""
import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from petakan_tag import ROOT, norm_tag  # noqa: E402

LEMBAR = "Boarder Term"


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("xlsx", type=Path, help="berkas controlled vocabulary (.xlsx)")
    args = ap.parse_args()

    import openpyxl

    ws = openpyxl.load_workbook(args.xlsx, read_only=True, data_only=True)[LEMBAR]
    kosakata, terlihat, ulang = [], {}, 0
    for i, baris in enumerate(ws.iter_rows(min_row=2, max_col=2, values_only=True), start=2):
        id_, en = (str(x).strip() if x is not None else "" for x in baris)
        if not id_:
            continue
        n = norm_tag(id_)
        if n in terlihat:
            ulang += 1
            continue
        terlihat[n] = i
        padanan = [{"tag": en, "jenis": "bahasa"}] if en and norm_tag(en) != n else []
        kosakata.append({"baku": id_, "padanan": padanan})

    # Satu bentuk tidak boleh menunjuk ke dua tag baku (kamus akan dianggap tidak sah).
    bentuk = {}
    for k in kosakata:
        for t in [k["baku"]] + [p["tag"] for p in k["padanan"]]:
            lain = bentuk.setdefault(norm_tag(t), k["baku"])
            if lain != k["baku"]:
                raise SystemExit(f'Bentuk "{t}" dipakai oleh "{lain}" dan "{k["baku"]}"; perbaiki di {args.xlsx.name}.')

    keluar = ROOT / "src" / "indicators" / "kosakata-baku.json"
    keluar.write_text(json.dumps(kosakata, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"{len(kosakata)} tag baku ({ulang} istilah berulang dilewati) -> {keluar}")


if __name__ == "__main__":
    main()
