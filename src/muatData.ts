import { DATA_URL, TANGGAL_DATA } from './config';
import { bacaDataset, bacaTanggalData, type Dataset } from './indicators';

async function ambil(nama: string, wajib: boolean): Promise<string | null> {
  const res = await fetch(`${DATA_URL}${nama}`, { cache: 'no-cache' });
  if (!res.ok) {
    if (!wajib) return null;
    throw new Error(`Berkas data ${nama} tidak dapat dimuat (HTTP ${res.status}).`);
  }
  return res.text();
}

export interface HasilMuat {
  ds: Dataset;
  /** Dari data/meta_data.csv bila ada; selain itu TANGGAL_DATA di src/config.ts. */
  tanggalData: string;
}

export async function muatDataset(): Promise<HasilMuat> {
  const [dokumen, riwayat, unit, libur, snapshot, meta] = await Promise.all([
    ambil('dokumen.csv', true),
    ambil('riwayat_status.csv', true),
    ambil('unit_kerja.csv', true),
    ambil('hari_libur.csv', true),
    ambil('snapshot_bulanan.csv', false),
    ambil('meta_data.csv', false).catch(() => null),
  ]);
  const ds = bacaDataset({
    dokumen: dokumen!,
    riwayat_status: riwayat!,
    unit_kerja: unit!,
    hari_libur: libur!,
    snapshot_bulanan: snapshot,
  });
  return { ds, tanggalData: (meta && bacaTanggalData(meta)) || TANGGAL_DATA };
}
