# Dasbor Monitoring Aset Pengetahuan KOMENS

Versi awal dasbor monitoring KOMENS (Pusdatinrenbang, Tim Pengelolaan Informasi dan Pengetahuan): aplikasi web
statis yang responsif, dengan tiga tampilan: Ringkasan Pimpinan, Kontrol Alur Kerja, dan Kualitas Aset.

> Spesifikasi resmi belum tersedia. `docs/spesifikasi.md` adalah **rancangan usulan** yang disusun dari
> `CLAUDE.md`, implementasi acuan `tools/compute_indicators.py`, dan mockup. Butir bertanda **[usulan]**
> perlu dikonfirmasi pemilik kebutuhan.

## Menjalankan

Butuh Node.js 18 atau lebih baru.

```bash
npm install
npm run dev          # pengembangan: http://localhost:5173
npm test             # uji modul indikator terhadap data/expected_indicators.json
npm run build        # hasil statis di dist/ (index.html, assets/, data/*.csv)
npx vite preview --port 4173 &   # sajikan dist/
npm run uji:penerimaan           # uji penerimaan bagian 9 di peramban (butuh Chromium; atur CHROME_PATH bila perlu)
```

`dist/` dapat disajikan dari server statis apa pun (Nginx, Apache, GitHub Pages). Tidak ada backend.

## Mengganti data

Berkas CSV dibaca saat halaman dimuat dari `data/` (di `dist/data/` setelah build). Untuk memperbarui data:

1. Timpa berkas di `dist/data/` (atau `data/` sebelum build) dengan skema yang sama (lihat spesifikasi bagian 3).
2. Ubah `TANGGAL_DATA` di `src/config.ts` lalu build ulang. Langkah ini hanya perlu bila tanggal cut-off berubah.
3. Ganti `hari_libur.csv` dengan kalender resmi SKB 3 Menteri. Berkas contoh masih **parsial**.
4. Setel `DATA_CONTOH = false` bila data sudah data produksi.

Bila data tidak lolos pemeriksaan (spesifikasi 8.2), dasbor menampilkan peringatan teks.

## Struktur

| Lokasi | Isi |
| --- | --- |
| `src/indicators/` | Modul indikator murni (tanpa UI): parser CSV, hari kerja, rumus, pemeriksaan data, rekonstruksi snapshot |
| `src/components/` | Tampilan React |
| `src/config.ts` | Parameter yang dapat diubah: tanggal data, batas 5 HK, target 95%, ambang kelengkapan, dll. |
| `tests/` | Uji Vitest terhadap `data/expected_indicators.json` |
| `scripts/uji-penerimaan.mjs` | Uji penerimaan antarmuka (Playwright) |
| `hasil-uji/hasil-uji-penerimaan.md` | Hasil uji penerimaan terakhir |
| `data/`, `tools/`, `reference/`, `CLAUDE.md` | Paket serah terima (tidak diubah) |
