import { useCallback, useEffect, useMemo, useState } from 'react';
import { TANGGAL_DATA, TAUTAN_MASUKAN } from './config';
import { version as VERSI } from '../package.json';
import { tanggalPanjang } from './format';
import { FILTER_AWAL, hitungIndikator, pilihDokumen, siapkan, type Dataset, type Filter } from './indicators';
import { muatDataset } from './muatData';
import { AlurKerja } from './components/AlurKerja';
import { Kualitas } from './components/Kualitas';
import { Ringkasan } from './components/Ringkasan';
import { Bilah, DaftarDokumen, Definisi, Header, InfoFilter, PeringatanData, TAB, type PermintaanDaftar, type Tab } from './components/Umum';

const TAB_VALID = new Set(TAB.map((t) => t.id));

function tabDariHash(): Tab {
  const h = window.location.hash.replace('#', '') as Tab;
  return TAB_VALID.has(h) ? h : 'ringkasan';
}

export function App() {
  const [ds, setDs] = useState<Dataset | null>(null);
  const [galat, setGalat] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>(tabDariHash);
  const [filter, setFilter] = useState<Filter>(FILTER_AWAL);
  const [daftar, setDaftar] = useState<PermintaanDaftar | null>(null);

  useEffect(() => {
    muatDataset().then(setDs, (e: unknown) => setGalat(e instanceof Error ? e.message : String(e)));
  }, []);

  useEffect(() => {
    const onHash = () => setTab(tabDariHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const pindahTab = useCallback((t: Tab) => {
    setTab(t);
    history.replaceState(null, '', `#${t}`);
    window.scrollTo({ top: 0 });
  }, []);

  const ctx = useMemo(() => (ds ? siapkan(ds, { tanggalData: TANGGAL_DATA }) : null), [ds]);
  const ind = useMemo(() => (ctx ? hitungIndikator(ctx, filter) : null), [ctx, filter]);
  const dokumen = useMemo(() => (ctx ? pilihDokumen(ctx, filter) : []), [ctx, filter]);
  const tahun = useMemo(
    () => (ctx ? [...new Set(ctx.dokumen.map((d) => d.tahun_dibuat))].sort((a, b) => b - a) : []),
    [ctx],
  );

  const unduh = useCallback(() => {
    const judulAsli = document.title;
    document.title = `Laporan KOMENS - ${TAB.find((t) => t.id === tab)?.label} - ${TANGGAL_DATA}`;
    const pulihkan = () => {
      document.title = judulAsli;
      window.removeEventListener('afterprint', pulihkan);
    };
    window.addEventListener('afterprint', pulihkan);
    window.print();
  }, [tab]);

  return (
    <>
      <Header tanggalData={TANGGAL_DATA} onUnduh={unduh} />
      <Bilah tab={tab} onTab={pindahTab} filter={filter} onFilter={setFilter} tahun={tahun} unit={ds?.unitKerja ?? []} />
      <main>
        {galat && (
          <div className="peringatan" role="alert">
            <b>Data gagal dimuat</b>
            <span>{galat}</span>
          </div>
        )}
        {!galat && (!ind || !ctx) && <div className="memuat">Memuat dan menghitung data…</div>}
        {ind && ctx && (
          <>
            <PeringatanData pemeriksaan={ind.pemeriksaan_data} ringkasan={ind.ringkasan} />
            <InfoFilter filter={filter} />
            {tab === 'ringkasan' && <Ringkasan ind={ind} filter={filter} onTab={pindahTab} />}
            {tab === 'alur' && <AlurKerja ind={ind} filter={filter} dokumen={dokumen} onDaftar={setDaftar} />}
            {tab === 'kualitas' && <Kualitas ind={ind} ctx={ctx} filter={filter} dokumen={dokumen} onDaftar={setDaftar} />}
            <Definisi pemeriksaan={ind.pemeriksaan_data} batasHk={ind.batas_tertahan_hari_kerja} />
          </>
        )}
      </main>
      <footer className="kaki">
        <span>
          Dasbor Monitoring KOMENS versi {VERSI} · Data per {tanggalPanjang(TANGGAL_DATA)}
        </span>
        {TAUTAN_MASUKAN && (
          <a className="tanpa-cetak" href={TAUTAN_MASUKAN} target="_blank" rel="noreferrer">
            Beri masukan tentang dasbor ini
          </a>
        )}
      </footer>
      <DaftarDokumen permintaan={daftar} onTutup={() => setDaftar(null)} />
    </>
  );
}
