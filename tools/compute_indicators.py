#!/usr/bin/env python3
"""Implementasi acuan indikator (bagian 4) dan pemeriksaan data (bagian 8.2) dari spesifikasi.

Keluaran: data/expected_indicators.json, dipakai sebagai fixture pengujian implementasi dasbor.
Pemakaian: python tools/compute_indicators.py [--tanggal-data 2026-10-08]

Catatan: HK(a, b) = hari kerja pada rentang (a, b]; Senin-Jumat dikurangi tabel hari_libur.
"""
import argparse
import datetime as dt
import json
import math
import re
import unicodedata
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"

ap = argparse.ArgumentParser()
ap.add_argument("--tanggal-data", default="2026-10-08")
args = ap.parse_args()
TODAY = dt.date.fromisoformat(args.tanggal_data)

dok = pd.read_csv(DATA / "dokumen.csv", keep_default_na=False)
riw = pd.read_csv(DATA / "riwayat_status.csv", keep_default_na=False)
libur = pd.read_csv(DATA / "hari_libur.csv")
unit = pd.read_csv(DATA / "unit_kerja.csv")
HOL = {dt.date.fromisoformat(x) for x in libur["tanggal"]}


def hk(a, b):
    n, d = 0, a
    while d < b:
        d += dt.timedelta(days=1)
        if d.weekday() < 5 and d not in HOL:
            n += 1
    return n


def pct(x, y):
    return round(100 * x / y, 1) if y else None


PROSES = ["DRAFT", "OPERATOR_KONTEN", "PIC_UKE", "TERVALIDASI"]
TIDAK_TAYANG = ["DITOLAK_OPERATOR", "DITOLAK_PIC", "UNPUBLISH"]
LIMIT = 5

entri = dok[dok["sumber"] == "ENTRI"].copy()
prog = dok[dok["sumber"] == "MENU_PROGRAM"]
dok["status_saat_ini"] = dok["status_saat_ini"].astype(str)

# ------------------------------------------------------------ pemeriksaan 8.2
checks = {}
total = len(dok)
terpub = int((dok["status_saat_ini"] == "PUBLISH").sum())
proses = int(entri["status_saat_ini"].isin(PROSES).sum())
tidak_tayang = int(entri["status_saat_ini"].isin(TIDAK_TAYANG).sum() + (prog["status_saat_ini"] == "UNPUBLISH").sum())
checks["persamaan_total"] = total == terpub + proses + tidak_tayang
checks["dokumen_id_unik"] = bool(dok["dokumen_id"].is_unique)
checks["uke2_ada_di_referensi"] = bool(entri["uke2"].isin(unit["uke2"]).all())
checks["uke1_turunan_uke2"] = bool(
    (entri.merge(unit, on="uke2", suffixes=("", "_ref"))["uke1"] == entri.merge(unit, on="uke2", suffixes=("", "_ref"))["uke1_ref"]).all())
checks["status_valid"] = bool(
    entri["status_saat_ini"].isin(PROSES + ["PUBLISH"] + TIDAK_TAYANG).all()
    and prog["status_saat_ini"].isin(["PUBLISH", "UNPUBLISH"]).all())
last = riw.sort_values(["dokumen_id", "tgl_perubahan"]).groupby("dokumen_id").tail(1).set_index("dokumen_id")
checks["riwayat_sesuai_status"] = bool((last["status_ke"] == entri.set_index("dokumen_id")["status_saat_ini"]).all())
cr = pd.to_datetime(entri["tgl_dibuat"], utc=True)
st = pd.to_datetime(entri["tgl_status_terakhir"], utc=True)
checks["tanggal_logis"] = bool((st >= cr).all() and (st.dt.date <= TODAY).all())

# ------------------------------------------------------------ alur kerja (entri)
ip = entri[entri["status_saat_ini"].isin(PROSES)].copy()
ip["lama"] = [hk(dt.datetime.fromisoformat(s).date(), TODAY) for s in ip["tgl_status_terakhir"]]
ip["lewat"] = ip["lama"] > LIMIT
stage = {}
for s in PROSES:
    g = ip[ip["status_saat_ini"] == s]
    stage[s] = {"jumlah": len(g), "lebih_dari_5_hk": int(g["lewat"].sum()),
                "persen_melewati": pct(int(g["lewat"].sum()), len(g)),
                "rata_rata_tertahan_hk": round(float(g["lama"].mean()), 1) if len(g) else None}


def unit_row(g):
    p = g[g["status_saat_ini"].isin(PROSES)]
    return {"total": len(g), "publish": int((g["status_saat_ini"] == "PUBLISH").sum()),
            "persen_publish": pct(int((g["status_saat_ini"] == "PUBLISH").sum()), len(g)),
            "dalam_proses": len(p), "lebih_dari_5_hk": int(p["lewat"].sum()) if len(p) else 0,
            "rata_rata_tertahan_hk": round(float(p["lama"].mean()), 1) if len(p) else None}


ent2 = entri.merge(ip[["dokumen_id", "lama", "lewat"]], on="dokumen_id", how="left")
ent2["lewat"] = ent2["lewat"].fillna(False).astype(bool)
per_uke1, per_uke2 = {}, {}
for u1, g in ent2.groupby("uke1"):
    per_uke1[u1] = unit_row(g)
    per_uke1[u1]["uke2"] = {u2: unit_row(g2) for u2, g2 in g.groupby("uke2")}


def agg_status(avg):
    if avg is None:
        return "Tidak ada antrean"
    return "Melewati batas" if avg > 5 else ("Mendekati batas" if avg >= 4 else "Dalam batas")


for u1 in per_uke1.values():
    u1["status"] = agg_status(u1["rata_rata_tertahan_hk"])
    for u2 in u1["uke2"].values():
        u2["status"] = agg_status(u2["rata_rata_tertahan_hk"])

# ------------------------------------------------------------ tren & menu
entri["bulan"] = pd.to_datetime(entri["tgl_dibuat"], utc=True).dt.tz_convert("Asia/Jakarta").dt.tz_localize(None).dt.to_period("M")
tren = {str(k): int(v) for k, v in entri[entri["bulan"].astype(str).str.startswith("2026")].groupby("bulan").size().items()}
lengkap = [v for k, v in tren.items() if k < f"{TODAY.year}-{TODAY.month:02d}"]
menu = {k: int(v) for k, v in prog.groupby("menu_program").size().sort_values(ascending=False).items()}

# ------------------------------------------------------------ kualitas
dim = [f"skor_dimensi_{k}" for k in range(1, 8)]
skor = dok["skor_metadata"].astype(float)
bins = {"di_bawah_50": int((skor < 50).sum()), "50_69": int(((skor >= 50) & (skor < 70)).sum()),
        "70_84": int(((skor >= 70) & (skor < 85)).sum()), "85_ke_atas": int((skor >= 85).sum())}
AMBANG_KELENGKAPAN = 60  # keputusan implementasi data contoh; ambang resmi ditetapkan Tim PIP
batas12 = (pd.Timestamp(TODAY) - pd.DateOffset(months=12)).date()
masalah = {
    "metadata_belum_lengkap": int((dok["skor_dimensi_1"].astype(float) < AMBANG_KELENGKAPAN).sum()),
    "tanpa_pic": int(((dok["sumber"] == "ENTRI") & (dok["pic_uke"] == "")).sum()),
    "belum_diperbarui_12_bulan": int((pd.to_datetime(dok["tgl_pembaruan_terakhir"]).dt.date < batas12).sum()),
    "kandidat_duplikat": int(dok["hash_konten"].duplicated(keep=False).sum()),
    "file_tidak_terbaca": int((dok["ocr_berhasil"].astype(str).str.lower() == "false").sum()),
}

# ------------------------------------------------------------ tag (spesifikasi 1.4, bagian 4.4)
JENIS_KAMUS = {"baku", "ejaan", "singkatan", "sinonim", "bentuk", "bahasa"}
KATA_SAMBUNG = {"dan", "di", "ke", "dari", "yang", "untuk", "atau", "serta"}
AMBANG_KEMIRIPAN_TAG = 0.92  # konstanta, sama dengan src/config.ts
PANJANG_MIN_KEMIRIPAN = 5


def norm_tag(t):
    """Bentuk pembanding: huruf kecil, tanda baca menjadi spasi, spasi dirapikan."""
    t = unicodedata.normalize("NFKC", str(t)).lower()
    return " ".join(re.sub(r"[^0-9a-z\u00c0-\u024f ]+", " ", t).split())


def jaro_winkler(a, b):
    if a == b:
        return 1.0
    la, lb = len(a), len(b)
    if not la or not lb:
        return 0.0
    jarak = max(0, max(la, lb) // 2 - 1)
    ma, mb = [False] * la, [False] * lb
    m = 0
    for i in range(la):
        for j in range(max(0, i - jarak), min(lb, i + jarak + 1)):
            if not mb[j] and a[i] == b[j]:
                ma[i] = mb[j] = True
                m += 1
                break
    if not m:
        return 0.0
    t, k = 0, 0
    for i in range(la):
        if ma[i]:
            while not mb[k]:
                k += 1
            if a[i] != b[k]:
                t += 1
            k += 1
    jaro = (m / la + m / lb + (m - t / 2) / m) / 3
    p = 0
    while p < min(4, la, lb) and a[p] == b[p]:
        p += 1
    return jaro + p * 0.1 * (1 - jaro)


def singkatan_dari(pendek, panjang):
    kata = panjang.split()
    if " " in pendek or not (2 <= len(pendek) <= 6) or len(kata) < 2:
        return False
    return pendek == "".join(w[0] for w in kata if w not in KATA_SAMBUNG)


tag_path, kamus_path = DATA / "tag_dokumen.csv", DATA / "kamus_tag.csv"
tagd = pd.read_csv(tag_path, keep_default_na=False, dtype=str) if tag_path.exists() else None
kamus = pd.read_csv(kamus_path, keep_default_na=False, dtype=str) if kamus_path.exists() else pd.DataFrame(columns=["tag_varian", "tag_baku", "jenis"])

peta_kamus = {}  # norm(tag_varian) -> (tag_baku, jenis)
for r in kamus.itertuples():
    peta_kamus.setdefault(norm_tag(r.tag_varian), (r.tag_baku.strip(), r.jenis.strip().lower()))
baku_norm = {norm_tag(r.tag_baku) for r in kamus.itertuples()}
kunci_kamus = {}
for r in kamus.itertuples():
    kunci_kamus.setdefault(norm_tag(r.tag_varian), set()).add(norm_tag(r.tag_baku))
checks["tag_dokumen_ada_di_dokumen"] = bool(tagd is None or tagd["dokumen_id"].isin(dok["dokumen_id"]).all())
checks["kamus_tag_valid"] = bool(
    kamus["jenis"].str.strip().str.lower().isin(JENIS_KAMUS).all()
    and all(len(v) == 1 for v in kunci_kamus.values())
    and all(peta_kamus.get(b, ("", ""))[1] == "baku" for b in baku_norm))


def status_tag(n):
    if n in peta_kamus:
        baku, jenis = peta_kamus[n]
        return baku, jenis, ("baku" if jenis == "baku" else "padanan_bahasa" if jenis == "bahasa" else "varian")
    return n, "", "belum_di_kamus"


def hitung_tag(sel_ids):
    if tagd is None:
        return None, set()
    t = tagd[tagd["dokumen_id"].isin(sel_ids)].copy()
    t["norm"] = t["tag"].map(norm_tag)
    t = t[t["norm"] != ""].drop_duplicates(["dokumen_id", "norm"])
    info = t["norm"].map(status_tag)
    t["konsep"] = [x[0] for x in info]
    t["jenis"] = [x[1] for x in info]
    t["status"] = [x[2] for x in info]
    hit = {k: int((t["status"] == k).sum()) for k in ("baku", "padanan_bahasa", "varian", "belum_di_kamus")}
    per_konsep = {}
    for k, g in t.groupby("konsep", sort=True):
        bentuk = {}
        for n, gb in g.groupby("norm", sort=True):
            tulisan = gb["tag"].str.strip().value_counts()
            tulisan = sorted(tulisan.items(), key=lambda x: (-x[1], x[0]))[0][0]
            bentuk[n] = {"tulisan": tulisan, "status": gb["status"].iloc[0], "jenis": gb["jenis"].iloc[0], "penggunaan": len(gb)}
        ok = int(g["status"].isin(["baku", "padanan_bahasa"]).sum())
        var = int((g["status"] == "varian").sum())
        per_konsep[k] = {"penggunaan": len(g), "dokumen": int(g["dokumen_id"].nunique()),
                         "persen_konsistensi": pct(ok, ok + var), "bentuk": bentuk}
    # kandidat padanan: bentuk yang belum di kamus dan mirip bentuk lain dengan konsep berbeda
    belum = sorted(set(t.loc[t["status"] == "belum_di_kamus", "norm"]))
    pembanding = sorted(set(peta_kamus) | set(t["norm"]))
    kandidat = []
    for a in belum:
        terbaik = None
        for b in pembanding:
            if b == a:
                continue
            kb = peta_kamus[b][0] if b in peta_kamus else b
            if norm_tag(kb) == a:
                continue
            if singkatan_dari(b, a) or singkatan_dari(a, b):
                c = (2.0, "singkatan", b, kb)
            elif min(len(a), len(b)) >= PANJANG_MIN_KEMIRIPAN and (s := jaro_winkler(a, b)) >= AMBANG_KEMIRIPAN_TAG:
                c = (s, "ejaan mirip", b, kb)
            else:
                continue
            if terbaik is None or (c[0], b in peta_kamus) > (terbaik[0], terbaik[2] in peta_kamus):
                terbaik = c
        if terbaik:
            s, alasan, b, kb = terbaik
            kandidat.append({"tag": a, "usulan_baku": kb, "alasan": alasan,
                             "kemiripan": None if alasan == "singkatan" else round(s, 2),
                             "dokumen": int(t.loc[t["norm"] == a, "dokumen_id"].nunique())})
    kandidat.sort(key=lambda x: (-x["dokumen"], x["tag"]))
    ok, var = hit["baku"] + hit["padanan_bahasa"], hit["varian"]
    bertag = int(t["dokumen_id"].nunique())
    hasil = {
        "dokumen_bertag": bertag, "dokumen_tanpa_tag": len(sel_ids) - bertag,
        "penggunaan_tag": len(t), "bentuk_unik": int(t["norm"].nunique()), "konsep_unik": int(t["konsep"].nunique()),
        "penggunaan": hit, "persen_konsistensi": pct(ok, ok + var),
        "konsep_dengan_varian": sum(1 for v in per_konsep.values() if any(b["status"] == "varian" for b in v["bentuk"].values())),
        "per_konsep": per_konsep, "kandidat_padanan": kandidat,
    }
    return hasil, set(t.loc[t["status"] == "varian", "dokumen_id"])


tag_hasil, dok_tag_tidak_baku = hitung_tag(set(dok["dokumen_id"]))
masalah["tag_tidak_baku"] = len(dok_tag_tidak_baku)

# ------------------------------------------------------------ snapshot bulanan (keputusan: snapshot bulanan)
def snapshot(D):
    """Keadaan pada akhir hari D, direkonstruksi dari riwayat_status (entri) dan tanggal dokumen/publish (Menu Program)."""
    cutoff = pd.Timestamp(D.isoformat() + " 23:59:59", tz="Asia/Jakarta")
    r = riw.assign(ts=pd.to_datetime(riw["tgl_perubahan"], utc=True))
    cur = r[r["ts"] <= cutoff].sort_values(["dokumen_id", "ts"]).groupby("dokumen_id").tail(1)
    e_pub = int((cur["status_ke"] == "PUBLISH").sum())
    e_proses = cur[cur["status_ke"].isin(PROSES)]
    e_tt = int(cur["status_ke"].isin(TIDAK_TAYANG).sum())
    lewat = sum(hk(t.tz_convert("Asia/Jakarta").date(), D) > LIMIT for t in e_proses["ts"])
    pc_ = prog[pd.to_datetime(prog["tgl_dibuat"], utc=True) <= cutoff]
    p_pub = int(((pc_["status_saat_ini"] == "PUBLISH") & (pd.to_datetime(pc_["tgl_publish"].replace("", pd.NA), utc=True) <= cutoff)).sum())
    return {"tanggal_snapshot": D.isoformat(), "total_aset": len(cur) + len(pc_), "terpublikasi": e_pub + p_pub,
            "dalam_proses_entri": len(e_proses), "tidak_tayang": e_tt + (len(pc_) - p_pub),
            "tertahan_lebih_dari_5_hk": int(lewat)}


snaps = [snapshot(d) for d in (dt.date(2026, 7, 31), dt.date(2026, 8, 31), dt.date(2026, 9, 30), TODAY)]
pd.DataFrame(snaps).to_csv(DATA / "snapshot_bulanan.csv", index=False, lineterminator="\n")
prev, now = snaps[-2], snaps[-1]
delta = {k: now[k] - prev[k] for k in now if k != "tanggal_snapshot"}
checks["snapshot_persamaan_total"] = all(x["total_aset"] == x["terpublikasi"] + x["dalam_proses_entri"] + x["tidak_tayang"] for x in snaps)


out = {
    "tanggal_data": TODAY.isoformat(),
    "batas_tertahan_hari_kerja": LIMIT,
    "target_publikasi_persen": 95,
    "pemeriksaan_data": checks,
    "ringkasan": {
        "total_aset": total, "entri": len(entri), "menu_program": len(prog),
        "terpublikasi": terpub, "terpublikasi_entri": int((entri["status_saat_ini"] == "PUBLISH").sum()),
        "terpublikasi_menu_program": int((prog["status_saat_ini"] == "PUBLISH").sum()),
        "persen_publish": pct(terpub, total),
        "kekurangan_menuju_target": max(0, math.ceil(0.95 * total) - terpub),
        "dalam_proses_entri": proses, "tidak_tayang": tidak_tayang,
        "tidak_tayang_entri": int(entri["status_saat_ini"].isin(TIDAK_TAYANG).sum()),
        "tidak_tayang_menu_program": int((prog["status_saat_ini"] == "UNPUBLISH").sum()),
        "tertahan_lebih_dari_5_hk": int(ip["lewat"].sum()),
    },
    "status_entri": {k: int(v) for k, v in entri["status_saat_ini"].value_counts().items()},
    "tahap": stage,
    "uke1": per_uke1,
    "dokumen_baru_per_bulan_2026": tren,
    "rata_rata_bulanan_bulan_lengkap": round(sum(lengkap) / len(lengkap), 1) if lengkap else None,
    "dokumen_per_menu_program": menu,
    "snapshot_bulanan": snaps,
    "perubahan_dibanding_akhir_bulan_lalu": delta,
    "kualitas": {
        "skor_rata_rata": round(float(skor.mean()), 1),
        "skor_per_dimensi": {f"dimensi_{k}": round(float(dok[c].astype(float).mean()), 1) for k, c in enumerate(dim, 1)},
        "sebaran_skor": bins, "masalah": masalah, "ambang_kelengkapan": AMBANG_KELENGKAPAN,
        "tag": tag_hasil,
    },
}
(DATA / "expected_indicators.json").write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
print(json.dumps({k: out[k] for k in ("pemeriksaan_data", "ringkasan", "status_entri", "tahap", "dokumen_baru_per_bulan_2026",
                                     "rata_rata_bulanan_bulan_lengkap", "dokumen_per_menu_program")}, ensure_ascii=False, indent=1))
print(json.dumps({k: v for k, v in out["kualitas"].items() if k != "tag"}, ensure_ascii=False))
if tag_hasil:
    print(json.dumps({k: v for k, v in tag_hasil.items() if k != "per_konsep"}, ensure_ascii=False, indent=1))
