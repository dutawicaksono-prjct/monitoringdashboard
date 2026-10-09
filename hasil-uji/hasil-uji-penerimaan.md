| No | Kriteria | Hasil | Catatan |
| --- | --- | --- | --- |
| K-02 | Pemeriksaan 8.2 lolos; data rusak memicu peringatan | LULUS | Data contoh: 8 dari 8 terpenuhi. Data rusak → peringatan: "Tidak terpenuhi: Total aset = terpublikasi + dalam proses (entri) + tidak tayang. / Tidak terpenuhi: ID dokumen unik." |
| K-03 | Persamaan kontrol ditampilkan dan terpenuhi | LULUS | Persamaan kontrol terpenuhi: total 5.063 = terpublikasi 2.687 + dalam proses 1.202 + tidak tayang 1.174. |
| K-04 | Tidak ada tanggal libur di kode sumber | LULUS | 22 tanggal libur dicari di 17 berkas src/: tidak ada. Aturan (a, b] diuji di tests/indicators.test.ts. |
| K-05 | Status ketepatan waktu selalu bertuliskan teks | LULUS | 88 chip, semuanya berteks: Melewati batas 76, Mendekati batas 8, Selesai 1, Dalam batas 3 |
| K-06 | Angka Ringkasan Pimpinan sesuai acuan | LULUS | Total 5.063; terpublikasi 2.687 (53,1%), kurang 2.123; dalam proses 1.202; tertahan 790; skor 70,3/100. |
| K-07 | Tabel UKE I/UKE II dapat dibuka, terurut, dan sesuai acuan | LULUS | 12 UKE I sesuai acuan, terurut menurun; Buka semua → 71 UKE II; Tutup semua → 0; aria-expanded berubah. |
| K-08 | Filter UKE I/UKE II mengubah angka secara konsisten | LULUS | Inspektorat Utama: total 53 (acuan 53), 3 UKE II. Biro Hukum: total 55, UKE I terisi otomatis. |
| K-09 | Sumber Menu Program menyembunyikan blok entri | LULUS | Total 2.287; capaian UKE I, tren, KPI dalam proses/tertahan disembunyikan; filter UKE nonaktif; tab alur: "Kontrol alur kerja tidak berlaku untuk Menu Program". |
| K-10 | Filter Periode | LULUS | 2023: 306; 2024: 1.601; 2025: 1.629; 2026: 1.527 → jumlah 5.063. Tren ikut tahun terpilih. |
| K-11 | Perubahan dibanding akhir bulan lalu | LULUS | "+40 dibanding akhir bulan lalu"; dengan filter: "Dibanding akhir bulan lalu: —"; tanpa snapshot: "Dibanding akhir bulan lalu: —". |
| K-12 | Format angka id-ID | LULUS | Ribuan bertitik (5.063), desimal berkoma (53,1%, 10,9); tidak ada pola 5,063 / 53.1% / 5063. |
| K-13 | Nama unit, tanpa kode unit | LULUS | 83 baris unit menampilkan nama sesuai unit_kerja.csv; tidak ada kode unit. |
| K-14 | Responsif 390–1360 px tanpa gulir horizontal halaman | LULUS | 12 kombinasi lebar×tampilan tanpa elemen keluar layar; tabel UKE bergulir di kotaknya pada 390/768 px. Tangkapan layar di hasil-uji/. |
| K-15 | Aksesibilitas (teks status, kontras, target sentuh, papan ketik) | LULUS | Kontras teks terendah 4.52:1 (≥ 4,5); 38 tombol ≥ 44 px; tab dapat dipindah dengan Tab+Enter, aria-current mengikuti. |
| K-16 | Unduh laporan → PDF tampilan aktif | LULUS | Tombol memanggil dialog cetak; filter/tombol disembunyikan saat cetak. PDF: ringkasan: 140 KB; keterangan cetak "Tampilan: Ringkasan Pimpinan · Filter: Seluruh periode · Semua UKE I · Semua UKE II · Entri + Menu Program"; alur: 142 KB; kualitas: 84 KB (hasil-uji/laporan-*.pdf). |
| K-17 | Penanda data contoh | LULUS | Header: "Data contoh · ilustrasi" |
| K-18 | Statis tanpa backend; data dapat diganti tanpa build ulang | LULUS | dist/ berisi index.html, aset, dan data/*.csv; disajikan server statis. Mengganti hari_libur.csv saat runtime (1–8 Okt dijadikan libur uji) mengubah tertahan dari 790 menjadi 353 tanpa build ulang. |
| K-19 | Parameter berupa konstanta | LULUS | src/config.ts: AMBANG_KELENGKAPAN = 60, BATAS_TERTAHAN_HK = 5, TARGET_PUBLIKASI_PERSEN = 95, dll. |
| K-20 | Ikon sesuai 5.6: lengkap, tanpa warna baru, dekoratif | LULUS | ringkasan: 22 ikon (.kpi 5, .kartu-wawasan 3); alur: 108 ikon (.baris-tahap .nomor 5, .aksi 3, .chip 88); kualitas: 15 ikon (.kartu-masalah 5). Semua aria-hidden; warna ikon hanya token 5.6/5.7. |
| K-21 | Warna angka utama berbeda dan kontras cukup | LULUS | Total aset pengetahuan rgb(11, 42, 60) (14.9:1); Terpublikasi rgb(46, 125, 79) (5.0:1); Dalam proses rgb(14, 90, 126) (7.5:1); Tertahan lebih dari 5 hari kerja rgb(194, 86, 28) (4.5:1); Skor kualitas metadata rgb(107, 79, 187) (6.1:1) |
