# Rencana Uji Coba Pengguna

Tujuan: memastikan pengguna **memahami angka**, **menemukan informasi yang mereka butuhkan**, dan **tahu tindak
lanjutnya**, sebelum dasbor dipakai rutin. Uji coba ini menguji dasbor, bukan pengguna.

## 1. Rancangan singkat

| Unsur | Rekomendasi |
| --- | --- |
| Peserta | 5–8 orang: 1–2 pimpinan, 2–3 PIC UKE, 2–3 Operator Konten/kurator. Lima orang sudah menemukan sebagian besar masalah utama |
| Format | Tatap muka atau daring, 30–40 menit per orang, satu fasilitator + satu pencatat |
| Bahan | Alamat dasbor (GitHub Pages atau server internal), lembar tugas (bagian 3), kuesioner (bagian 4) |
| Metode | *Think aloud*: peserta diminta menyuarakan apa yang dipikirkan sambil mengerjakan tugas |
| Data dicatat | Berhasil/tidak, waktu, kesalahan tafsir, kutipan, skor kuesioner |

Sebelum mulai, isi `TAUTAN_MASUKAN` di `src/config.ts` dengan tautan formulir (Google Form/Microsoft Forms) agar
peserta dapat memberi masukan langsung dari kaki halaman.

## 2. Naskah fasilitator

1. **Pembuka (3 menit).** "Kami menguji dasbornya, bukan Anda. Tidak ada jawaban salah. Silakan ucapkan apa yang
   Anda pikirkan. Data di dasbor adalah data contoh."
2. **Kesan pertama (2 menit).** Tampilkan Ringkasan Pimpinan selama 10 detik. Tanyakan apa yang paling
   menonjol dan apa kesimpulannya.
3. **Tugas (20 menit).** Bacakan satu per satu. Jangan membantu kecuali peserta macet lebih dari 2 menit; catat
   sebagai "dibantu".
4. **Kuesioner (5 menit).**
5. **Penutup (5 menit).** "Apa satu hal yang paling ingin diubah? Apa yang membuat Anda akan membuka dasbor ini
   setiap minggu?"

## 3. Tugas uji (dengan jawaban atas data contoh)

| No | Peran | Tugas | Jawaban benar | Menguji |
| --- | --- | --- | --- | --- |
| T1 | Semua | Berapa persen aset sudah terpublikasi, dan berapa dokumen lagi untuk mencapai target? | 53,1%; kurang 2.123 | KPI dan target |
| T2 | Pimpinan | UKE I mana yang capaian publikasinya paling rendah? | Inspektorat Utama (34,0%) | Capaian per UKE I |
| T3 | Pimpinan | Apakah jumlah aset bertambah dibanding akhir bulan lalu? Berapa? | Ya, +40 | Perubahan bulanan |
| T4 | PIC UKE | Di tahap mana dokumen paling banyak tertahan lebih dari 5 hari kerja? | PIC UKE, 590 dokumen | Alur kerja |
| T5 | PIC UKE | Tampilkan hanya unit Anda (mis. Biro Hukum). Berapa dokumen yang tertahan lebih dari 5 hari kerja dan apa statusnya? | 20 dokumen; Melewati batas | Filter UKE II, tabel |
| T6 | PIC UKE | Unduh daftar dokumen yang tertahan di tahap PIC UKE. | Berkas CSV terunduh | Aksi cepat |
| T7 | Operator/kurator | Berapa dokumen kandidat duplikat dan bagaimana melihat daftarnya? | 74; tombol Lihat daftar | Kualitas aset |
| T8 | Operator/kurator | Dimensi kualitas mana yang paling lemah? | Ketepatan waktu (60,2) | Dimensi |
| T9 | Semua | Apa arti status "Mendekati batas"? | Rata-rata tertahan 4–5 hari kerja | Keterbacaan status |
| T10 | Semua | Simpan laporan tab Kontrol Alur Kerja sebagai PDF. | PDF tersimpan | Unduh laporan |
| T11 | Semua | Berapa dokumen Menu Program yang UnPublish? | 1.107 | Rekap / filter sumber |

## 4. Kuesioner

### 4a. System Usability Scale (SUS), skala 1 (sangat tidak setuju) – 5 (sangat setuju)

1. Saya rasa saya akan sering menggunakan dasbor ini.
2. Dasbor ini terlalu rumit.
3. Dasbor ini mudah digunakan.
4. Saya butuh bantuan orang teknis untuk dapat menggunakan dasbor ini.
5. Fitur-fitur dalam dasbor ini terpadu dengan baik.
6. Ada terlalu banyak ketidakkonsistenan dalam dasbor ini.
7. Kebanyakan orang akan cepat belajar menggunakan dasbor ini.
8. Dasbor ini sangat merepotkan untuk digunakan.
9. Saya merasa yakin saat menggunakan dasbor ini.
10. Saya perlu mempelajari banyak hal sebelum dapat menggunakan dasbor ini.

**Cara menghitung skor:** butir ganjil (skor − 1), butir genap (5 − skor), jumlahkan, kalikan 2,5. Hasilnya 0–100.
Di atas 68 dianggap di atas rata-rata; di atas 80 sangat baik.

### 4b. Pertanyaan khusus dasbor (1–5)

1. Saya paham arti setiap angka utama.
2. Saya percaya angka di dasbor ini benar.
3. Dasbor membantu saya menentukan tindakan berikutnya.
4. Informasi yang saya butuhkan mudah ditemukan.

### 4c. Terbuka

- Informasi apa yang Anda cari tetapi tidak ada?
- Bagian mana yang membingungkan?
- Seberapa sering Anda akan membukanya (harian/mingguan/bulanan)?

## 5. Lembar pencatatan per peserta

| Tugas | Berhasil (Y/T/Dibantu) | Waktu (detik) | Catatan / kutipan |
| --- | --- | --- | --- |
| T1 | | | |
| … | | | |

## 6. Rekap dan tindak lanjut

1. Hitung **tingkat keberhasilan** per tugas (% peserta berhasil tanpa bantuan). Tugas di bawah 80% adalah masalah.
2. Kelompokkan temuan menurut tingkat keparahan:

   | Tingkat | Definisi | Contoh tindakan |
   | --- | --- | --- |
   | Kritis | Pengguna salah menyimpulkan angka atau tidak bisa menyelesaikan tugas | Perbaiki sebelum dipakai |
   | Sedang | Berhasil tetapi lambat atau ragu | Perbaiki pada versi berikutnya |
   | Ringan | Saran kosmetik | Catat di daftar tunggu |

3. Catat setiap perubahan yang disepakati sebagai butir baru di `docs/spesifikasi.md` (naikkan versinya), lalu ikuti
   alur di `docs/panduan-belajar.md` bagian 5.
4. Ulangi uji singkat (3 peserta) setelah perbaikan kritis.

Templat rekap:

| No | Temuan | Tugas | Peserta (n) | Tingkat | Usulan perbaikan | Keputusan |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | | | | | | |
