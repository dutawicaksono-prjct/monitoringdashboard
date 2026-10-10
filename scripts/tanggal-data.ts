// Tanggal data untuk skrip: dari <folder>/meta_data.csv bila ada, selain itu TANGGAL_DATA di src/config.ts.
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { TANGGAL_DATA } from '../src/config';
import { bacaTanggalData } from '../src/indicators';

export function tanggalDataFolder(folder: string): string {
  const berkas = resolve(folder, 'meta_data.csv');
  return (existsSync(berkas) && bacaTanggalData(readFileSync(berkas, 'utf-8'))) || TANGGAL_DATA;
}
