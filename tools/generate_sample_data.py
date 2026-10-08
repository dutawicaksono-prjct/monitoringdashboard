#!/usr/bin/env python3
"""Pembangkit data contoh (DUMMY) untuk dasbor monitoring KOMENS.

Menghasilkan, di folder data/:
  - dokumen.csv          (satu baris per dokumen; skema bagian 3.1 spesifikasi)
  - riwayat_status.csv   (satu baris per perubahan status, hanya entri; bagian 3.2)

Membaca data/unit_kerja.csv dan data/hari_libur.csv. Hasil deterministik (seed tetap).
Tanggal data (cut-off): 2026-10-08.

Catatan penting
  * Seluruh isi adalah data rekaan; nama dokumen, ID, dan nama pengguna bukan data nyata.
  * Jumlah dokumen per status, per UKE II, dan jumlah dokumen tertahan lebih dari 5 hari kerja
    dibangkitkan tepat; rata-rata, skor metadata, dan sebaran skor hanya mendekati angka mockup.
  * Definisi HK(a, b): hari kerja dalam rentang (a, b], yaitu a tidak dihitung, b dihitung.
"""
import csv
import datetime as dt
import hashlib
import math
import random
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
TODAY = dt.date(2026, 10, 8)
TZ = dt.timezone(dt.timedelta(hours=7))


# ---------------------------------------------------------------- referensi
def read_csv(path):
    with open(path, newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


UNITS = [(r["uke1"], r["uke2"]) for r in read_csv(DATA / "unit_kerja.csv")]
HOLIDAYS = {dt.date.fromisoformat(r["tanggal"]) for r in read_csv(DATA / "hari_libur.csv")}
N = len(UNITS)


def is_wd(d):
    return d.weekday() < 5 and d not in HOLIDAYS


def hk(a, b):
    """Hari kerja pada rentang (a, b]."""
    n, d = 0, a
    while d < b:
        d += dt.timedelta(days=1)
        if is_wd(d):
            n += 1
    return n


def wd_back(end, n):
    """Tanggal d sehingga hk(d, end) == n dan d adalah hari kerja (atau end bila n == 0)."""
    d, c = end, 0
    while c < n:
        d -= dt.timedelta(days=1)
        if is_wd(d):
            c += 1
    return d


# ------------------------------------------------- alokasi dokumen per UKE II
def largest_remainder(vals, total):
    s = sum(vals)
    fl = [v * total / s for v in vals]
    ints = [int(math.floor(x)) for x in fl]
    rem = total - sum(ints)
    for i in sorted(range(len(vals)), key=lambda i: fl[i] - ints[i], reverse=True)[:rem]:
        ints[i] += 1
    return ints


def unit_weight(name):
    if name.startswith("Pusat"):
        w = 3.0
    elif name.startswith("Biro"):
        w = 1.2
    elif name.startswith("Sekretariat Deputi") or name.startswith("Inspektorat"):
        w = 0.5
    else:
        w = 1.0
    return w * random.uniform(0.5, 1.6)


def allocate():
    """Matriks I[i][j]: jumlah dokumen entri per UKE II (i) dan status (j);
    B[i][s]: dokumen tertahan lebih dari 5 hari kerja per UKE II dan tahap dalam proses (s)."""
    random.seed(7)
    groups = []
    for u1, _ in UNITS:
        if u1 not in groups:
            groups.append(u1)
    gidx = [groups.index(u1) for u1, _ in UNITS]
    w = [unit_weight(n) for _, n in UNITS]
    w[[n for _, n in UNITS].index("Pusat Sistem, Data, dan Informasi Perencanaan Pembangunan")] *= 2.2
    TOT = 2776
    tot = largest_remainder(w, TOT)
    # kolom: draft, operator, pic, tervalidasi, publish, ditolak (operator+pic), unpublish
    col_t = [223, 64, 860, 55, 1507, 32, 35]
    gf = [random.uniform(0.55, 1.45) for _ in groups]
    M = [[(tot[i] * col_t[j] / TOT) * random.uniform(0.4, 1.8) for j in range(7)] for i in range(N)]
    for i in range(N):
        M[i][4] *= gf[gidx[i]] ** 1.6
    for _ in range(200):
        for i in range(N):
            s = sum(M[i])
            M[i] = [x * tot[i] / s for x in M[i]]
        for j in range(7):
            s = sum(M[i][j] for i in range(N))
            for i in range(N):
                M[i][j] *= col_t[j] / s
    I = [[int(math.floor(x)) for x in row] for row in M]
    rr = [tot[i] - sum(I[i]) for i in range(N)]
    cr = [col_t[j] - sum(I[i][j] for i in range(N)) for j in range(7)]
    cells = sorted(((M[i][j] - I[i][j], i, j) for i in range(N) for j in range(7)), reverse=True)
    for _, i, j in cells:
        if rr[i] > 0 and cr[j] > 0:
            I[i][j] += 1
            rr[i] -= 1
            cr[j] -= 1
    while any(rr) or any(cr):
        i = max(range(N), key=lambda k: rr[k])
        j = max(range(7), key=lambda k: cr[k])
        if rr[i] > 0 and cr[j] > 0:
            I[i][j] += 1
            rr[i] -= 1
            cr[j] -= 1
        else:
            raise SystemExit("alokasi gagal")
    bt = [150, 28, 590, 22]
    B = [[0] * 4 for _ in range(N)]
    ratio = [random.uniform(0.15, 0.95) for _ in range(N)]
    for s in range(4):
        caps = [I[i][s] for i in range(N)]
        vals = [caps[i] * ratio[i] for i in range(N)]
        for _ in range(50):
            sc = sum(vals)
            vals = [min(caps[i], v * bt[s] / sc) for i, v in enumerate(vals)]
        ints = [int(math.floor(v)) for v in vals]
        rem = bt[s] - sum(ints)
        order = sorted(range(N), key=lambda i: vals[i] - ints[i], reverse=True)
        k = 0
        while rem > 0:
            i = order[k % N]
            k += 1
            if ints[i] < caps[i]:
                ints[i] += 1
                rem -= 1
        for i in range(N):
            B[i][s] = ints[i]
    return I, B


# ------------------------------------------------------------------ pembangun
def build():
    I, B = allocate()
    rng = random.Random(20261008)

    def rand_dt(d):
        return dt.datetime.combine(d, dt.time(rng.randint(8, 16), rng.randint(0, 59), rng.randint(0, 59)), TZ)

    def last_day(y, m):
        nxt = dt.date(y + (m == 12), (m % 12) + 1, 1)
        return nxt - dt.timedelta(days=1)

    # ---- dokumen entri
    stages = ["DRAFT", "OPERATOR_KONTEN", "PIC_UKE", "TERVALIDASI"]
    rej = ["DITOLAK_OPERATOR"] * 25 + ["DITOLAK_PIC"] * 7
    rng.shuffle(rej)
    docs = []
    scale = [6, 1.5, 10, 1.5]
    for i in range(N):
        for s in range(4):
            for k in range(I[i][s]):
                breach = k < B[i][s]
                if breach:
                    age = 6 + min(int(rng.expovariate(1 / scale[s])), 45)
                else:
                    age = rng.choices(range(6), weights=[3, 3, 2, 2, 1, 1])[0]
                T = rand_dt(wd_back(TODAY, age))
                docs.append(dict(src="ENTRI", unit=i, status=stages[s], inproc=True, T=T))
        for _ in range(I[i][4]):
            docs.append(dict(src="ENTRI", unit=i, status="PUBLISH", inproc=False))
        for _ in range(I[i][5]):
            docs.append(dict(src="ENTRI", unit=i, status=rej.pop(), inproc=False))
        for _ in range(I[i][6]):
            docs.append(dict(src="ENTRI", unit=i, status="UNPUBLISH", inproc=False))

    # ---- kuota dokumen entri baru per bulan 2026 (sesuai mockup)
    quota = {10: 12, 9: 200, 8: 40, 7: 74, 6: 22, 5: 108, 4: 21, 3: 11, 2: 6, 1: 22}
    one = dt.timedelta(days=1)
    for m in [10, 9, 8, 7, 6, 5, 4, 3, 2, 1]:
        start, end = dt.date(2026, m, 1), min(last_day(2026, m), TODAY)
        fresh_c = [d for d in docs if d["status"] == "DRAFT" and d["inproc"] and "C" not in d
                   and start <= d["T"].date() <= end]
        kf = min(len(fresh_c), quota[m] * 2 // 3)
        for d in rng.sample(fresh_c, kf):
            d["C"], d["fresh"] = d["T"], True
        cands = []
        for d in docs:
            if "C" in d:
                continue
            upper = min(end, d["T"].date() - one) if d["inproc"] else min(end, TODAY - 2 * one)
            if upper >= start:
                cands.append((d, upper))
        for d, upper in rng.sample(cands, quota[m] - kf):
            day = start + dt.timedelta(days=rng.randint(0, (upper - start).days))
            d["C"] = rand_dt(day)
    for d in docs:
        if "C" not in d:
            day = dt.date(2024, 3, 1) + dt.timedelta(days=rng.randint(0, (dt.date(2025, 12, 31) - dt.date(2024, 3, 1)).days))
            d["C"] = rand_dt(day)
        if not d["inproc"]:
            maxlag = (TODAY - d["C"].date()).days
            lag = rng.randint(1, min(300, maxlag))
            d["T"] = rand_dt(d["C"].date() + dt.timedelta(days=lag))
            if d["T"] <= d["C"]:
                d["T"] = d["C"] + dt.timedelta(hours=3)

    # ---- dokumen Menu Program
    menus = [("JDIH", 1812), ("RPJMN", 128), ("RKP", 96), ("MUSRENBANG", 82), ("RKPD", 55), ("SDGs", 48),
             ("RPJPN", 14), ("LAMPID", 12), ("RENJA", 11), ("RPJPD", 10), ("REPELITA", 10), ("PROPENAS", 9)]
    assert sum(c for _, c in menus) == 2287
    pubs = largest_remainder([c * rng.uniform(0.6, 1.4) for _, c in menus], 1180)
    assert all(p <= c for p, (_, c) in zip(pubs, menus))
    prog = []
    for (name, cnt), npub in zip(menus, pubs):
        for k in range(cnt):
            if rng.random() < 0.55:
                day = dt.date(2023, 6, 1) + dt.timedelta(days=rng.randint(0, (dt.date(2025, 12, 31) - dt.date(2023, 6, 1)).days))
            else:
                day = dt.date(2026, 1, 1) + dt.timedelta(days=rng.randint(0, (TODAY - dt.date(2026, 1, 1)).days))
            d = dict(src="MENU_PROGRAM", menu=name, status="PUBLISH" if k < npub else "UNPUBLISH", inproc=False, C=rand_dt(day))
            if d["status"] == "PUBLISH":
                lag = rng.randint(0, min(200, (TODAY - day).days))
                d["P"] = rand_dt(day + dt.timedelta(days=lag))
                if d["P"] < d["C"]:
                    d["P"] = d["C"] + dt.timedelta(minutes=30)
            prog.append(d)
    alldocs = docs + prog

    # ---- ID dokumen
    for pref, grp in (("ENT", docs), ("PRG", prog)):
        for n, d in enumerate(sorted(grp, key=lambda x: x["C"]), 1):
            d["id"] = f"{pref}-{n:05d}"

    # ---- riwayat status (entri)
    paths = {
        "DRAFT_FRESH": ["DRAFT"],
        "DRAFT": ["DRAFT", "OPERATOR_KONTEN", "DITOLAK_OPERATOR", "DRAFT"],
        "OPERATOR_KONTEN": ["DRAFT", "OPERATOR_KONTEN"],
        "PIC_UKE": ["DRAFT", "OPERATOR_KONTEN", "PIC_UKE"],
        "TERVALIDASI": ["DRAFT", "OPERATOR_KONTEN", "PIC_UKE", "TERVALIDASI"],
        "PUBLISH": ["DRAFT", "OPERATOR_KONTEN", "PIC_UKE", "TERVALIDASI", "PUBLISH"],
        "DITOLAK_OPERATOR": ["DRAFT", "OPERATOR_KONTEN", "DITOLAK_OPERATOR"],
        "DITOLAK_PIC": ["DRAFT", "OPERATOR_KONTEN", "PIC_UKE", "DITOLAK_PIC"],
        "UNPUBLISH": ["DRAFT", "OPERATOR_KONTEN", "PIC_UKE", "TERVALIDASI", "PUBLISH", "UNPUBLISH"],
    }
    role = {"DRAFT": "pengusul", "OPERATOR_KONTEN": "pengusul", "PIC_UKE": "operator_konten",
            "TERVALIDASI": "pic_uke", "PUBLISH": "operator_konten", "DITOLAK_OPERATOR": "operator_konten",
            "DITOLAK_PIC": "pic_uke", "UNPUBLISH": "admin"}
    hist = []
    for d in docs:
        key = "DRAFT_FRESH" if d.get("fresh") else d["status"]
        seq = paths[key]
        C, T = d["C"], d["T"]
        n = len(seq)
        if n == 1:
            times = [C]
        else:
            span = (T - C).total_seconds()
            mid = sorted(rng.uniform(0.02, 0.98) for _ in range(n - 2))
            times = [C] + [C + dt.timedelta(seconds=span * u) for u in mid] + [T]
        prev = ""
        for st, tm in zip(seq, times):
            hist.append([d["id"], prev, st, tm.isoformat(timespec="seconds"), f"{role[st]}_{d['unit']:02d}"])
            prev = st
            if st == "PUBLISH" and d["status"] == "UNPUBLISH":
                d["P"] = tm
        if d["status"] == "PUBLISH":
            d["P"] = T

    # ---- atribut kualitas
    ids = list(range(len(alldocs)))
    rng.shuffle(ids)
    bucket_sizes = [480, 1690, 2110, 783]
    ranges = [(34, 48, 0.4), (52, 68, 0.75), (72, 83, 0.9), (87, 96, 0.45)]
    off = [6, -1, -8, -3, 8, -14, 12]
    pos = 0
    for b, size in enumerate(bucket_sizes):
        lo, hi, sc = ranges[b]
        for idx in ids[pos:pos + size]:
            s = rng.uniform(lo, hi)
            noise = [rng.uniform(-4, 4) for _ in range(7)]
            mn = sum(noise) / 7
            alldocs[idx]["dims"] = [s + off[k] * sc + noise[k] - mn for k in range(7)]
        pos += size
    incomplete = set(rng.sample(range(len(alldocs)), 412))
    for idx, d in enumerate(alldocs):
        dims = [int(round(max(0, min(100, x)))) for x in d["dims"]]
        dims[0] = rng.randint(30, 59) if idx in incomplete else max(60, dims[0])
        d["dims"] = dims
        d["skor"] = round(sum(dims) / 7, 1)
    ocr_bad = set(rng.sample(range(len(alldocs)), 38))
    entri_idx = [i for i, d in enumerate(alldocs) if d["src"] == "ENTRI"]
    no_pic = set(rng.sample(entri_idx, 96))
    old_cut = dt.date(2025, 10, 8)
    old_pool = [i for i, d in enumerate(alldocs) if d["C"].date() < old_cut]
    outdated = set(rng.sample(old_pool, 538))
    pool = [i for i in range(len(alldocs)) if i not in ocr_bad]
    dup = rng.sample(pool, 74)
    dup_hash = {}
    for a, b in zip(dup[0::2], dup[1::2]):
        h = hashlib.sha1(f"dup-{a}-{b}".encode()).hexdigest()
        dup_hash[a] = dup_hash[b] = h
    for idx, d in enumerate(alldocs):
        d["ocr"] = idx not in ocr_bad
        d["pic"] = "" if (d["src"] == "ENTRI" and idx in no_pic) else (f"pic_{d['unit']:02d}" if d["src"] == "ENTRI" else "")
        if idx in outdated:
            span = (dt.date(2025, 10, 7) - d["C"].date()).days
            d["upd"] = d["C"].date() + dt.timedelta(days=rng.randint(0, max(0, span)))
        else:
            lo = max(d["C"].date(), dt.date(2025, 10, 9))
            d["upd"] = lo + dt.timedelta(days=rng.randint(0, (TODAY - lo).days))
        d["hash"] = dup_hash.get(idx) or hashlib.sha1(f"doc-{d['id']}".encode()).hexdigest()

    # ---- tulis CSV
    cols = ["dokumen_id", "judul", "sumber", "menu_program", "uke1", "uke2", "pic_uke", "status_saat_ini",
            "tgl_dibuat", "tgl_status_terakhir", "tgl_publish", "skor_metadata"] + \
           [f"skor_dimensi_{k}" for k in range(1, 8)] + ["tgl_pembaruan_terakhir", "hash_konten", "ocr_berhasil"]
    rows = []
    for d in sorted(alldocs, key=lambda x: x["id"]):
        entri = d["src"] == "ENTRI"
        rows.append([
            d["id"], f"[CONTOH] Dokumen pengetahuan {d['id']}", d["src"], "" if entri else d["menu"],
            UNITS[d["unit"]][0] if entri else "", UNITS[d["unit"]][1] if entri else "", d["pic"], d["status"],
            d["C"].isoformat(timespec="seconds"),
            d["T"].isoformat(timespec="seconds") if entri else "",
            d["P"].isoformat(timespec="seconds") if d.get("P") else "",
            f"{d['skor']:.1f}", *d["dims"], d["upd"].isoformat(), d["hash"], "true" if d["ocr"] else "false",
        ])
    with open(DATA / "dokumen.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f, lineterminator="\n")
        w.writerow(cols)
        w.writerows(rows)
    hist.sort(key=lambda r: (r[0], r[3]))
    with open(DATA / "riwayat_status.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f, lineterminator="\n")
        w.writerow(["dokumen_id", "status_dari", "status_ke", "tgl_perubahan", "diubah_oleh"])
        w.writerows(hist)
    print("dokumen:", len(rows), "riwayat:", len(hist))


if __name__ == "__main__":
    build()
