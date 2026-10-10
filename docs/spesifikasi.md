# Spesifikasi Fungsional Dasbor Monitoring Aset Pengetahuan KOMENS

> **Status: DISETUJUI, versi 1.3 (10 Oktober 2026).**
> Disusun pengembang dari `CLAUDE.md`, implementasi acuan `tools/compute_indicators.py`, data contoh, dan mockup
> `reference/mockup_v2.dc.html`, lalu ditinjau dan disetujui pemilik kebutuhan (Tim PIP, Pusdatinrenbang).
> Butir bertanda **[usulan]** adalah keputusan rancangan yang telah disetujui pada versi ini. Butir **masih
> terbuka** (ambang kelengkapan, hak akses per peran, atribusi UKE Menu Program) tetap seperti tertulis.
> Penomoran bagian mengikuti rujukan pada `CLAUDE.md` (3.1, 3.2, 4, 5, 8.2, 9).
>
> Riwayat: 1.0 (8 Okt 2026), disetujui tanpa perubahan dari rancangan. 1.1 (9 Okt 2026), penambahan ikon
> (bagian 5.6) atas permintaan pemilik kebutuhan. 1.2 (9 Okt 2026), warna angka utama (bagian 5.7) atas
> permintaan pemilik kebutuhan. 1.3 (10 Okt 2026), indikator pendukung keputusan (bagian 4.8), tautan berfilter
> (5.3), tanggal data dari `meta_data.csv` (3.3), dan penamaan ulang dimensi 6, atas persetujuan pemilik kebutuhan
> terhadap rekomendasi peningkatan dasbor.

## 1. Tujuan dan pengguna

Dasbor memantau aset pengetahuan pada aplikasi KOMENS: seberapa banyak yang sudah dipublikasikan dibanding
target, di mana dokumen tertahan dalam alur kerja, dan seberapa baik kualitas metadatanya.

| Pengguna | Kebutuhan utama | Tampilan |
| --- | --- | --- |
| Pimpinan (Kapusdatin, Ketua Tim PIP) | Capaian terhadap target, hal yang perlu perhatian | Ringkasan Pimpinan |
| PIC UKE dan Operator Konten | Dokumen tertahan, ketepatan waktu per unit | Kontrol Alur Kerja |
| Pengelola pengetahuan / kurator | Masalah kualitas yang perlu dibersihkan | Kualitas Aset |

Pembagian hak akses per peran **masih terbuka**. Untuk sementara semua tampilan terbuka bagi semua pengguna.

## 2. Ruang lingkup

- Aplikasi web statis tanpa backend. Data dibaca dari berkas CSV (bagian 3) saat halaman dimuat.
- Tiga tampilan (tab), empat filter, unduh laporan PDF, pemeriksaan data, dan definisi indikator.
- Di luar lingkup versi ini: autentikasi, pengiriman pengingat otomatis ke PIC, penyuntingan data.

## 3. Sumber data

Semua berkas berada di folder `data/`, berformat CSV UTF-8 dengan baris judul. Cap waktu memakai ISO 8601
dengan zona waktu (contoh: `2026-09-10T09:59:18+07:00`). Seluruh perhitungan tanggal memakai WIB (UTC+7).

### 3.1 `dokumen.csv`: satu baris per dokumen

| Kolom | Isi |
| --- | --- |
| `dokumen_id` | ID unik |
| `judul` | Judul dokumen |
| `sumber` | `ENTRI` (manual atau interoperabilitas tanpa kategori program) atau `MENU_PROGRAM` |
| `menu_program` | Kategori program (hanya Menu Program) |
| `uke1`, `uke2` | Nama UKE I dan UKE II (hanya entri) |
| `pic_uke` | Pengguna PIC UKE (hanya entri; boleh kosong) |
| `status_saat_ini` | Entri: `DRAFT`, `OPERATOR_KONTEN`, `PIC_UKE`, `TERVALIDASI`, `PUBLISH`, `DITOLAK_OPERATOR`, `DITOLAK_PIC`, `UNPUBLISH`. Menu Program: `PUBLISH`, `UNPUBLISH` |
| `tgl_dibuat`, `tgl_status_terakhir`, `tgl_publish` | Cap waktu |
| `skor_metadata` | Skor kualitas metadata 0–100 (rata-rata tujuh dimensi) |
| `skor_dimensi_1` … `skor_dimensi_7` | Kelengkapan, Akurasi, Asal-usul (provenance), Kesesuaian standar, Konsistensi logis, Kemutakhiran isi (ketepatan waktu), Aksesibilitas. **[1.3]** Dimensi 6 diberi label *Kemutakhiran isi (ketepatan waktu)* agar tidak tertukar dengan ketepatan waktu alur kerja (4.3) |
| `tgl_pembaruan_terakhir` | Tanggal pembaruan isi terakhir |
| `hash_konten` | Sidik konten (dasar deteksi duplikat) |
| `ocr_berhasil` | `true`/`false` |

### 3.2 `riwayat_status.csv`: satu baris per perubahan status dokumen entri

`dokumen_id, status_dari, status_ke, tgl_perubahan, diubah_oleh`. Baris pertama setiap dokumen memiliki
`status_dari` kosong.

### 3.3 Berkas referensi

- `unit_kerja.csv` (`uke1, uke2`): 12 UKE I dan 71 UKE II, tanpa kode unit.
- `hari_libur.csv` (`tanggal, keterangan, jenis`): libur nasional dan cuti bersama (SKB 3 Menteri).
  Satu-satunya sumber hari libur; tidak ada tanggal libur di kode.
- `snapshot_bulanan.csv`: angka total pada akhir setiap bulan (bagian 4.6). Opsional.
- `meta_data.csv` (`tanggal_data`): tanggal data (cut-off) dalam format `YYYY-MM-DD`. Opsional; bila tidak ada atau
  tidak valid, dipakai `TANGGAL_DATA` di `src/config.ts`. Dengan berkas ini, pembaruan data bulanan tidak memerlukan
  build ulang. **[1.3]**

## 4. Indikator dan rumus

Notasi: *E* = dokumen entri, *P* = dokumen Menu Program, *T* = tanggal data (cut-off).

### 4.1 Pengelompokan status

| Kelompok | Entri | Menu Program |
| --- | --- | --- |
| Terpublikasi | `PUBLISH` | `PUBLISH` |
| Dalam proses | `DRAFT`, `OPERATOR_KONTEN`, `PIC_UKE`, `TERVALIDASI` | (tidak ada alur proses) |
| Tidak tayang | `DITOLAK_OPERATOR`, `DITOLAK_PIC`, `UNPUBLISH` | `UNPUBLISH` |

**[usulan]** Dokumen ditolak dihitung *tidak tayang* (bukan *dalam proses*) sampai pengusul merevisinya dan
statusnya kembali ke Draft.

### 4.2 Ringkasan

- **Total aset** = |E| + |P|. Dokumen UnPublish tetap dihitung.
- **Terpublikasi (gabungan)** = publish entri + publish Menu Program.
- **Persen publish** = terpublikasi ÷ total × 100, satu desimal.
- **Target publikasi** = 95% dari total aset; juga menjadi pembanding setiap UKE I.
- **Kekurangan menuju target** = MAX(0, CEILING(0,95 × total) − terpublikasi).
- **Persamaan kontrol**: total = terpublikasi + dalam proses (entri) + tidak tayang. Bila tidak terpenuhi,
  tampilkan peringatan.

### 4.3 Alur kerja dan ketepatan waktu (entri)

- **HK(a, b)** = jumlah hari kerja pada rentang (a, b]: tanggal a tidak dihitung, tanggal b dihitung.
  Hari kerja adalah Senin–Jumat yang tidak tercantum di `hari_libur.csv`. Dokumen yang statusnya berubah
  hari ini berumur 0. **[usulan]**
- **Lama tertahan** dokumen dalam proses = HK(tanggal WIB `tgl_status_terakhir`, T).
- **Tertahan lebih dari 5 hari kerja**: lama tertahan > 5.
- Per tahap: jumlah, jumlah > 5 HK, persen melewati (satu desimal), rata-rata lama tertahan (satu desimal).
- Per UKE I dan UKE II: total, publish, persen publish, dalam proses, > 5 HK, rata-rata tertahan.
- **Status ketepatan waktu** dari rata-rata tertahan yang sudah dibulatkan satu desimal:
  kurang dari 4 = *Dalam batas*; 4 sampai 5 = *Mendekati batas*; lebih dari 5 = *Melewati batas*;
  tanpa dokumen dalam proses = *Tidak ada antrean*.
- **Aksi cepat**: tertahan > 5 HK di tahap dengan jumlah tertahan terbanyak; ditolak dan belum direvisi
  (`DITOLAK_OPERATOR` + `DITOLAK_PIC`); tervalidasi dan belum dipublikasikan > 5 HK.

### 4.4 Kualitas aset (seluruh dokumen pada filter aktif)

- **Skor rata-rata** dan **skor per dimensi**: rata-rata aritmetika, satu desimal.
- **Sebaran skor**: di bawah 50; 50–69; 70–84; 85 ke atas (batas bawah inklusif).
- **Dimensi prioritas perbaikan** **[usulan]**: rata-rata dimensi di bawah 65.
- **Masalah kualitas**:
  - *Metadata wajib belum lengkap*: `skor_dimensi_1` < ambang kelengkapan. Ambang **masih terbuka**;
    sementara 60 (konstanta `AMBANG_KELENGKAPAN`).
  - *Tanpa PIC / pemilik*: dokumen entri dengan `pic_uke` kosong.
  - *Belum diperbarui lebih dari 12 bulan*: `tgl_pembaruan_terakhir` sebelum T dikurangi 12 bulan.
  - *Kandidat duplikat*: `hash_konten` muncul lebih dari sekali di seluruh KOMENS. Setiap anggota pasangan
    dihitung.
  - *File tidak terbaca (OCR gagal)*: `ocr_berhasil` = false.

### 4.5 Tren dan Menu Program

- **Dokumen baru per bulan**: dokumen entri menurut bulan `tgl_dibuat` (WIB), Januari sampai bulan T
  untuk tahun berjalan, atau Januari–Desember untuk tahun lampau. Bulan T ditandai *parsial*.
  Bulan tanpa dokumen ditampilkan 0.
- **Rata-rata bulanan**: rata-rata bulan lengkap (sebelum bulan T), satu desimal.
- **[usulan] Lonjakan**: bulan lengkap dengan jumlah ≥ 1,5 × rata-rata disebut dalam catatan analis.
- **Dokumen per Menu Program**: diurutkan dari terbanyak. Enam teratas ditampilkan, sisanya digabung
  sebagai "N menu lainnya". Bila satu menu menyumbang ≥ 50%, tersedia tombol untuk menyembunyikannya agar
  skala menu lain terbaca.

### 4.6 Perubahan dibanding akhir bulan lalu

- Pembanding = baris `snapshot_bulanan.csv` dengan `tanggal_snapshot` = hari terakhir bulan sebelum T.
- Perubahan = nilai saat ini − nilai snapshot, untuk total aset, terpublikasi, dalam proses, tidak tayang,
  dan tertahan > 5 HK.
- Bila snapshot tidak ada, tampilkan "—", bukan 0.
- **[usulan]** Snapshot hanya memuat angka total. Karena itu perubahan ditampilkan "—" bila ada filter aktif.
  Skor kualitas belum memiliki snapshot, jadi perubahannya selalu "—".
- Snapshot dapat direkonstruksi dari riwayat status (fungsi `rekonstruksiSnapshot`). Dokumen Menu Program
  yang belum publish pada tanggal snapshot dihitung tidak tayang.

### 4.8 Indikator pendukung keputusan **[1.3]**

Indikator ini tidak mengubah rumus 4.1–4.7 dan tidak masuk `expected_indicators.json`; diuji di
`tests/indicators.test.ts` (fungsi murni di `src/indicators/keputusan.ts`).

- **Jalan menuju target**: kekurangan menuju target dipecah menjadi (a) *dapat ditutup lewat alur kerja* =
  MIN(dalam proses entri, kekurangan) dan (b) *perlu keputusan* = kekurangan − (a), yang hanya dapat datang dari
  dokumen tidak tayang. *Capaian maksimal lewat alur* = (terpublikasi + dalam proses) ÷ total. Rincian tidak tayang:
  entri ditolak, entri UnPublish, Menu Program UnPublish, dan Menu Program dengan UnPublish terbanyak.
  Pada data contoh: 2.123 = 1.202 lewat alur + 921 perlu keputusan; capaian maksimal lewat alur 76,8%; JDIH 962.
- **Tren capaian dan proyeksi**: persen publish dan kekurangan pada setiap snapshot akhir bulan (bagian 4.6) ditambah
  posisi tanggal data. *Laju per bulan* = (nilai snapshot terakhir − nilai snapshot pertama) ÷ jumlah selang, memakai
  paling banyak 4 snapshot akhir bulan terakhir (3 selang). Bila laju kekurangan negatif, *perkiraan tercapai* =
  bulan tanggal data + CEILING(kekurangan ÷ |laju|) bulan; bila tidak negatif, ditulis bahwa target tidak tercapai bila
  laju berlanjut. Hanya untuk seluruh periode tanpa filter (snapshot hanya berisi angka total).
- **Arus masuk dan keluar**: pada grafik bulanan, di samping dokumen entri baru (4.5) ditampilkan dokumen entri
  berstatus Publish menurut bulan `tgl_publish` (WIB). Catatan analis menyebut selisih masuk − keluar pada bulan lengkap.
- **Kekurangan per UKE I**: MAX(0, CEILING(0,95 × total UKE I) − publish UKE I), ditampilkan di capaian per UKE I;
  catatan analis menyebut UKE I dengan kekurangan terbanyak.
- **Sebaran umur tertahan**: dokumen dalam proses dikelompokkan ≤ 5, 6–10, 11–20, > 20 hari kerja. Tabel UKE I/UKE II
  menambah kolom *Di antaranya lebih dari 20 hari kerja*.
- **Beban per PIC UKE**: dokumen berstatus `PIC_UKE` per `pic_uke`: jumlah, > 5 HK, terlama; diurutkan dari > 5 HK
  terbanyak. Dokumen di tahap PIC UKE dengan `pic_uke` kosong dilaporkan terpisah (*tertahan tanpa pemilik*).
  Pada data contoh: 31 dokumen.
- **Masalah kualitas per UKE I**: jumlah dokumen entri per UKE I untuk setiap masalah 4.4; nilai terbesar per kolom
  ditandai dengan ikon dan teks pada label aksesibel.

### 4.9 Pembulatan dan format

- Pembulatan satu desimal mengikuti implementasi acuan: nilai yang tepat di tengah dibulatkan ke genap.
- Format angka `id-ID`: titik ribuan, koma desimal (`5.063`, `53,1%`, `10,9`). Nilai tidak tersedia: "—".

## 5. Tampilan, warna, dan aksesibilitas

### 5.1 Kerangka

Header (judul, unit, tanggal data, penanda *Data contoh*, tombol *Unduh laporan*); bilah tab dan filter;
isi tampilan; peringatan data bila ada; definisi indikator dan ringkasan pemeriksaan data di setiap tampilan.

### 5.2 Tampilan

1. **Ringkasan Pimpinan**: tiga kartu *Perlu perhatian* (alur kerja, target, kualitas) yang menautkan ke
   tampilan terkait; lima KPI (total aset, terpublikasi dengan bar target 95%, dalam proses, tertahan
   > 5 HK, skor kualitas); jalan menuju target dan tren capaian (4.8); capaian per UKE I terhadap target dengan
   kekurangan per UKE I; rekapitulasi per sumber data (bar bertumpuk terpublikasi / dalam proses / tidak tayang);
   dokumen baru dan dipublikasikan per bulan; dokumen per Menu Program.
2. **Kontrol Alur Kerja**: lima tahap (Draft → Operator Konten → PIC UKE → Tervalidasi → Publish) dengan
   status; jalur keluar (ditolak, UnPublish); tiga aksi cepat dengan daftar dokumen; beban per PIC UKE (4.8);
   tabel ketepatan waktu per UKE I yang dapat dibuka ke UKE II (tombol Buka semua / Tutup semua), dengan kolom
   lebih dari 20 hari kerja.
3. **Kualitas Aset**: skor dan tujuh dimensi; sebaran skor; lima masalah kualitas, masing-masing dengan
   daftar dokumen yang dapat diunduh sebagai CSV; masalah kualitas per UKE I (4.8).

Setiap blok memuat *catatan analis* yang disusun otomatis dari angka, bukan teks tetap.

### 5.3 Filter

| Filter | Pilihan | Aturan |
| --- | --- | --- |
| Periode **[usulan]** | Seluruh periode; Tahun *n* | Tahun dokumen dibuat (kohort). Tren memakai tahun terpilih |
| UKE I | Semua; 12 UKE I | Hanya entri yang dihitung; Menu Program dikeluarkan (tanpa atribusi) |
| UKE II | Semua; UKE II dari UKE I terpilih (atau semua) | Memilih UKE II mengisi UKE I induknya |
| Sumber data | Entri + Menu Program; Entri; Menu Program | Menu Program menyembunyikan blok yang bergantung pada entri dan menonaktifkan filter UKE |

**[1.3]** Tab dan filter aktif tercermin di URL (`?periode=2026&uke1=…&uke2=…&sumber=ENTRI#alur`), sehingga tampilan dapat
dibagikan atau disimpan sebagai penanda. Tombol *Salin tautan tampilan ini* menyalin URL tersebut. Nilai yang tidak
dikenal (misalnya nama unit lama) diabaikan saat data dimuat.

### 5.4 Warna

| Token | Nilai | Pemakaian |
| --- | --- | --- |
| Utama | `#0E5A7E` | Terpublikasi, capaian ≥ 50%, tab aktif (satu variabel `--utama`) |
| Perhatian | `#C2561C` | Capaian < 50%, tidak tayang, tahap melewati batas, dimensi prioritas |
| Biru muda | `#9EC4D9` | Dalam proses, bulan parsial |
| Latar / Header | `#F2F4F6` / `#0B2A3C` | |
| Chip *Melewati batas* | latar `#FBE0D2`, teks `#8A3510` | |
| Chip *Mendekati batas* | latar `#FFF0C9`, teks `#6B4A00` | |
| Chip *Dalam batas* / *Selesai* | latar `#DCEFE3`, teks `#1F5B38` | |
| Chip *Tidak ada antrean* | latar `#E7ECF0`, teks `#33434F` | |

### 5.5 Aksesibilitas

- Warna tidak pernah menjadi satu-satunya pembeda. Setiap status punya teks; capaian di bawah 50% diberi
  teks "Di bawah 50%"; dimensi prioritas diberi teks "Prioritas perbaikan".
- Kontras teks minimal 4,5:1 (WCAG 2.1 AA).
- Tombol dan kontrol interaktif minimal 44 px tingginya (kecuali pilihan filter 36 px, sesuai mockup).
- Dapat dioperasikan dengan papan ketik, dengan fokus terlihat. Tab memakai `aria-current`, baris UKE I
  memakai `aria-expanded`, dan grafik batang memiliki tabel alternatif untuk pembaca layar.
- Responsif dari 390 px sampai 1360 px tanpa gulir horizontal halaman. Tabel lebar bergulir di dalam
  kotaknya sendiri.

### 5.6 Ikon

Ikon membantu pengguna mengenali jenis angka sekilas. Aturannya:

- Satu konsep = satu ikon di seluruh tampilan (kosakata di `src/components/Ikon.tsx`, pustaka lucide-react yang
  disimpan lokal).
- Ikon selalu dekoratif (`aria-hidden`) dan selalu didampingi teks; ikon tidak pernah menjadi satu-satunya pembawa
  makna.
- Kotak ikon memakai nada *utama* (latar `#EEF4F8`, ikon `#0E5A7E`), nada *perhatian* (latar `#FFF4EA`,
  ikon `#8A3510`), atau nada angka utama pada bagian 5.7.

| Konsep | Ikon | Konsep | Ikon |
| --- | --- | --- | --- |
| Total aset | rak buku (Library) | Draft | dokumen dengan pena |
| Terpublikasi / Publish | bola dunia | Operator Konten | dokumen dengan kaca pembesar |
| Dalam proses | panah berputar | PIC UKE | orang dengan tanda centang |
| Tertahan lebih dari 5 HK | jam pasir (nada perhatian) | Tervalidasi | stempel |
| Skor kualitas | pengukur (gauge) | Ditolak / UnPublish | silang dalam lingkaran / mata dicoret |
| Target publikasi | sasaran | Metadata belum lengkap | dokumen dengan tanda seru |
| Entri / Menu Program | dokumen / kisi | Tanpa PIC | orang dengan silang |
| Status Melewati batas | segitiga peringatan | Belum diperbarui 12 bulan | kalender dengan jam |
| Status Mendekati batas | jam | Kandidat duplikat | dua lembar bertumpuk |
| Status Dalam batas / Selesai | lingkaran centang | File tidak terbaca | pindai teks |
| Status Tidak ada antrean | lingkaran minus | Tab Ringkasan / Alur / Kualitas | dasbor / alur / perisai |

Pada tahap alur kerja, ikon tahap ditampilkan dalam lingkaran dengan nomor urut kecil di sudutnya. Pada layar
di bawah 600 px, ikon di tab disembunyikan agar tab tetap ringkas.

### 5.7 Warna angka utama

Setiap angka utama memiliki warna yang mewakili maknanya. Warna dipakai pada angka, kotak ikon, dan garis aksen
4 px di atas kartu. Label teks tetap berwarna teks biasa, sehingga makna tidak bergantung pada warna.

| Angka | Nada | Warna / latar ikon | Makna warna | Kontras angka pada putih |
| --- | --- | --- | --- | --- |
| Total aset | `total` | `#0B2A3C` / `#E7ECF0` | keseluruhan, netral | 14,9:1 |
| Terpublikasi (gabungan) | `publish` | `#2E7D4F` / `#DCEFE3` | sudah tayang, tercapai; bar capaian pada kartu ikut hijau | 5,0:1 |
| Dalam proses (entri) | `proses` | `#0E5A7E` / `#EEF4F8` | sedang berjalan | 7,6:1 |
| Tertahan lebih dari 5 HK | `tertahan` | `#C2561C` / `#FFF4EA` | perlu tindakan | 4,5:1 |
| Skor kualitas metadata | `kualitas` | `#6B4FBB` / `#EFEBFA` | mutu metadata | 6,1:1 |

Nada yang sama dipakai pada aksi cepat (tertahan = `tertahan`, ditolak = `perhatian`, tervalidasi belum
dipublikasikan = `proses`) dan kartu masalah kualitas (`perhatian`). Grafik lain tidak berubah: pada grafik,
terpublikasi tetap berwarna utama `#0E5A7E` sesuai legenda.

## 6. Unduh laporan

Tombol *Unduh laporan* membuka dialog cetak peramban dengan tata letak cetak A4. Pengguna memilih
"Simpan sebagai PDF". Isinya tampilan yang sedang aktif beserta keterangan filter, tanggal data, dan ringkasan
pemeriksaan data. Tombol, filter, dan dialog tidak ikut tercetak. Nama berkas usulan:
`Laporan KOMENS - <tampilan> - <tanggal data>`.

## 7. Parameter yang dapat diubah (`src/config.ts`)

Tanggal data, batas tertahan (5 HK), ambang *Mendekati batas* (4), target (95%), ambang kelengkapan (60),
batas belum diperbarui (12 bulan), ambang dimensi prioritas (65), penanda data contoh.

## 8. Mutu data

### 8.1 Penanda data contoh

Selama data adalah data contoh, header menampilkan "Data contoh · ilustrasi" (`DATA_CONTOH` di konfigurasi).

### 8.2 Pemeriksaan data saat memuat

| Kode | Pemeriksaan |
| --- | --- |
| `persamaan_total` | Total = terpublikasi + dalam proses (entri) + tidak tayang |
| `dokumen_id_unik` | `dokumen_id` unik |
| `uke2_ada_di_referensi` | Setiap `uke2` dokumen entri ada di `unit_kerja.csv` |
| `uke1_turunan_uke2` | `uke1` dokumen entri sama dengan induk `uke2`-nya |
| `status_valid` | Status sesuai daftar sah per sumber (bagian 3.1) |
| `riwayat_sesuai_status` | Status terakhir di riwayat = `status_saat_ini`, dan riwayat hanya untuk dokumen entri |
| `tanggal_logis` | `tgl_status_terakhir` ≥ `tgl_dibuat` dan tidak melewati T |
| `snapshot_persamaan_total` | Persamaan total terpenuhi di setiap baris snapshot |

Bila ada yang tidak terpenuhi, muncul peringatan teks di atas isi tampilan yang menyebut pemeriksaan yang gagal.
Ringkasan "*n* dari 8 terpenuhi" selalu tersedia di bagian definisi.

## 9. Kriteria penerimaan

| No | Kriteria |
| --- | --- |
| K-01 | Semua nilai `data/expected_indicators.json` dihasilkan identik oleh modul indikator (uji otomatis). |
| K-02 | Kedelapan pemeriksaan 8.2 bernilai benar pada data contoh. Bila data dirusak, pemeriksaan terkait gagal dan peringatan teks tampil. |
| K-03 | Persamaan kontrol ditampilkan dan terpenuhi pada data contoh (5.063 = 2.687 + 1.202 + 1.174). |
| K-04 | HK mengikuti (a, b], tanpa akhir pekan dan tanggal `hari_libur.csv`. Tidak ada tanggal libur di kode sumber. |
| K-05 | Status ketepatan waktu mengikuti ambang 4/5 dan selalu tampil sebagai teks. |
| K-06 | Ringkasan Pimpinan menampilkan angka acuan: total 5.063, terpublikasi 2.687 (53,1%), kekurangan 2.123, dalam proses 1.202, tertahan 790, skor 70,3. |
| K-07 | Tabel UKE I/UKE II dapat dibuka/ditutup per baris dan sekaligus, terurut menurut tertahan > 5 HK, dan angkanya sama dengan acuan. |
| K-08 | Filter UKE I mengubah semua angka dan sama dengan baris tabel UKE I; pilihan UKE II menyesuaikan UKE I. |
| K-09 | Sumber Menu Program menyembunyikan blok yang bergantung pada entri dan menonaktifkan filter UKE. |
| K-10 | Filter Periode mengubah angka; jumlah per tahun sama dengan total. |
| K-11 | Perubahan dibanding akhir bulan lalu dari snapshot (+40 total). "—" bila snapshot tidak ada atau filter aktif. |
| K-12 | Format angka `id-ID` di seluruh antarmuka. |
| K-13 | Tidak ada kode unit di antarmuka; nama UKE I/UKE II ditampilkan. |
| K-14 | Responsif 390–1360 px tanpa gulir horizontal halaman; tabel lebar bergulir di kotaknya. |
| K-15 | Aksesibilitas 5.5: teks status, kontras AA, tombol ≥ 44 px, `aria-current`/`aria-expanded`, dapat dioperasikan papan ketik. |
| K-16 | Unduh laporan menghasilkan PDF berisi tampilan aktif tanpa tombol dan filter. |
| K-17 | Penanda data contoh tampil. |
| K-18 | Aplikasi berjalan sebagai berkas statis tanpa backend; data dapat diganti tanpa membangun ulang. |
| K-19 | Ambang kelengkapan dan parameter lain berupa konstanta yang mudah diubah. |
| K-20 | Setiap KPI, kartu masalah, aksi cepat, tahap alur, dan label status memiliki ikon sesuai 5.6, memakai warna sesuai 5.6/5.7, dan tidak terbaca oleh pembaca layar. |
| K-21 | Kelima angka utama memiliki warna berbeda sesuai 5.7, dengan kontras angka terhadap latar minimal 4,5:1. |
| K-22 | **[1.3]** Indikator 4.8 diuji otomatis: jalan menuju target (1.202 + 921 = 2.123; 76,8%), tren kekurangan dari snapshot (2.115, 2.088, 2.173, 2.123), sebaran umur dan beban PIC menjumlah ke angka acuan. |
| K-23 | **[1.3]** Filter dan tab tercermin di URL; membuka tautan berfilter menampilkan filter yang sama. |
| K-24 | **[1.3]** Tanggal data dibaca dari `meta_data.csv` bila ada, tanpa build ulang. |
