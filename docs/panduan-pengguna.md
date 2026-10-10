# Panduan Pengguna Dasbor Monitoring KOMENS

Dasbor ini menjawab tiga pertanyaan: **seberapa dekat kita dengan target publikasi 95%**, **di mana dokumen
tertahan dalam alur kerja**, dan **apa masalah kualitas metadata yang perlu dibersihkan**.

Angka dihitung dari data per tanggal yang tertera di header ("Data per 8 Oktober 2026"). Selama penanda
**Data contoh · ilustrasi** tampil, angka bukan data sebenarnya.

## 1. Bagian layar

| Bagian | Fungsi |
| --- | --- |
| Header | Tanggal data, penanda data contoh, tombol **Unduh laporan** |
| Tab | **Ringkasan Pimpinan**, **Kontrol Alur Kerja**, **Kualitas Aset** |
| Filter | Periode, UKE I, UKE II, Sumber data. Berlaku untuk semua angka di semua tab |
| Definisi indikator | Di bawah setiap tab; jelaskan arti setiap istilah |
| Pemeriksaan data | Di bawah definisi; klik untuk melihat 11 pemeriksaan mutu data |

## 2. Filter

- **Periode**: *Seluruh periode* (semua dokumen) atau *Tahun n* (dokumen yang dibuat pada tahun itu).
- **UKE I / UKE II**: menyempitkan ke unit kerja. Karena Menu Program tidak memiliki unit kerja, saat filter ini
  aktif hanya dokumen entri yang dihitung. Memilih UKE II langsung mengisi UKE I induknya.
- **Sumber data**: *Entri + Menu Program* (semua), *Entri*, atau *Menu Program*. Pilihan *Menu Program*
  menyembunyikan blok yang hanya berlaku untuk entri (alur kerja, capaian per UKE I, tren dokumen baru).

Perubahan dibanding akhir bulan lalu hanya tampil untuk seluruh periode tanpa filter. Bila ada filter,
tampil "—" karena data pembanding bulanan hanya tersedia untuk angka total.

**Tautan berfilter**: filter dan tab yang aktif tersimpan di alamat halaman. Klik **Salin tautan tampilan ini** lalu kirim
ke rekan (misalnya PIC UKE) agar mereka langsung melihat tampilan yang sama.

## 3. Ringkasan Pimpinan

1. **Perlu perhatian**: tiga temuan terpenting saat ini. Klik kartu untuk menuju rinciannya.
2. **Indikator utama**:
   - *Total aset*: semua dokumen, termasuk yang UnPublish.
   - *Terpublikasi*: bar biru = capaian, garis hitam = target 95%.
   - *Dalam proses*: dokumen entri yang masih berjalan di alur kerja.
   - *Tertahan > 5 hari kerja*: dokumen yang belum berpindah tahap lebih dari 5 hari kerja.
   - *Skor kualitas metadata*: 0–100.
3. **Capaian per UKE I**: diurutkan dari yang terendah. Oranye dan teks "Di bawah 50%" menandai unit yang paling
   jauh dari target.
4. **Rekapitulasi per sumber data**: komposisi publish / dalam proses / tidak tayang untuk entri, Menu Program,
   dan total. Kalimat *persamaan kontrol* memastikan ketiganya menjumlah ke total.
5. **Dokumen baru per bulan**: garis putus-putus = rata-rata bulan lengkap; bulan berjalan (bertanda *)
   masih parsial.
6. **Dokumen per Menu Program**: bila satu menu sangat dominan (JDIH), gunakan tombol **Sembunyikan** agar menu
   lain terbaca.

7. **Jalan menuju target 95%**: dari kekurangan menuju target, berapa yang dapat ditutup bila dokumen dalam proses selesai
   (biru muda) dan berapa yang hanya dapat ditutup lewat keputusan atas dokumen tidak tayang (oranye). Bila bagian oranye
   ada, mempercepat alur kerja saja tidak cukup.
8. **Tren capaian**: persen publish pada akhir setiap bulan. Catatan analis menyebut laju per bulan dan perkiraan kapan
   target tercapai, atau bahwa target tidak tercapai bila laju tidak berubah.
9. Capaian per UKE I juga menyebut **kekurangan dokumen** per unit; unit dengan persen terendah belum tentu yang
   kekurangannya terbanyak. Grafik bulanan menampilkan dokumen baru (biru) dan yang dipublikasikan (hijau).

## 4. Kontrol Alur Kerja

- **Tahap 1–5**: jumlah dokumen di tiap tahap, berapa yang melewati 5 hari kerja, dan rata-rata lama tertahan.
- **Status**:

  | Status | Arti |
  | --- | --- |
  | Dalam batas | rata-rata tertahan kurang dari 4 hari kerja |
  | Mendekati batas | 4 sampai 5 hari kerja |
  | Melewati batas | lebih dari 5 hari kerja |
  | Tidak ada antrean | tidak ada dokumen dalam proses |

- **Aksi cepat**: klik untuk membuka daftar dokumen (misalnya yang tertahan di PIC UKE), lalu **Unduh CSV** untuk
  ditindaklanjuti.
- **Tabel UKE I/UKE II**: klik nama UKE I untuk membuka UKE II-nya; **Buka semua / Tutup semua** untuk sekaligus.
  Di layar sempit, geser tabel ke samping.

*Hari kerja* = Senin–Jumat di luar libur nasional dan cuti bersama. Hari status berubah tidak dihitung.

- **Beban per PIC UKE**: siapa memegang dokumen di tahap PIC UKE dan berapa yang lewat batas. Klik **Daftar** untuk
  daftar dokumen per PIC (siap diunduh untuk pengingat). Tombol **Lihat … dokumen tanpa PIC** menampilkan dokumen yang
  tertahan tanpa pemilik.
- Kolom **lebih dari 20 hari kerja** di tabel UKE membantu memilih unit yang paling mendesak, karena hampir semua unit
  bisa berstatus Melewati batas.

## 5. Kualitas Aset

- **Skor kualitas metadata** per tujuh dimensi. Dimensi di bawah 65 ditandai *Prioritas perbaikan*.
- **Sebaran skor** per dokumen.
- **Masalah kualitas**: klik **Lihat daftar** untuk melihat dan mengunduh dokumen bermasalah. *Tag tidak baku*
  menghitung dokumen yang memakai bentuk tag bukan baku menurut daftar tag baku bawaan dasbor.
- **Konsistensi tagging**: persentase pemakaian tag berbentuk baku atau padanan bahasa Inggris. Tabel *Seluruh tag yang
  diinput* menampilkan setiap konsep dengan semua bentuk penulisannya (hijau = baku, biru = padanan bahasa Inggris,
  oranye = tidak baku, abu-abu = belum di kamus); ketik di *Cari tag* atau pilih *Tampilkan* untuk menyaring. Tabel
  *Kandidat padanan* berisi tag yang belum di kamus tetapi mirip ejaan atau makna tag lain; unduh, tinjau, lalu
  tambahkan ke `kamus_tag.csv` atau daftar baku bawaan. Tag yang dipetakan otomatis menurut makna ditandai
  "makna, dipetakan otomatis".

- **Masalah kualitas per UKE I**: jumlah temuan per unit; angka terbesar di tiap kolom ditandai. Klik angka untuk melihat
  daftarnya.
- Dimensi *Kemutakhiran isi (ketepatan waktu)* mengukur seberapa mutakhir isi dokumen, berbeda dengan ketepatan waktu alur
  kerja.

## 6. Unduh laporan (PDF)

Klik **Unduh laporan** → pada dialog cetak pilih **Simpan sebagai PDF** → **Simpan**. Laporan berisi tab yang
sedang dibuka beserta filter yang aktif. Buka atau tutup baris tabel UKE terlebih dahulu sesuai kebutuhan.

## 7. Bila muncul peringatan

Kotak oranye **"Peringatan: data tidak lolos pemeriksaan"** berarti data yang dimuat tidak konsisten (misalnya
ID ganda). Angka mungkin tidak akurat; laporkan ke pengelola dasbor (Tim PIP).

## 8. Pertanyaan umum

**Mengapa total UnPublish ikut dihitung?** Target 95% diukur terhadap seluruh aset, termasuk yang belum atau tidak
ditayangkan, agar dokumen yang tidak ditayangkan tetap terlihat sebagai pekerjaan rumah.

**Mengapa angka saya berbeda dengan KOMENS?** Dasbor memakai data per tanggal di header, bukan waktu nyata.

**Mengapa Menu Program tidak muncul saat memilih UKE?** Menu Program dikategorikan menurut substansi program dan
belum memiliki atribusi unit kerja.
