# Panduan Belajar: Bagaimana Dasbor KOMENS Dibangun

Dokumen ini menjelaskan cara kerja dasbor dari hulu ke hilir, agar dapat dijadikan contoh saat membangun atau
mengoptimalkan dasbor monitoring lain. Bacalah berurutan; setiap bagian merujuk berkas nyata di repositori.

## 1. Tahapan membangun dasbor (yang dilakukan di proyek ini)

| Tahap | Pertanyaan kunci | Artefak di repositori |
| --- | --- | --- |
| 1. Kebutuhan | Siapa penggunanya, keputusan apa yang mereka ambil? | `docs/spesifikasi.md` bagian 1–2 |
| 2. Data | Data apa yang tersedia, apa kuncinya, seberapa bersih? | `data/`, `docs/panduan-data.md` |
| 3. Definisi indikator | Rumus persis, termasuk kasus tepi (pembagi nol, pembulatan, hari libur) | `docs/spesifikasi.md` bagian 4 |
| 4. Nilai acuan | Hasil yang benar atas data contoh, dihitung independen | `data/expected_indicators.json`, `tools/compute_indicators.py` |
| 5. Rancangan tampilan | Urutan informasi, warna, aksesibilitas | `reference/mockup_v2.dc.html`, spesifikasi bagian 5 |
| 6. Implementasi | Modul hitung terpisah dari tampilan | `src/indicators/`, `src/components/` |
| 7. Pengujian | Angka benar? tampilan sesuai kriteria? | `tests/`, `scripts/uji-penerimaan.mjs` |
| 8. Pemasangan dan operasi | Bagaimana data diperbarui tiap bulan? | `.github/workflows/`, `docs/panduan-pemasangan.md` |
| 9. Uji coba pengguna | Apakah pengguna memahami dan memakainya? | `docs/panduan-uji-pengguna.md` |

Pelajaran utama: **tahap 3 dan 4 adalah yang paling sering dilewati**, padahal di situlah kebanyakan dasbor salah.
Tanpa rumus tertulis dan nilai acuan, tidak ada cara membuktikan angka di layar benar.

## 2. Arsitektur

```
data/*.csv ──fetch──▶ parse.ts ──▶ Dataset ──siapkan()──▶ Konteks ──hitungIndikator(filter)──▶ Indikator ──▶ komponen React
  (CSV mentah)        (validasi     (objek     (umur tertahan       (pemeriksaan 8.2      (angka siap    (Ringkasan,
                       kolom)        bertipe)    dihitung sekali)     sekali)               tampil)        AlurKerja, Kualitas)
```

- **Aplikasi statis.** Tidak ada server aplikasi atau basis data. Peramban mengunduh CSV dan menghitung semuanya.
  Untuk ±5 ribu dokumen ini cepat (< 1 detik) dan murah dipasang. Bila data tumbuh ke ratusan ribu baris,
  pertimbangkan praagregasi (lihat bagian 7).
- **Modul indikator murni** (`src/indicators/`) tidak mengenal React. Fungsi menerima data dan filter, lalu
  mengembalikan angka. Karena itu ia mudah diuji dan bisa dipakai ulang (misalnya oleh skrip `periksa-data`).
- **Komponen tampilan** hanya memformat dan menyusun angka; tidak ada rumus bisnis di dalamnya, kecuali
  pemilihan teks "catatan analis".
- **Konfigurasi** (`src/config.ts`) memisahkan parameter kebijakan (target 95%, batas 5 hari kerja, ambang
  kelengkapan) dari kode. Kebijakan berubah lebih sering daripada rumus.

## 3. Tur berkas

| Berkas | Isi | Baca untuk belajar |
| --- | --- | --- |
| `src/indicators/types.ts` | Bentuk data masuk dan keluar | Bagaimana memodelkan data dan indikator |
| `src/indicators/tanggal.ts` | Hari kerja HK(a, b], zona WIB | Menangani tanggal tanpa jebakan zona waktu |
| `src/indicators/angka.ts` | Pembulatan dan persentase | Mengapa `Math.round` saja bisa berbeda dengan acuan |
| `src/indicators/hitung.ts` | Semua rumus bagian 4 | Inti dasbor |
| `src/indicators/parse.ts` | Membaca CSV dan validasi kolom | Pesan kesalahan yang ramah |
| `src/components/Ringkasan.tsx` | Tampilan pimpinan | Menyusun "perlu perhatian" dan catatan analis dari data |
| `src/components/AlurKerja.tsx` | Tahap proses dan tabel UKE | Tabel yang dapat dibuka/tutup |
| `src/components/Ikon.tsx` | Kosakata ikon: satu konsep satu ikon | Konsistensi visual dan aksesibilitas ikon |
| `src/styles.css` | Token warna, tata letak responsif, gaya cetak | Satu sumber warna; `@media print` untuk PDF |
| `tests/indicators.test.ts` | Uji terhadap nilai acuan | Pola "fixture" |
| `scripts/uji-penerimaan.mjs` | Uji di peramban | Menguji kriteria penerimaan secara otomatis |

## 4. Prinsip desain dasbor yang diterapkan

1. **Jawab pertanyaan, bukan pamer data.** Setiap tampilan dibuka dengan pertanyaan penggunanya:
   "Perlu perhatian", "di mana dokumen tertahan?", "masalah apa yang perlu dibersihkan?".
2. **Bandingkan dengan sesuatu.** Angka tanpa pembanding tidak bermakna: capaian dibanding target 95%,
   lama tertahan dibanding batas 5 hari kerja, total dibanding akhir bulan lalu.
3. **Urutkan menurut masalah.** UKE I diurutkan dari capaian terendah atau tertahan terbanyak, bukan alfabet.
4. **Warna hemat dan bermakna.** Satu warna utama, satu warna perhatian (oranye). Warna tidak pernah menjadi
   satu-satunya pembeda: setiap status juga bertuliskan teks.
5. **Grafik sederhana.** Bar horizontal dan batang dibuat dengan HTML/CSS; tidak perlu pustaka grafik berat.
   Penanda target berupa garis vertikal yang sama di semua bar.
6. **Konteks melekat pada angka.** Sub-teks di bawah KPI ("65,7% dari 1.202 dokumen dalam proses") dan
   definisi indikator di setiap tampilan mencegah salah tafsir.
7. **Tindak lanjut satu klik.** Kartu masalah dan aksi cepat membuka daftar dokumen yang dapat diunduh.
8. **Ikon sebagai penanda, bukan pengganti teks.** Satu konsep = satu ikon di semua tampilan (jam pasir selalu
   berarti tertahan), ikon memakai warna yang sudah ada, dan status selalu punya tiga penanda: ikon, teks, warna.
9. **Jujur pada keterbatasan.** "—" bila data tidak ada (bukan 0), peringatan bila pemeriksaan data gagal,
   penanda "Data contoh", dan bulan berjalan ditandai parsial.

## 5. Latihan: menambah indikator baru

Contoh: "jumlah dokumen tanpa tanggal publish padahal berstatus Publish". Ikuti urutan ini, yang juga
berlaku untuk perubahan apa pun.

1. **Tulis definisinya** di `docs/spesifikasi.md` bagian 4 dan minta persetujuan pemilik kebutuhan.
2. **Tambahkan nilai acuan.** Hitung manual atau di Python atas data contoh, lalu tambahkan ke
   `tools/compute_indicators.py` dan jalankan ulang untuk memperbarui `expected_indicators.json`.
3. **Tambahkan tipe** di `types.ts` (misalnya di `Kualitas['masalah']`).
4. **Tambahkan rumus** di `hitung.ts` (`predikatMasalah` dan `hitungKualitas`).
5. **Jalankan `npm test`.** Uji akan gagal sampai angka JS sama dengan acuan; inilah gunanya fixture.
6. **Tampilkan** di komponen (`Kualitas.tsx`, daftar `daftarMasalah`).
7. **Tambahkan kriteria** di spesifikasi bagian 9 dan pemeriksaannya di `scripts/uji-penerimaan.mjs`.
8. **Catat** di `CHANGELOG.md` dan naikkan versi di `package.json`.

## 6. Perintah sehari-hari

```bash
npm run dev             # mengembangkan dengan muat ulang otomatis
npm test                # uji rumus (detik)
npm run periksa-data    # periksa data sebelum dipasang
npm run snapshot        # tambah snapshot akhir bulan lalu
npm run build           # hasil statis di dist/
npm run uji:penerimaan  # uji di peramban (butuh server preview berjalan)
```

## 7. Bila ingin mengembangkan lebih jauh

| Kebutuhan | Rekomendasi |
| --- | --- |
| Data langsung dari KOMENS, tanpa ekspor manual | Tugas terjadwal (cron) yang mengekspor CSV dari basis data KOMENS ke folder `data/` di server, lalu menjalankan `npm run periksa-data` |
| Data sangat besar | Praagregasi di server (hasilkan JSON indikator per filter), peramban hanya menampilkan |
| Hak akses per peran | Butuh autentikasi (SSO Bappenas) di depan server web; tampilan disaring menurut peran |
| Riwayat tren skor kualitas | Tambahkan kolom skor rata-rata pada `snapshot_bulanan.csv` dan rekam tiap akhir bulan |
| Dasbor lain di Pusdatinrenbang | Salin pola: spesifikasi → nilai acuan → modul hitung murni → tampilan → uji |
