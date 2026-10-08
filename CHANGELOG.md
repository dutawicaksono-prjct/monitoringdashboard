# Catatan Perubahan

Format mengikuti [Keep a Changelog](https://keepachangelog.com/id-ID/1.1.0/); penomoran versi mengikuti
[Semantic Versioning](https://semver.org/lang/id/): MAYOR untuk perubahan rumus/definisi indikator, MINOR untuk
tampilan atau fitur baru, PATCH untuk perbaikan.

## [1.0.0] - 2026-10-08

### Ditambahkan
- Tiga tampilan: Ringkasan Pimpinan, Kontrol Alur Kerja, Kualitas Aset.
- Filter Periode, UKE I, UKE II, Sumber data.
- Modul indikator murni yang identik dengan `data/expected_indicators.json`.
- Pemeriksaan data 8.2 dengan peringatan; validasi kolom wajib saat memuat CSV.
- Unduh laporan PDF lewat dialog cetak; daftar dokumen per masalah dengan unduh CSV.
- Skrip `periksa-data` dan `snapshot` untuk operasi bulanan; templat CSV di `templat-data/`.
- Kaki halaman dengan versi dan tautan masukan (`TAUTAN_MASUKAN`).
- CI/CD GitHub Actions: uji tipe, uji indikator, pemeriksaan data, uji penerimaan, pemasangan GitHub Pages.
- Dokumentasi: spesifikasi 1.0 (disetujui), panduan belajar, data, pemasangan, pengguna, uji coba pengguna.
