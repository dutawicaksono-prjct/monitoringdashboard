import { DATA_URL } from './config';
import { bacaDataset, type Dataset } from './indicators';

async function ambil(nama: string, wajib: boolean): Promise<string | null> {
  const res = await fetch(`${DATA_URL}${nama}`, { cache: 'no-cache' });
  if (!res.ok) {
    if (!wajib) return null;
    throw new Error(`Berkas data ${nama} tidak dapat dimuat (HTTP ${res.status}).`);
  }
  return res.text();
}

export async function muatDataset(): Promise<Dataset> {
  const [dokumen, riwayat, unit, libur, snapshot] = await Promise.all([
    ambil('dokumen.csv', true),
    ambil('riwayat_status.csv', true),
    ambil('unit_kerja.csv', true),
    ambil('hari_libur.csv', true),
    ambil('snapshot_bulanan.csv', false),
  ]);
  return bacaDataset({
    dokumen: dokumen!,
    riwayat_status: riwayat!,
    unit_kerja: unit!,
    hari_libur: libur!,
    snapshot_bulanan: snapshot,
  });
}
