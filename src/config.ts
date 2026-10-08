// Parameter dasbor yang dapat diubah tanpa menyentuh rumus. Tanggal libur TIDAK ditaruh di sini;
// sumbernya data/hari_libur.csv.

/** Tanggal cut-off data (YYYY-MM-DD). Seluruh umur tertahan dihitung sampai tanggal ini. */
export const TANGGAL_DATA = '2026-10-08';

/** Batas maksimal tertahan per tahap, dalam hari kerja. */
export const BATAS_TERTAHAN_HK = 5;

/** Ambang bawah status "Mendekati batas" (rata-rata tertahan, hari kerja). */
export const AMBANG_MENDEKATI_HK = 4;

/** Target publikasi, persen dari total aset. */
export const TARGET_PUBLIKASI_PERSEN = 95;

/**
 * Ambang kelengkapan "metadata wajib belum lengkap": skor dimensi 1 (Kelengkapan) di bawah nilai ini.
 * MASIH TERBUKA: nilai 60 dipakai data contoh; ambang resmi ditetapkan Tim PIP.
 */
export const AMBANG_KELENGKAPAN = 60;

/** Dokumen dianggap "belum diperbarui" bila pembaruan terakhir lebih lama dari sekian bulan. */
export const BATAS_BELUM_DIPERBARUI_BULAN = 12;

/** Dimensi kualitas dengan skor rata-rata di bawah nilai ini ditandai "Prioritas perbaikan". */
export const AMBANG_PRIORITAS_DIMENSI = 65;

/** Tampilkan penanda "Data contoh" di header. Matikan bila data sudah data produksi. */
export const DATA_CONTOH = true;

/** Lokasi berkas CSV, relatif terhadap halaman. */
export const DATA_URL = './data/';

/**
 * Tautan formulir masukan (mis. Google Form/Microsoft Forms) untuk uji coba pengguna.
 * Kosongkan ('') untuk menyembunyikan tautan di kaki halaman.
 */
export const TAUTAN_MASUKAN = '';
