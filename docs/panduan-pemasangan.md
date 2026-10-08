# Panduan Pemasangan

Hasil build (`npm run build`) adalah folder `dist/` berisi berkas statis:

```
dist/
├── index.html
├── assets/        # JavaScript, CSS, font (nama ber-hash)
└── data/          # *.csv, disalin dari data/ saat build
```

Folder ini dapat disajikan oleh server web statis apa pun. Tidak ada basis data, tidak ada proses yang
berjalan di server.

## A. Demonstrasi: GitHub Pages (data contoh)

Repositori ini sudah memiliki alur `.github/workflows/ci-deploy.yml`. Setiap push ke branch default akan
diuji lalu dipasang otomatis.

Langkah sekali saja:

1. Buka repositori di GitHub → **Settings** → **Pages**.
2. Pada **Build and deployment → Source**, pilih **GitHub Actions**.
3. Buka tab **Actions** → alur **Uji dan pasang dasbor** → **Run workflow** (atau push commit apa saja).
4. Setelah job **Pasang ke GitHub Pages** hijau, alamatnya tampil di ringkasan job, berbentuk
   `https://<pengguna>.github.io/<repositori>/`.

> GitHub Pages bersifat publik. Gunakan hanya dengan data contoh.

Alamat tab dapat dibagikan langsung: `…/#ringkasan`, `…/#alur`, `…/#kualitas`.

## B. Produksi: server Pusdatinrenbang

### Kebutuhan

- Server Linux dengan Nginx atau Apache (server web yang sudah ada pun cukup).
- Mesin pembangun dengan Node.js 18+ (boleh laptop pengembang; server tidak perlu Node.js).

### Langkah

```bash
# 1. Di mesin pembangun
npm ci
npm run periksa-data
npm test
npm run build

# 2. Salin ke server (contoh lokasi /var/www/komens-dasbor)
rsync -av --delete dist/ pengguna@server:/var/www/komens-dasbor/

# 3. Di server: pasang konfigurasi Nginx
sudo cp deploy/nginx-komens-dasbor.conf /etc/nginx/conf.d/komens-dasbor.conf   # sesuaikan server_name & sertifikat
sudo nginx -t && sudo systemctl reload nginx
```

Untuk Apache, cukup arahkan `DocumentRoot` ke folder tersebut. Aplikasi memakai alamat relatif
(`base: './'`), sehingga dapat dipasang di subfolder, misalnya `https://intranet/komens/`.

### Memperbarui data tanpa build ulang

Timpa berkas di `/var/www/komens-dasbor/data/` dengan CSV baru, lalu jalankan
`npm run periksa-data -- --data /path/ke/csv-baru` sebelumnya. Build ulang hanya diperlukan bila
`TANGGAL_DATA` atau parameter di `src/config.ts` berubah.

> Rekomendasi tahap berikutnya: jadikan `TANGGAL_DATA` dibaca dari berkas data (misalnya kolom
> `tanggal_data` pada berkas meta) agar pembaruan data bulanan sama sekali tidak memerlukan build ulang.

### Keamanan

- Batasi akses ke jaringan internal (`allow`/`deny` pada contoh konfigurasi) atau pasang di belakang SSO.
- Hak akses per peran **masih terbuka** di spesifikasi; sampai ditetapkan, semua pengguna yang dapat membuka
  alamat melihat semua tampilan.
- Konfigurasi contoh menyertakan header keamanan dan `Content-Security-Policy` yang hanya mengizinkan sumber
  dari server sendiri (aplikasi tidak memuat apa pun dari internet).

## C. Server statis lain (uji lokal cepat)

```bash
npm run build
npx vite preview --port 4173        # http://localhost:4173
# atau: python3 -m http.server 8080 --directory dist
```

Membuka `dist/index.html` langsung dengan klik dua kali **tidak** berjalan, karena peramban melarang
`fetch` CSV dari `file://`. Selalu gunakan server web.
