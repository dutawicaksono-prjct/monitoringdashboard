// Kosakata ikon dasbor: satu konsep = satu ikon di seluruh tampilan, agar mudah dikenali.
// Ikon selalu dekoratif (aria-hidden) dan selalu didampingi teks; warna hanya memakai token yang ada.
import type { ReactNode } from 'react';
import {
  AlertTriangle,
  BarChart3,
  BookOpen,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  EyeOff,
  FilePen,
  FileSearch,
  FileText,
  FileWarning,
  FlaskConical,
  Gauge,
  Globe,
  Hourglass,
  Link2,
  Layers,
  LayoutDashboard,
  LayoutGrid,
  Library,
  ListChecks,
  MinusCircle,
  RefreshCw,
  Route,
  ScanText,
  ShieldCheck,
  Sparkles,
  Stamp,
  Table2,
  Target,
  TrendingUp,
  UserCheck,
  UserX,
  Users,
  Workflow,
  XCircle,
  type LucideIcon,
} from 'lucide-react';

export const IKON = {
  // Tab
  ringkasan: LayoutDashboard,
  alur: Workflow,
  kualitas: ShieldCheck,
  // Indikator utama
  totalAset: Library,
  terpublikasi: Globe,
  dalamProses: RefreshCw,
  tertahan: Hourglass,
  skorKualitas: Gauge,
  target: Target,
  // Tahap alur kerja
  DRAFT: FilePen,
  OPERATOR_KONTEN: FileSearch,
  PIC_UKE: UserCheck,
  TERVALIDASI: Stamp,
  PUBLISH: Globe,
  ditolak: XCircle,
  unpublish: EyeOff,
  // Masalah kualitas
  metadata_belum_lengkap: FileWarning,
  tanpa_pic: UserX,
  belum_diperbarui_12_bulan: CalendarClock,
  kandidat_duplikat: Copy,
  file_tidak_terbaca: ScanText,
  // Sumber data
  entri: FileText,
  // Bagian
  rekap: Layers,
  tren: CalendarDays,
  menu: LayoutGrid,
  sebaran: BarChart3,
  masalah: Sparkles,
  definisi: BookOpen,
  pemeriksaan: ListChecks,
  unduh: Download,
  dataContoh: FlaskConical,
  jalanTarget: Route,
  trenCapaian: TrendingUp,
  bebanPic: Users,
  tautan: Link2,
  matriks: Table2,
} satisfies Record<string, LucideIcon>;

export type NamaIkon = keyof typeof IKON;

/** Ikon sebaris, ukuran mengikuti teks. */
export function Ikon({ nama, ukuran = 16, className }: { nama: NamaIkon; ukuran?: number; className?: string }) {
  const C = IKON[nama];
  return <C size={ukuran} strokeWidth={2} aria-hidden="true" focusable="false" className={className} />;
}

/**
 * Nada warna kartu angka (spesifikasi 5.7). `utama`/`perhatian` untuk kartu umum; lima nada lain untuk
 * angka utama, masing-masing mewakili makna angkanya.
 */
export type Nada = 'utama' | 'perhatian' | 'total' | 'publish' | 'proses' | 'tertahan' | 'kualitas';

/** Ikon dalam kotak berlatar lembut, untuk kartu angka. */
export function KotakIkon({ nama, nada = 'utama', ukuran = 20 }: { nama: NamaIkon; nada?: Nada; ukuran?: number }) {
  return (
    <span className={`kotak-ikon nada-${nada}`} aria-hidden="true">
      <Ikon nama={nama} ukuran={ukuran} />
    </span>
  );
}

/** Judul bagian dengan ikon di depannya. */
export function JudulIkon({ nama, id, children }: { nama: NamaIkon; id?: string; children: ReactNode }) {
  return (
    <h2 id={id} className="judul-ikon">
      <Ikon nama={nama} ukuran={18} className="ikon-judul" />
      <span>{children}</span>
    </h2>
  );
}

const IKON_STATUS: Record<string, LucideIcon> = {
  'Melewati batas': AlertTriangle,
  'Mendekati batas': Clock,
  'Dalam batas': CheckCircle2,
  Selesai: CheckCircle2,
  'Tidak ada antrean': MinusCircle,
};

/** Label status ketepatan waktu: bentuk ikon + teks + warna (tiga penanda, bukan warna saja). */
export function ChipStatus({ status }: { status: string }) {
  const C = IKON_STATUS[status];
  return (
    <span className="chip" data-status={status}>
      {C && <C size={14} strokeWidth={2.25} aria-hidden="true" focusable="false" />}
      {status}
    </span>
  );
}
