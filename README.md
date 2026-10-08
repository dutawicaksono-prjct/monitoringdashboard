# Dasbor Monitoring Aset Pengetahuan KOMENS

Dasbor monitoring aset pengetahuan KOMENS (Pusdatinrenbang, Tim Pengelolaan Informasi dan Pengetahuan):
aplikasi web statis yang responsif, dengan tiga tampilan: Ringkasan Pimpinan, Kontrol Alur Kerja, dan
Kualitas Aset. Versi ini memakai **data contoh** dan disiapkan sebagai rekomendasi / contoh pembangunan dasbor.

## Dokumentasi

| Dokumen | Untuk |
| --- | --- |
| [`docs/spesifikasi.md`](docs/spesifikasi.md) | Spesifikasi fungsional 1.0 (disetujui): rumus, tampilan, kriteria penerimaan |
| [`docs/panduan-belajar.md`](docs/panduan-belajar.md) | Cara dasbor ini dibangun dan cara mengembangkannya |
| [`docs/panduan-data.md`](docs/panduan-data.md) | Kamus data, prosedur pembaruan bulanan, keamanan data |
| [`docs/panduan-pemasangan.md`](docs/panduan-pemasangan.md) | GitHub Pages dan server Pusdatinrenbang (Nginx) |
| [`docs/panduan-pengguna.md`](docs/panduan-pengguna.md) | Cara membaca dan memakai dasbor |
| [`docs/panduan-uji-pengguna.md`](docs/panduan-uji-pengguna.md) | Rencana uji coba pengguna, tugas, kuesioner SUS |
| [`hasil-uji/hasil-uji-penerimaan.md`](hasil-uji/hasil-uji-penerimaan.md) | Hasil uji penerimaan terakhir |
| [`CHANGELOG.md`](CHANGELOG.md) | Riwayat versi |

## Mulai cepat

Butuh Node.js 18 atau lebih baru.

```bash
npm install
npm run dev             # http://localhost:5173
npm test                # uji rumus terhadap data/expected_indicators.json
npm run periksa-data    # pemeriksaan mutu data (bagian 8.2)
npm run build           # hasil statis di dist/
npx vite preview --port 4173 &   # lalu: npm run uji:penerimaan
```

Setiap push diuji otomatis oleh GitHub Actions (`.github/workflows/ci-deploy.yml`), dan branch default dipasang ke
GitHub Pages. Pages perlu diaktifkan sekali: Settings → Pages → Source: GitHub Actions.

## Struktur

| Lokasi | Isi |
| --- | --- |
| `src/indicators/` | Modul indikator murni: parser CSV, hari kerja, rumus, pemeriksaan data, rekonstruksi snapshot |
| `src/components/` | Tampilan React |
| `src/config.ts` | Parameter: tanggal data, batas 5 HK, target 95%, ambang kelengkapan, tautan masukan |
| `tests/` | Uji Vitest |
| `scripts/` | Uji penerimaan, pemeriksaan data, pembaruan snapshot |
| `templat-data/` | Templat CSV kosong untuk ekspor data nyata |
| `deploy/` | Contoh konfigurasi Nginx |
| `data/`, `tools/`, `reference/`, `CLAUDE.md` | Paket serah terima (data contoh, skrip acuan, mockup) |
