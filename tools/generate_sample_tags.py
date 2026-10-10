#!/usr/bin/env python3
"""Pembangkit data contoh (DUMMY) tag dokumen dan kamus padanan tag (spesifikasi 1.4, bagian 3.3 dan 4.4).

Menghasilkan, di folder data/:
  - tag_dokumen.csv  (satu baris per pasangan dokumen-tag, ditulis apa adanya seperti input pengguna)
  - kamus_tag.csv    (tesaurus sementara: bentuk baku dan padanannya)

Membaca data/dokumen.csv. Hasil deterministik (seed tetap). Jalankan setelah generate_sample_data.py.

Catatan
  * Seluruh tag adalah rekaan untuk ilustrasi. Kamus ini sementara; ganti dengan tesaurus resmi Tim PIP.
  * Sebagian varian sengaja TIDAK dimasukkan ke kamus (mis. bentuk panjang RPJMN, salah ketik "pendidkan")
    agar muncul sebagai kandidat padanan, dan dua tag sengaja belum ada di kamus sama sekali.
"""
import csv
import random
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
rng = random.Random(20261008)

# konsep baku -> (bobot pemakaian, [(bentuk lain, jenis, bobot relatif, masuk_kamus)])
# jenis: ejaan | singkatan | sinonim | bentuk | bahasa  (bahasa = padanan bahasa Inggris, diterima)
KONSEP = {
    "pembangunan rendah karbon": (9, [("PRK", "singkatan", 3, True), ("low carbon development", "bahasa", 2, True),
                                      ("pembangunan rendah emisi", "sinonim", 1, True)]),
    "kemiskinan": (10, [("poverty", "bahasa", 2, True), ("miskin", "bentuk", 1, True)]),
    "stunting": (7, [("tengkes", "sinonim", 2, True), ("gagal tumbuh", "sinonim", 1, True)]),
    "RPJMN": (10, [("Rencana Pembangunan Jangka Menengah Nasional", "singkatan", 2, False)]),
    "SDGs": (8, [("TPB", "singkatan", 2, True), ("tujuan pembangunan berkelanjutan", "bahasa", 3, True)]),
    "transformasi digital": (8, [("digitalisasi", "sinonim", 2, True), ("digital transformation", "bahasa", 1, True)]),
    "ketahanan pangan": (7, [("food security", "bahasa", 2, True)]),
    "perubahan iklim": (8, [("climate change", "bahasa", 2, True)]),
    "infrastruktur": (9, [("infrastuktur", "ejaan", 1, True), ("infrastructure", "bahasa", 1, True)]),
    "UMKM": (7, [("usaha mikro kecil dan menengah", "singkatan", 2, False), ("UKM", "sinonim", 1, True)]),
    "pendidikan": (9, [("education", "bahasa", 2, True), ("pendidkan", "ejaan", 1, False)]),
    "kesehatan": (8, [("health", "bahasa", 1, True), ("kesehtan", "ejaan", 1, False)]),
    "ekonomi hijau": (5, [("green economy", "bahasa", 2, True)]),
    "energi baru terbarukan": (6, [("EBT", "singkatan", 3, True), ("renewable energy", "bahasa", 1, True)]),
    "perdesaan": (6, [("pedesaan", "ejaan", 3, True)]),
    "tata kelola": (6, [("tatakelola", "ejaan", 2, True), ("governance", "bahasa", 1, True)]),
    "reformasi birokrasi": (6, [("RB", "singkatan", 2, True)]),
    "IKN": (5, [("Ibu Kota Nusantara", "singkatan", 2, True), ("ibukota nusantara", "ejaan", 1, True)]),
    "pariwisata": (5, []),
    "gender": (4, []),
    "air minum dan sanitasi": (4, []),
    "ketenagakerjaan": (5, []),
    "investasi": (5, []),
    "perlindungan sosial": (5, []),
    "evaluasi kinerja": (4, []),
}
# Tag yang dipakai tetapi belum ada di kamus sama sekali (menunggu tesaurus).
TANPA_KAMUS = {"kemaritiman": 4, "statistik": 3}


def tulis_ulang(t):
    """Variasi penulisan yang tidak mengubah makna: huruf besar di awal kata atau tanda hubung."""
    r = rng.random()
    if r < 0.10:
        return t.title() if not t.isupper() else t
    if r < 0.13 and " " in t:
        return t.replace(" ", "-", 1)
    return t


dok = list(csv.DictReader(open(DATA / "dokumen.csv", newline="", encoding="utf-8")))
uke1 = sorted({d["uke1"] for d in dok if d["uke1"]})
# Kecenderungan memakai bentuk tidak baku berbeda per UKE I agar perbandingan antarunit terlihat.
p_varian_uke = {u: 0.04 + 0.025 * (i % 6) for i, u in enumerate(uke1)}

nama = list(KONSEP) + list(TANPA_KAMUS)
bobot = [KONSEP[k][0] for k in KONSEP] + list(TANPA_KAMUS.values())

baris = []
for d in dok:
    if rng.random() < 0.06:
        continue  # dokumen tanpa tag
    p_var = p_varian_uke.get(d["uke1"], 0.08)
    pilih = []
    while len(pilih) < rng.choice([1, 2, 2, 3, 3, 4]):
        k = rng.choices(nama, bobot)[0]
        if k not in pilih:
            pilih.append(k)
    tags = []
    for k in pilih:
        bentuk = k
        lain = KONSEP.get(k, (0, []))[1]
        bahasa = [x for x in lain if x[1] == "bahasa"]
        varian = [x for x in lain if x[1] != "bahasa"]
        r = rng.random()
        if bahasa and r < 0.12:
            bentuk = rng.choices(bahasa, [x[2] for x in bahasa])[0][0]
        elif varian and 0.12 <= r < 0.12 + p_var * 1.0:
            bentuk = rng.choices(varian, [x[2] for x in varian])[0][0]
        tags.append(tulis_ulang(bentuk))
    for t in dict.fromkeys(tags):
        baris.append({"dokumen_id": d["dokumen_id"], "tag": t})

with open(DATA / "tag_dokumen.csv", "w", newline="", encoding="utf-8") as f:
    w = csv.DictWriter(f, ["dokumen_id", "tag"], lineterminator="\n")
    w.writeheader()
    w.writerows(baris)

kamus = []
for k, (_, lain) in KONSEP.items():
    kamus.append({"tag_varian": k, "tag_baku": k, "jenis": "baku"})
    for bentuk, jenis, _, masuk in lain:
        if masuk:
            kamus.append({"tag_varian": bentuk, "tag_baku": k, "jenis": jenis})
with open(DATA / "kamus_tag.csv", "w", newline="", encoding="utf-8") as f:
    w = csv.DictWriter(f, ["tag_varian", "tag_baku", "jenis"], lineterminator="\n")
    w.writeheader()
    w.writerows(kamus)

print(f"tag_dokumen.csv: {len(baris)} baris, {len({b['dokumen_id'] for b in baris})} dokumen bertag")
print(f"kamus_tag.csv: {len(kamus)} baris, {sum(1 for x in kamus if x['jenis'] == 'baku')} konsep baku")
