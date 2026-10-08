export type Sumber = 'ENTRI' | 'MENU_PROGRAM';

export const STATUS_PROSES = ['DRAFT', 'OPERATOR_KONTEN', 'PIC_UKE', 'TERVALIDASI'] as const;
export const STATUS_TIDAK_TAYANG = ['DITOLAK_OPERATOR', 'DITOLAK_PIC', 'UNPUBLISH'] as const;
export const STATUS_ENTRI = [...STATUS_PROSES, 'PUBLISH', ...STATUS_TIDAK_TAYANG] as const;
export const STATUS_MENU_PROGRAM = ['PUBLISH', 'UNPUBLISH'] as const;

export type StatusProses = (typeof STATUS_PROSES)[number];

export interface Dokumen {
  dokumen_id: string;
  judul: string;
  sumber: string;
  menu_program: string;
  uke1: string;
  uke2: string;
  pic_uke: string;
  status_saat_ini: string;
  tgl_dibuat: string;
  tgl_status_terakhir: string;
  tgl_publish: string;
  skor_metadata: number;
  /** skor_dimensi_1 .. skor_dimensi_7 */
  skor_dimensi: number[];
  tgl_pembaruan_terakhir: string;
  hash_konten: string;
  ocr_berhasil: boolean;
}

export interface Riwayat {
  dokumen_id: string;
  status_dari: string;
  status_ke: string;
  tgl_perubahan: string;
  diubah_oleh: string;
}

export interface UnitKerja {
  uke1: string;
  uke2: string;
}

export interface HariLibur {
  tanggal: string;
  keterangan: string;
  jenis: string;
}

export interface Snapshot {
  tanggal_snapshot: string;
  total_aset: number;
  terpublikasi: number;
  dalam_proses_entri: number;
  tidak_tayang: number;
  tertahan_lebih_dari_5_hk: number;
}

export interface Dataset {
  dokumen: Dokumen[];
  riwayat: Riwayat[];
  unitKerja: UnitKerja[];
  hariLibur: HariLibur[];
  snapshot: Snapshot[];
}

export type FilterSumber = 'SEMUA' | Sumber;

export interface Filter {
  /** 'SEMUA' atau tahun pembuatan dokumen (kohort), misalnya 2026. */
  periode: 'SEMUA' | number;
  uke1: string | null;
  uke2: string | null;
  sumber: FilterSumber;
}

export const FILTER_AWAL: Filter = { periode: 'SEMUA', uke1: null, uke2: null, sumber: 'SEMUA' };

export type StatusWaktu = 'Dalam batas' | 'Mendekati batas' | 'Melewati batas' | 'Tidak ada antrean';

export interface BarisUnit {
  total: number;
  publish: number;
  persen_publish: number | null;
  dalam_proses: number;
  lebih_dari_5_hk: number;
  rata_rata_tertahan_hk: number | null;
  status: StatusWaktu;
}

export interface BarisUke1 extends BarisUnit {
  uke2: Record<string, BarisUnit>;
}

export interface Tahap {
  jumlah: number;
  lebih_dari_5_hk: number;
  persen_melewati: number | null;
  rata_rata_tertahan_hk: number | null;
}

export interface PemeriksaanData {
  persamaan_total: boolean;
  dokumen_id_unik: boolean;
  uke2_ada_di_referensi: boolean;
  uke1_turunan_uke2: boolean;
  status_valid: boolean;
  riwayat_sesuai_status: boolean;
  tanggal_logis: boolean;
  snapshot_persamaan_total: boolean;
}

export interface Ringkasan {
  total_aset: number;
  entri: number;
  menu_program: number;
  terpublikasi: number;
  terpublikasi_entri: number;
  terpublikasi_menu_program: number;
  persen_publish: number | null;
  kekurangan_menuju_target: number;
  dalam_proses_entri: number;
  tidak_tayang: number;
  tidak_tayang_entri: number;
  tidak_tayang_menu_program: number;
  tertahan_lebih_dari_5_hk: number;
}

export interface Kualitas {
  skor_rata_rata: number | null;
  skor_per_dimensi: Record<string, number | null>;
  sebaran_skor: { di_bawah_50: number; '50_69': number; '70_84': number; '85_ke_atas': number };
  masalah: {
    metadata_belum_lengkap: number;
    tanpa_pic: number;
    belum_diperbarui_12_bulan: number;
    kandidat_duplikat: number;
    file_tidak_terbaca: number;
  };
  ambang_kelengkapan: number;
}

export type Perubahan = Omit<Snapshot, 'tanggal_snapshot'>;

/** Keluaran indikator; untuk filter awal strukturnya identik dengan data/expected_indicators.json. */
export interface Indikator {
  tanggal_data: string;
  batas_tertahan_hari_kerja: number;
  target_publikasi_persen: number;
  pemeriksaan_data: PemeriksaanData;
  ringkasan: Ringkasan;
  status_entri: Record<string, number>;
  tahap: Record<StatusProses, Tahap>;
  uke1: Record<string, BarisUke1>;
  /** Tahun yang ditampilkan pada tren dokumen baru. */
  tahun_tren: number;
  dokumen_baru_per_bulan: Record<string, number>;
  rata_rata_bulanan_bulan_lengkap: number | null;
  dokumen_per_menu_program: Record<string, number>;
  /** Snapshot akhir bulan (dari snapshot_bulanan.csv) yang menjadi pembanding; null bila tidak ada. */
  snapshot_pembanding: Snapshot | null;
  /** null bila snapshot tidak ada atau filter aktif (snapshot hanya berisi angka total). */
  perubahan_dibanding_akhir_bulan_lalu: Perubahan | null;
  kualitas: Kualitas;
}

/** Dokumen yang sudah diperkaya: umur tertahan dihitung sekali per tanggal data. */
export interface DokumenSiap extends Dokumen {
  tahun_dibuat: number;
  /** Hari kerja sejak perubahan status terakhir; hanya untuk entri dalam proses. */
  lama_hk: number | null;
  lewat_batas: boolean;
}
