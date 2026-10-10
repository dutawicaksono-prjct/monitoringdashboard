# Catatan Perubahan

Format mengikuti [Keep a Changelog](https://keepachangelog.com/id-ID/1.1.0/); penomoran versi mengikuti
[Semantic Versioning](https://semver.org/lang/id/): MAYOR untuk perubahan rumus/definisi indikator, MINOR untuk
tampilan atau fitur baru, PATCH untuk perbaikan.

## [1.3.0] - 2026-10-10

### Ditambahkan
- Ringkasan Pimpinan: kartu *Jalan menuju target 95%* yang memisahkan kekurangan yang dapat ditutup lewat alur kerja
  dari yang perlu keputusan (dokumen tidak tayang, terutama Menu Program UnPublish).
- Ringkasan Pimpinan: *Tren capaian terhadap target* dari snapshot akhir bulan, dengan laju per bulan dan proyeksi.
- Grafik bulanan menampilkan dokumen baru (masuk) berdampingan dengan dokumen yang dipublikasikan (keluar).
- Capaian per UKE I menampilkan kekurangan dokumen menuju 95% dan UKE I dengan kekurangan terbanyak.
- Kontrol Alur Kerja: *Beban per PIC UKE*, termasuk dokumen di tahap PIC UKE tanpa PIC.
- Tabel UKE I/UKE II: kolom tertahan lebih dari 20 hari kerja.
- Kualitas Aset: tabel *Masalah kualitas per UKE I* yang dapat diklik ke daftar dokumen.
- Filter dan tab tersimpan di URL; tombol *Salin tautan tampilan ini*.
- `data/meta_data.csv` untuk tanggal data, sehingga pembaruan data bulanan tidak perlu build ulang. Peringatan bila
  data nyata lebih lama dari 35 hari.
- Modul `src/indicators/keputusan.ts` beserta uji; spesifikasi 1.3 (bagian 4.8, K-22 sampai K-24).

### Diubah
- Dimensi kualitas 6 berlabel *Kemutakhiran isi (ketepatan waktu)*.

## [1.2.0] - 2026-10-09

### Ditambahkan
- Warna bermakna untuk lima angka utama: total (navy), terpublikasi (hijau), dalam proses (biru),
  tertahan (oranye), skor kualitas (ungu) pada angka, kotak ikon, dan garis aksen kartu (spesifikasi 5.7).
- Nada warna yang sama pada aksi cepat dan kartu masalah kualitas.
- Kriteria penerimaan K-21.

## [1.1.0] - 2026-10-09

### Ditambahkan
- Ikon pada indikator utama, kartu perlu perhatian, tahap alur kerja, label status, aksi cepat, kartu masalah
  kualitas, judul bagian, tab, dan header (spesifikasi 5.6). Pustaka lucide-react, disimpan lokal.
- Kriteria penerimaan K-20 (ikon).

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
