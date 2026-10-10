import { useCallback, useEffect, useMemo, useState } from 'react';
import { DATA_CONTOH, TANGGAL_DATA, TAUTAN_MASUKAN } from './config';
import { version as VERSI } from '../package.json';
import { tanggalPanjang } from './format';
import { hitungIndikator, pilihDokumen, siapkan, type Filter, type UnitKerja } from './indicators';
import { muatDataset, type HasilMuat } from './muatData';
import { AlurKerja } from './components/AlurKerja';
import { Kualitas } from './components/Kualitas';
import { Ringkasan } from './components/Ringkasan';
import { Bilah, DaftarDokumen, Definisi, Header, InfoFilter, PeringatanData, TAB, type PermintaanDaftar, type Tab } from './components/Umum';

const TAB_VALID = new Set(TAB.map((t) => t.id));

function tabDariHash(): Tab {
  const h = window.location.hash.replace('#', '') as Tab;
  return TAB_VALID.has(h) ? h : 'ringkasan';
}

/** Filter dari query string (?periode=2026&uke1=...&uke2=...&sumber=ENTRI), agar tampilan dapat dibagikan lewat tautan. */
function filterDariUrl(): Filter {
  const q = new URLSearchParams(window.location.search);
  const periode = q.get('periode');
  const sumber = q.get('sumber');
  return {
    periode: periode && /^\d{4}$/.test(periode) ? Number(periode) : 'SEMUA',
    uke1: q.get('uke1') || null,
    uke2: q.get('uke2') || null,
    sumber: sumber === 'ENTRI' || sumber === 'MENU_PROGRAM' ? sumber : 'SEMUA',
  };
}

/** Buang nilai filter yang tidak dikenal (mis. tautan lama setelah perubahan nomenklatur) dan selaraskan UKE I dengan UKE II. */
function rapikanFilter(f: Filter, unit: UnitKerja[], tahun: number[]): Filter {
  const induk = f.uke2 ? unit.find((u) => u.uke2 === f.uke2)?.uke1 : undefined;
  const uke2 = induk ? f.uke2 : null;
  const uke1 = induk ?? (f.uke1 && unit.some((u) => u.uke1 === f.uke1) ? f.uke1 : null);
  const periode = f.periode !== 'SEMUA' && tahun.includes(f.periode) ? f.periode : 'SEMUA';
  return f.sumber === 'MENU_PROGRAM' ? { periode, uke1: null, uke2: null, sumber: f.sumber } : { periode, uke1, uke2, sumber: f.sumber };
}

function urlUntuk(f: Filter, t: Tab): string {
  const q = new URLSearchParams();
  if (f.periode !== 'SEMUA') q.set('periode', String(f.periode));
  if (f.uke1) q.set('uke1', f.uke1);
  if (f.uke2) q.set('uke2', f.uke2);
  if (f.sumber !== 'SEMUA') q.set('sumber', f.sumber);
  const qs = q.toString();
  return `${window.location.pathname}${qs ? `?${qs}` : ''}#${t}`;
}

/** Selisih hari kalender antara tanggal data dan hari ini (WIB). */
function umurData(tanggalData: string): number {
  const hariIni = new Date(Date.now() + 7 * 3_600_000).toISOString().slice(0, 10);
  return Math.round((Date.parse(`${hariIni}T00:00:00Z`) - Date.parse(`${tanggalData}T00:00:00Z`)) / 86_400_000);
}
const BATAS_UMUR_DATA_HARI = 35;

export function App() {
  const [muat, setMuat] = useState<HasilMuat | null>(null);
  const ds = muat?.ds ?? null;
  const tanggalData = muat?.tanggalData ?? TANGGAL_DATA;
  const [galat, setGalat] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>(tabDariHash);
  const [filter, setFilterMentah] = useState<Filter>(filterDariUrl);
  const [tersalin, setTersalin] = useState(false);
  const [daftar, setDaftar] = useState<PermintaanDaftar | null>(null);

  useEffect(() => {
    muatDataset().then(setMuat, (e: unknown) => setGalat(e instanceof Error ? e.message : String(e)));
  }, []);

  useEffect(() => {
    const onHash = () => {
      setTab(tabDariHash());
      setFilterMentah(filterDariUrl());
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const ctx = useMemo(() => (ds ? siapkan(ds, { tanggalData }) : null), [ds, tanggalData]);
  const ind = useMemo(() => (ctx ? hitungIndikator(ctx, filter) : null), [ctx, filter]);
  const dokumen = useMemo(() => (ctx ? pilihDokumen(ctx, filter) : []), [ctx, filter]);
  const tahun = useMemo(
    () => (ctx ? [...new Set(ctx.dokumen.map((d) => d.tahun_dibuat))].sort((a, b) => b - a) : []),
    [ctx],
  );

  // Setelah data dimuat, buang nilai filter dari tautan yang tidak dikenal.
  useEffect(() => {
    if (ds) setFilterMentah((f) => rapikanFilter(f, ds.unitKerja, tahun));
  }, [ds, tahun]);

  // Tab dan filter selalu tercermin di URL sehingga tautan dapat dibagikan atau disimpan.
  useEffect(() => {
    const url = urlUntuk(filter, tab);
    if (url !== `${window.location.pathname}${window.location.search}${window.location.hash}`) history.replaceState(null, '', url);
  }, [filter, tab]);

  const setFilter = useCallback((f: Filter) => {
    setFilterMentah(f);
    setTersalin(false);
  }, []);

  const pindahTab = useCallback((t: Tab) => {
    setTab(t);
    setTersalin(false);
    window.scrollTo({ top: 0 });
  }, []);

  const salinTautan = useCallback(() => {
    const url = window.location.href;
    const selesai = () => setTersalin(true);
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(url).then(selesai, () => window.prompt('Salin tautan ini:', url));
    else window.prompt('Salin tautan ini:', url);
  }, []);

  const unduh = useCallback(() => {
    const judulAsli = document.title;
    document.title = `Laporan KOMENS - ${TAB.find((t) => t.id === tab)?.label} - ${tanggalData}`;
    const pulihkan = () => {
      document.title = judulAsli;
      window.removeEventListener('afterprint', pulihkan);
    };
    window.addEventListener('afterprint', pulihkan);
    window.print();
  }, [tab, tanggalData]);

  return (
    <>
      <Header tanggalData={tanggalData} onUnduh={unduh} />
      <Bilah
        tab={tab}
        onTab={pindahTab}
        filter={filter}
        onFilter={setFilter}
        tahun={tahun}
        unit={ds?.unitKerja ?? []}
        onSalinTautan={salinTautan}
        tersalin={tersalin}
      />
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
            {!DATA_CONTOH && umurData(tanggalData) > BATAS_UMUR_DATA_HARI && (
              <div className="peringatan" role="alert">
                <b>Data sudah {umurData(tanggalData)} hari</b>
                <span>
                  Tanggal data {tanggalPanjang(tanggalData)} lebih lama dari {BATAS_UMUR_DATA_HARI} hari. Perbarui ekspor KOMENS sesuai
                  prosedur bulanan (docs/panduan-data.md).
                </span>
              </div>
            )}
            <InfoFilter filter={filter} />
            {tab === 'ringkasan' && <Ringkasan ind={ind} filter={filter} dokumen={dokumen} snapshot={ctx.ds.snapshot} onTab={pindahTab} />}
            {tab === 'alur' && <AlurKerja ind={ind} filter={filter} dokumen={dokumen} onDaftar={setDaftar} />}
            {tab === 'kualitas' && <Kualitas ind={ind} ctx={ctx} filter={filter} dokumen={dokumen} onDaftar={setDaftar} />}
            <Definisi pemeriksaan={ind.pemeriksaan_data} batasHk={ind.batas_tertahan_hari_kerja} />
          </>
        )}
      </main>
      <footer className="kaki">
        <span>
          Dasbor Monitoring KOMENS versi {VERSI} · Data per {tanggalPanjang(tanggalData)}
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
