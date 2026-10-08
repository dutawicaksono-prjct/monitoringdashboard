/// <reference types="vitest" />
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

// Folder data/ dibiarkan apa adanya. Plugin ini menyajikan berkas CSV-nya di /data/ saat
// pengembangan dan menyalinnya ke dist/data/ saat build, sehingga data dapat diganti
// tanpa membangun ulang aplikasi.
const DATA_DIR = resolve(__dirname, 'data');

function dataCsv(): Plugin {
  return {
    name: 'komens-data-csv',
    configureServer(server) {
      server.middlewares.use('/data', (req, res, next) => {
        const name = decodeURIComponent((req.url ?? '').split('?')[0].replace(/^\//, ''));
        if (!/^[\w-]+\.csv$/.test(name)) return next();
        try {
          res.setHeader('Content-Type', 'text/csv; charset=utf-8');
          res.end(readFileSync(resolve(DATA_DIR, name)));
        } catch {
          next();
        }
      });
    },
    generateBundle() {
      for (const name of readdirSync(DATA_DIR).filter((f) => f.endsWith('.csv'))) {
        this.emitFile({ type: 'asset', fileName: `data/${name}`, source: readFileSync(resolve(DATA_DIR, name)) });
      }
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [react(), dataCsv()],
  test: { include: ['tests/**/*.test.ts'] },
});
