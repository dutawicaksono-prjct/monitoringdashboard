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
    },
}
(DATA / "expected_indicators.json").write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
print(json.dumps({k: out[k] for k in ("pemeriksaan_data", "ringkasan", "status_entri", "tahap", "dokumen_baru_per_bulan_2026",
                                     "rata_rata_bulanan_bulan_lengkap", "dokumen_per_menu_program", "kualitas")}, ensure_ascii=False, indent=1))
