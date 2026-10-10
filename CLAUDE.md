# Dasbor Monitoring Aset Pengetahuan KOMENS: panduan implementasi

Dokumen ini memandu implementasi versi HTML dasbor monitoring KOMENS (Pusdatinrenbang, Tim Pengelolaan Informasi dan Pengetahuan, Bappenas). Pemilik kebutuhan adalah perencana pada Tim PIP; implementasi teknis dapat dikerjakan tim lain. Bahasa antarmuka: Indonesia formal.

## 1. Sumber kebenaran (urutan prioritas)

1. `docs/spesifikasi.md`: Spesifikasi Fungsional (ekspor dari dokumen yang telah direvisi pemilik kebutuhan). Jika berkas ini masih berisi catatan PLACEHOLDER, hentikan dan minta pemilik kebutuhan menempatkan spesifikasi yang sebenarnya. Bila ada hal yang ambigu, tanyakan; jangan menebak.
2. Bagian 3 panduan ini: keputusan yang sudah ditetapkan.
3. `data/expected_indicators.json`: hasil acuan semua indikator atas data contoh.
4. `reference/mockup_v2.dc.html`: acuan tampilan (markup dan gaya inline). Berkas ini memakai format komponen khusus (`<x-dc>`, `<sc-for>`, `<sc-if>`) dan tidak dapat dibuka langsung di peramban. Salin struktur, jarak, warna, dan teksnya, bukan formatnya. Mockup interaktif: https://claude.ai/artifact/V8LSGcGuyjg9JmPeeypQPf

Angka pada mockup hanya contoh. Angka yang benar adalah hasil hitungan dari data, dan diuji terhadap `expected_indicators.json`.

## 2. Isi paket

| Berkas | Fungsi |
| --- | --- |
| `data/dokumen.csv` | 5.063 dokumen contoh: 2.776 entri dan 2.287 Menu Program (skema bagian 3.1 spesifikasi) |
| `data/riwayat_status.csv` | Riwayat perubahan status dokumen entri (bagian 3.2) |
| `data/hari_libur.csv` | Kalender libur 2026, **parsial**, dasar penghitungan hari kerja |
| `data/unit_kerja.csv` | Referensi 12 UKE I dan 71 UKE II (tanpa kode unit) |
| `data/snapshot_bulanan.csv` | Snapshot akhir bulan untuk "perubahan dibanding bulan lalu" |
| `data/expected_indicators.json` | Nilai acuan seluruh indikator, dipakai sebagai fixture uji |
| `data/tag_dokumen.csv`, `data/kamus_tag.csv` | Tag per dokumen dan kamus padanan tag (contoh, sementara; spesifikasi 1.4) |
| `tools/generate_sample_data.py` | Membangkitkan ulang `dokumen.csv` dan `riwayat_status.csv` (deterministik) |
| `tools/generate_sample_tags.py` | Membangkitkan ulang `tag_dokumen.csv` dan `kamus_tag.csv` (deterministik) |
| `tools/compute_indicators.py` | Implementasi acuan rumus (Python) dan pemeriksaan data bagian 8.2 |

Tanggal data contoh (cut-off): **2026-10-08**. Semua nama dokumen, ID, dan pengguna adalah rekaan.

Membangkitkan ulang: `python tools/generate_sample_data.py && python tools/generate_sample_tags.py && python tools/compute_indicators.py` (butuh `pandas`).

## 3. Keputusan yang sudah ditetapkan

- **Nomenklatur**: tampilkan nama UKE I dan UKE II. Jangan tampilkan kode unit di antarmuka.
- **Dokumen Menu Program**: tidak memiliki UKE I/UKE II dan tidak memiliki alur proses; hanya berstatus `PUBLISH` atau `UNPUBLISH`. Tidak masuk perhitungan alur kerja, UKE I, maupun UKE II.
- **Dokumen entri** (manual atau interoperabilitas tanpa kategori program) membawa `uke1`/`uke2` dan alur proses penuh.
- **Batas tertahan**: maksimal **5 hari kerja** per tahap (Senin–Jumat dikurangi `hari_libur`).
- **Fungsi HK(a, b)** = hari kerja pada rentang (a, b]: tanggal a tidak dihitung, tanggal b dihitung. Dokumen yang status terakhirnya berubah hari ini berumur 0. Ini keputusan implementasi karena spesifikasi belum menyebut inklusif atau eksklusif; konfirmasikan ke pemilik kebutuhan.
- **Status ketepatan waktu** berdasar rata-rata tertahan (hari kerja): kurang dari 4 = Dalam batas; 4 sampai 5 = Mendekati batas (dipertahankan); lebih dari 5 = Melewati batas; tanpa dokumen dalam proses = Tidak ada antrean.
- **Target publikasi**: 95% dari total aset, berlaku untuk total gabungan dan sebagai pembanding setiap UKE I.
- **Kekurangan menuju target** = MAX(0, CEILING(0,95 × total) − terpublikasi). Pada data contoh = 2.123 (95% dari 5.063 adalah 4.809,85, dibulatkan ke atas 4.810).
- **UnPublish** tetap dihitung dalam total aset (penyebut persentase publish).
- **Persamaan kontrol**: total = terpublikasi + dalam proses (entri) + tidak tayang. Tampilkan peringatan bila tidak terpenuhi.
- **Kalender libur**: mengikuti kalender nasional (SKB 3 Menteri). `hari_libur.csv` pada paket ini parsial (dari pemberitaan SKB Nomor 1497/2/5 Tahun 2025) dan belum memuat antara lain Isra Mi'raj, 1 Muharam, dan Maulid Nabi. Ganti dengan data resmi sebelum dipakai nyata; jangan hard-code tanggal libur di kode.
- **Perubahan dibanding bulan lalu**: dihitung dari `snapshot_bulanan.csv` (snapshot akhir bulan). Bila snapshot tidak ada, tampilkan "—", bukan 0.
- **Unduh laporan**: format PDF, berisi tampilan yang sedang aktif.
- **Status Mendekati batas**, warna, dan aksesibilitas: lihat bagian 5 spesifikasi.

## 4. Masih terbuka (jangan diputuskan sendiri)

- Ambang kelengkapan untuk "metadata wajib belum lengkap": data contoh memakai `skor_dimensi_1` di bawah 60. Jadikan konstanta yang mudah diubah.
- Pembagian hak akses tiap tampilan menurut peran (pimpinan, PIC UKE, Operator): belum ditetapkan; semua tampilan terbuka untuk semua pengguna sementara.
- Atribusi UKE I/UKE II untuk Menu Program: belum ada.

## 5. Rekomendasi teknis

Spesifikasi tidak mengunci teknologi. Usulan awal, konfirmasikan dulu ke pemilik kebutuhan:

- Aplikasi statis, tanpa backend: Vite + React + TypeScript, CSS biasa dengan variabel tema. Hindari pustaka grafik berat; bar, penanda target, dan diagram batang pada mockup cukup dibuat dengan elemen HTML.
- Pembacaan CSV di peramban (misalnya `papaparse`); semua perhitungan indikator dalam satu modul murni (`src/indicators/`) tanpa ketergantungan UI agar mudah diuji.
- Satu variabel tema untuk warna utama (mockup: `#0E5A7E`); token warna lain mengikuti mockup: oranye perhatian `#C2561C`, biru muda `#9EC4D9`, latar `#F2F4F6`, header `#0B2A3C`. Font: Plus Jakarta Sans.
- Format angka `id-ID`: titik ribuan, koma desimal (`53,1%`, `5.063`).
- Responsif dari 390 px hingga 1360 px; tabel lebar bergulir di dalam kotaknya sendiri.

## 6. Urutan kerja yang disarankan

1. Inisialisasi proyek; letakkan `docs/spesifikasi.md` dan folder `data/` apa adanya.
2. Tulis modul indikator (bagian 4 spesifikasi) dan uji terhadap `data/expected_indicators.json`. Semua nilai harus identik, termasuk `pemeriksaan_data`.
3. Bangun kerangka halaman: header, tab, filter, definisi indikator.
4. Bangun tampilan Ringkasan Pimpinan, lalu Kontrol Alur Kerja (termasuk tabel UKE I/UKE II yang dapat dibuka), lalu Kualitas Aset.
5. Hubungkan filter Periode, UKE I, UKE II, dan Sumber data ke seluruh angka. Aturan: sumber Menu Program menyembunyikan blok yang bergantung pada entri.
6. Unduh laporan (PDF), pemeriksaan data 8.2 dengan peringatan, dan penanda data contoh.
7. Jalankan kriteria penerimaan bagian 9 spesifikasi satu per satu dan laporkan hasilnya.

## 7. Catatan data contoh

- Jumlah per status, per UKE II, tertahan lebih dari 5 hari kerja (790 dokumen; 590 di PIC UKE), dokumen baru per bulan 2026, dan jumlah per Menu Program dibangkitkan **tepat** sesuai mockup.
- Rata-rata tertahan (misalnya PIC UKE 10,9 hari kerja), skor kualitas rata-rata (70,3), dan sebaran skor hanya mendekati angka mockup (rata-rata tertahan PIC UKE 12; skor 72). Itu wajar: mockup memakai angka ilustrasi.
- Jumlah masalah kualitas tepat: 412 metadata belum lengkap, 96 tanpa PIC, 538 belum diperbarui lebih dari 12 bulan, 74 kandidat duplikat (37 pasang), 38 file tidak terbaca.
- Dokumen entri berstatus Draft umumnya dikembalikan untuk revisi (riwayat memuat tahap ditolak lalu kembali ke Draft); hanya sebagian Draft baru.
- Snapshot bulanan direkonstruksi dari riwayat; dokumen Menu Program yang belum berstatus publish pada tanggal snapshot dihitung sebagai tidak tayang.
- Kolom `tgl_publish` kosong untuk dokumen Menu Program berstatus UnPublish (anggapan data contoh).

## 8. Aturan kerja

- Jangan menambah indikator, kolom, atau warna di luar spesifikasi tanpa persetujuan pemilik kebutuhan.
- Setiap status dan peringatan selalu disertai teks; warna tidak boleh menjadi satu-satunya pembeda.
- Jangan menjalankan perintah yang mengubah data di luar folder proyek.
- Laporkan setiap penyimpangan dari spesifikasi sebagai daftar singkat di akhir pekerjaan.
