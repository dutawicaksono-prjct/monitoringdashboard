# Panduan Data

Dasbor membaca lima berkas CSV dari folder `data/`. Versi ini memakai **data contoh (dummy)** yang dibangkitkan
`tools/generate_sample_data.py`: semua nama dokumen, ID, dan pengguna adalah rekaan. Skema lengkap ada di
`docs/spesifikasi.md` bagian 3; templat kosong (baris judul saja) ada di folder `templat-data/`.

## 1. Kamus data ringkas

| Berkas | Satu baris = | Kunci | Wajib |
| --- | --- | --- | --- |
| `dokumen.csv` | satu dokumen | `dokumen_id` | Ya |
| `riwayat_status.csv` | satu perubahan status dokumen entri | `dokumen_id` + `tgl_perubahan` | Ya |
| `unit_kerja.csv` | satu UKE II beserta UKE I induknya | `uke2` | Ya |
| `hari_libur.csv` | satu hari libur nasional / cuti bersama | `tanggal` | Ya |
| `snapshot_bulanan.csv` | angka total pada akhir satu bulan | `tanggal_snapshot` | Tidak |
| `meta_data.csv` | tanggal data (cut-off) | `tanggal_data` | Tidak |
| `tag_dokumen.csv` | satu tag pada satu dokumen, ditulis apa adanya | `dokumen_id` + `tag` | Tidak |
| `kamus_tag.csv` | satu bentuk tag dan bentuk bakunya (tesaurus) | `tag_varian` | Tidak |

Aturan format:

- **Penyandian** UTF-8, pemisah koma, baris pertama nama kolom. Teks yang mengandung koma diapit tanda kutip.
- **Cap waktu** ISO 8601 dengan zona waktu, misalnya `2026-09-10T09:59:18+07:00`. Kolom tanggal saja
  ditulis `YYYY-MM-DD`.
- **Angka desimal** memakai titik (`63.7`), bukan koma, karena ini format berkas, bukan tampilan.
- **Nilai kosong** dibiarkan kosong (bukan `-` atau `NULL`).
- **Nama UKE** di `dokumen.csv` harus persis sama dengan `unit_kerja.csv` (huruf besar/kecil dan tanda baca).
- **Kolom tambahan** boleh ada dan akan diabaikan; kolom wajib yang hilang membuat dasbor menolak data dengan
  pesan yang menyebut nama kolomnya.

## 2. Data contoh yang dipakai

| Ukuran | Nilai |
| --- | --- |
| Tanggal data (cut-off) | 8 Oktober 2026 |
| Dokumen | 5.063 (entri 2.776, Menu Program 2.287) |
| Riwayat status | 11.233 baris |
| Unit kerja | 12 UKE I, 71 UKE II |
| Hari libur | 22 tanggal tahun 2026 (**parsial**: Isra Mi'raj, 1 Muharam, Maulid Nabi belum ada) |
| Snapshot | 31 Jul, 31 Agu, 30 Sep, 8 Okt 2026 |

Nilai acuan semua indikator atas data ini ada di `data/expected_indicators.json`.

Membangkitkan ulang data contoh (butuh Python dan `pandas`):

```bash
python tools/generate_sample_data.py && python tools/generate_sample_tags.py && python tools/compute_indicators.py
```

### Tag dan kamus tag

Data contoh tag (10.856 pemakaian pada 4.771 dokumen) dan `kamus_tag.csv` (25 konsep) adalah **rekaan sementara**,
sampai ekspor tag dari KOMENS dan tesaurus Tim PIP tersedia. Cara mengisi kamus:

| tag_varian | tag_baku | jenis | Artinya |
| --- | --- | --- | --- |
| kemiskinan | kemiskinan | baku | bentuk baku konsep "kemiskinan" (wajib satu baris per konsep) |
| poverty | kemiskinan | bahasa | padanan bahasa Inggris, dihitung konsisten |
| miskin | kemiskinan | bentuk | bentuk lain, dihitung **tidak baku** |
| PRK | pembangunan rendah karbon | singkatan | dihitung tidak baku; jenis lain: `ejaan`, `sinonim` |

Huruf besar/kecil, tanda hubung, dan spasi ganda diabaikan, jadi `Kemiskinan` dan `kemiskinan` cukup ditulis
sekali. Tabel *Kandidat padanan* di Kualitas Aset dapat diunduh sebagai baris kamus, ditinjau, lalu ditempel ke
`kamus_tag.csv`. Kamus dapat diganti tanpa build ulang.

## 3. Prosedur pembaruan data bulanan

Lakukan setiap awal bulan, atau sesering yang dibutuhkan.

1. **Ekspor** `dokumen.csv` dan `riwayat_status.csv` dari KOMENS sesuai templat, serta `tag_dokumen.csv` bila
   ekspor tag sudah tersedia.
2. **Perbarui** `unit_kerja.csv` bila ada perubahan nomenklatur, dan `hari_libur.csv` bila tahun berganti
   atau ada SKB baru.
3. **Setel tanggal data** di `data/meta_data.csv` (kolom `tanggal_data`, format `YYYY-MM-DD`) ke tanggal ekspor.
   Tidak perlu build ulang. Bila berkas ini tidak ada, dipakai `TANGGAL_DATA` di `src/config.ts`.
4. **Periksa data**: `npm run periksa-data`. Perbaiki semua butir `[GAGAL]`; baca juga bagian *Peringatan*.
5. **Rekam snapshot akhir bulan lalu**: `npm run snapshot` (otomatis memakai akhir bulan sebelum
   tanggal data). Untuk tanggal tertentu: `npm run snapshot -- 2026-10-31`.
6. **Uji dan pasang**: commit lalu push; GitHub Actions menguji dan memasang otomatis. Untuk server
   Pusdatinrenbang, ikuti `docs/panduan-pemasangan.md`.

> `expected_indicators.json` hanya berlaku untuk data contoh. Setelah data nyata dipakai, uji
> `tests/indicators.test.ts` bagian "vs expected_indicators.json" akan gagal. Itu wajar: pertahankan data
> contoh di repositori untuk pengujian, dan simpan data nyata hanya di server (lihat bagian 4).

## 4. Keamanan data

- **Jangan simpan data nyata di repositori publik atau GitHub Pages.** GitHub Pages bersifat publik.
  Gunakan hanya untuk demonstrasi dengan data contoh.
- Data nyata cukup ditaruh di server internal (`/var/www/komens-dasbor/data/`); aplikasi tidak perlu dibangun
  ulang untuk mengganti data.
- Kolom `pic_uke` dan `diubah_oleh` berisi identitas pengguna. Bila dasbor dibuka untuk umum internal, gunakan
  nama akun, bukan NIP atau surel.

## 5. Daftar periksa sebelum memasang data baru

- [ ] `npm run periksa-data` menghasilkan "semua pemeriksaan terpenuhi"
- [ ] Tidak ada peringatan tahun hari libur yang hilang
- [ ] Snapshot akhir bulan lalu tersedia
- [ ] `tanggal_data` di `meta_data.csv` sama dengan tanggal ekspor
- [ ] `DATA_CONTOH` = `false` bila data nyata
- [ ] Angka total di dasbor sama dengan jumlah dokumen di KOMENS pada tanggal yang sama (cek manual)
