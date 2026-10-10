import { useEffect, useRef } from 'react';
import { DATA_CONTOH, TARGET_PUBLIKASI_PERSEN } from '../config';
import { angka, LABEL_STATUS, LABEL_SUMBER, tanggalPanjang } from '../format';
import { Ikon, JudulIkon } from './Ikon';
import { LABEL_PEMERIKSAAN, type DokumenSiap, type Filter, type PemeriksaanData, type Ringkasan, type UnitKerja } from '../indicators';

export type Tab = 'ringkasan' | 'alur' | 'kualitas';
export const TAB: { id: Tab; label: string }[] = [
  { id: 'ringkasan', label: 'Ringkasan Pimpinan' },
  { id: 'alur', label: 'Kontrol Alur Kerja' },
  { id: 'kualitas', label: 'Kualitas Aset' },
];

export function Header({ tanggalData, onUnduh }: { tanggalData: string; onUnduh: () => void }) {
  return (
    <header className="header">
      <div className="header-isi">
        <div>
          <div className="remah">Pengetahuan Anda › Dasbor Monitoring</div>
          <h1>Monitoring Aset Pengetahuan KOMENS</h1>
          <div className="header-sub">
            Pusdatinrenbang · Tim Pengelolaan Informasi dan Pengetahuan · Data per {tanggalPanjang(tanggalData)}
          </div>
        </div>
        <div className="header-aksi">
          {DATA_CONTOH && (
            <span className="lencana">
              <Ikon nama="dataContoh" ukuran={14} />
              Data contoh · ilustrasi
            </span>
          )}
          <button type="button" className="tombol-header" onClick={onUnduh}>
            <Ikon nama="unduh" ukuran={16} />
            Unduh laporan
          </button>
        </div>
      </div>
    </header>
  );
}

export function deskripsiFilter(f: Filter): string {
  const bagian = [
    f.periode === 'SEMUA' ? 'Seluruh periode' : `Dokumen dibuat tahun ${f.periode}`,
    f.uke1 ?? 'Semua UKE I',
    f.uke2 ?? 'Semua UKE II',
    f.sumber === 'SEMUA' ? 'Entri + Menu Program' : LABEL_SUMBER[f.sumber],
  ];
  return bagian.join(' · ');
}

interface BilahProps {
  tab: Tab;
  onTab: (t: Tab) => void;
  filter: Filter;
  onFilter: (f: Filter) => void;
  tahun: number[];
  unit: UnitKerja[];
  onSalinTautan: () => void;
  tersalin: boolean;
}

export function Bilah({ tab, onTab, filter, onFilter, tahun, unit, onSalinTautan, tersalin }: BilahProps) {
  const daftarUke1 = [...new Set(unit.map((u) => u.uke1))];
  const daftarUke2 = filter.uke1 ? unit.filter((u) => u.uke1 === filter.uke1) : unit;
  const ukeNonaktif = filter.sumber === 'MENU_PROGRAM';
  return (
    <div className="bilah">
      <div className="bilah-isi">
        <nav className="tab-nav" aria-label="Tampilan dasbor">
          {TAB.map((t) => (
            <button
              key={t.id}
              type="button"
              className="tab"
              aria-current={tab === t.id ? 'page' : undefined}
              onClick={() => onTab(t.id)}
            >
              <Ikon nama={t.id} ukuran={17} />
              {t.label}
            </button>
          ))}
        </nav>
        <div className="filter" role="group" aria-label="Filter">
          <label>
            Periode
            <select
              value={String(filter.periode)}
              onChange={(e) => onFilter({ ...filter, periode: e.target.value === 'SEMUA' ? 'SEMUA' : Number(e.target.value) })}
            >
              <option value="SEMUA">Seluruh periode</option>
              {tahun.map((y) => (
                <option key={y} value={y}>
                  Tahun {y}
                </option>
              ))}
            </select>
          </label>
          <label>
            UKE I
            <select
              value={filter.uke1 ?? ''}
              disabled={ukeNonaktif}
              onChange={(e) => onFilter({ ...filter, uke1: e.target.value || null, uke2: null })}
            >
              <option value="">Semua UKE I</option>
              {daftarUke1.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </label>
          <label>
            UKE II
            <select
              value={filter.uke2 ?? ''}
              disabled={ukeNonaktif}
              onChange={(e) => {
                const u2 = e.target.value || null;
                const induk = u2 ? unit.find((u) => u.uke2 === u2)?.uke1 ?? filter.uke1 : filter.uke1;
                onFilter({ ...filter, uke1: induk, uke2: u2 });
              }}
            >
              <option value="">Semua UKE II</option>
              {daftarUke2.map((u) => (
                <option key={u.uke2} value={u.uke2}>
                  {u.uke2}
                </option>
              ))}
            </select>
          </label>
          <label>
            Sumber data
            <select
              value={filter.sumber}
              onChange={(e) => {
                const sumber = e.target.value as Filter['sumber'];
                onFilter(sumber === 'MENU_PROGRAM' ? { ...filter, sumber, uke1: null, uke2: null } : { ...filter, sumber });
              }}
            >
              <option value="SEMUA">Entri + Menu Program</option>
              <option value="ENTRI">Entri</option>
              <option value="MENU_PROGRAM">Menu Program</option>
            </select>
          </label>
          <button type="button" className="tombol tombol-tautan" onClick={onSalinTautan}>
            <Ikon nama="tautan" ukuran={16} />
            {tersalin ? 'Tautan tersalin' : 'Salin tautan tampilan ini'}
          </button>
          <span className="sr-only" role="status">
            {tersalin ? 'Tautan tampilan ini sudah disalin ke papan klip.' : ''}
          </span>
        </div>
        <div className="hanya-cetak catatan-kecil" style={{ padding: '8px 0' }}>
          Tampilan: {TAB.find((t) => t.id === tab)?.label} · Filter: {deskripsiFilter(filter)}
        </div>
      </div>
    </div>
  );
}

export function InfoFilter({ filter }: { filter: Filter }) {
  if (filter.sumber === 'MENU_PROGRAM') {
    return (
      <div className="info-filter" role="status">
        Sumber data Menu Program dipilih: blok yang bergantung pada dokumen entri (alur kerja, tertahan, capaian per UKE I,
        dokumen baru per bulan) disembunyikan karena Menu Program tidak memiliki alur proses maupun UKE I/UKE II.
      </div>
    );
  }
  if (filter.uke1 || filter.uke2) {
    return (
      <div className="info-filter" role="status">
        Filter unit kerja aktif: hanya dokumen entri yang dihitung, karena Menu Program tidak memiliki atribusi UKE I/UKE II.
      </div>
    );
  }
  return null;
}

/** Peringatan pemeriksaan data (bagian 8.2) dan persamaan kontrol pada tampilan aktif. */
export function PeringatanData({ pemeriksaan, ringkasan }: { pemeriksaan: PemeriksaanData; ringkasan: Ringkasan }) {
  const gagal = (Object.keys(pemeriksaan) as (keyof PemeriksaanData)[]).filter((k) => !pemeriksaan[k]);
  const kontrolOk = ringkasan.total_aset === ringkasan.terpublikasi + ringkasan.dalam_proses_entri + ringkasan.tidak_tayang;
  if (!gagal.length && kontrolOk) return null;
  return (
    <div className="peringatan" role="alert">
      <b>Peringatan: data tidak lolos pemeriksaan</b>
      <ul>
        {gagal.map((k) => (
          <li key={k}>Tidak terpenuhi: {LABEL_PEMERIKSAAN[k]}.</li>
        ))}
        {!kontrolOk && (
          <li>
            Persamaan kontrol tidak terpenuhi pada tampilan ini: total {angka(ringkasan.total_aset)} ≠ terpublikasi{' '}
            {angka(ringkasan.terpublikasi)} + dalam proses {angka(ringkasan.dalam_proses_entri)} + tidak tayang{' '}
            {angka(ringkasan.tidak_tayang)}.
          </li>
        )}
      </ul>
      <span>Angka pada dasbor mungkin tidak akurat sampai data diperbaiki.</span>
    </div>
  );
}

export function Definisi({ pemeriksaan, batasHk }: { pemeriksaan: PemeriksaanData; batasHk: number }) {
  const kunci = Object.keys(pemeriksaan) as (keyof PemeriksaanData)[];
  const lolos = kunci.filter((k) => pemeriksaan[k]).length;
  return (
    <section className="kartu definisi" aria-labelledby="judul-definisi">
      <JudulIkon nama="definisi" id="judul-definisi">
        Definisi indikator
      </JudulIkon>
      <div className="definisi-isi">
        <div>
          <b>Entri:</b> dokumen yang diinput langsung oleh pengguna atau masuk lewat interoperabilitas tanpa kategori program.
          Menjadi dasar atribusi UKE I dan UKE II serta memiliki alur proses.
        </div>
        <div>
          <b>Menu Program:</b> pemetaan kategori program pada aplikasi KOMENS; diisi manual atau lewat interoperabilitas data dari
          aplikasi lain. Tidak memiliki UKE I/UKE II maupun alur proses; hanya berstatus Publish atau UnPublish.
        </div>
        <div>
          <b>Dokumen KOMENS (total aset):</b> seluruh dokumen, baik yang dalam proses entri, Menu Program, maupun yang sudah
          publish. Dokumen UnPublish tetap dihitung.
        </div>
        <div>
          <b>Terpublikasi (gabungan):</b> publish dari entri ditambah publish dari Menu Program.
        </div>
        <div>
          <b>Tidak tayang:</b> entri yang ditolak (Operator Konten atau PIC UKE) atau UnPublish, ditambah Menu Program UnPublish.
          Total = terpublikasi + dalam proses (entri) + tidak tayang.
        </div>
        <div>
          <b>Target publikasi:</b> {TARGET_PUBLIKASI_PERSEN}% dari total dokumen KOMENS berstatus publish. Kekurangan = pembulatan
          ke atas {TARGET_PUBLIKASI_PERSEN}% × total, dikurangi terpublikasi.
        </div>
        <div>
          <b>Tertahan lebih dari {batasHk} hari kerja:</b> dokumen dalam proses yang sudah lebih dari {batasHk} hari kerja (tanpa
          akhir pekan dan hari libur) sejak perubahan status terakhir; batas maksimal per tahap. Hari perubahan status tidak
          dihitung, tanggal data dihitung.
        </div>
        <div>
          <b>Periode:</b> tahun dokumen dibuat. "Seluruh periode" mencakup semua dokumen sampai tanggal data. Perubahan dibanding
          akhir bulan lalu hanya tersedia untuk seluruh periode tanpa filter, karena snapshot bulanan hanya berisi angka total.
        </div>
      </div>
      <details className="tanpa-cetak">
        <summary className="ikon-teks">
          <Ikon nama="pemeriksaan" ukuran={16} />
          Pemeriksaan data: {lolos} dari {kunci.length} terpenuhi
        </summary>
        <ul className="daftar-periksa">
          {kunci.map((k) => (
            <li key={k}>
              <span className={pemeriksaan[k] ? 'ok' : 'gagal'}>{pemeriksaan[k] ? 'Terpenuhi' : 'Tidak terpenuhi'}</span> ·{' '}
              {LABEL_PEMERIKSAAN[k]}
            </li>
          ))}
        </ul>
      </details>
      <div className="hanya-cetak catatan-kecil">
        Pemeriksaan data: {lolos} dari {kunci.length} terpenuhi.
      </div>
    </section>
  );
}

// ------------------------------------------------------------------ daftar dokumen

export interface PermintaanDaftar {
  judul: string;
  catatan?: string;
  dokumen: DokumenSiap[];
  labelKeterangan: string;
  keterangan: (d: DokumenSiap) => string;
}

const MAKS_BARIS = 200;

function keCsv(p: PermintaanDaftar): string {
  const esc = (s: string) => `"${String(s).replace(/"/g, '""')}"`;
  const kepala = ['dokumen_id', 'judul', 'sumber', 'uke1', 'uke2', 'menu_program', 'pic_uke', 'status', p.labelKeterangan];
  const baris = p.dokumen.map((d) =>
    [d.dokumen_id, d.judul, LABEL_SUMBER[d.sumber] ?? d.sumber, d.uke1, d.uke2, d.menu_program, d.pic_uke, LABEL_STATUS[d.status_saat_ini] ?? d.status_saat_ini, p.keterangan(d)]
      .map(esc)
      .join(','),
  );
  return '\uFEFF' + [kepala.map(esc).join(','), ...baris].join('\r\n');
}

export function DaftarDokumen({ permintaan, onTutup }: { permintaan: PermintaanDaftar | null; onTutup: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dlg = ref.current;
    if (!dlg) return;
    if (permintaan && !dlg.open) dlg.showModal();
    if (!permintaan && dlg.open) dlg.close();
  }, [permintaan]);

  const unduh = () => {
    if (!permintaan) return;
    const blob = new Blob([keCsv(permintaan)], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `daftar-${permintaan.judul.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const p = permintaan;
  return (
    <dialog ref={ref} className="daftar" onClose={onTutup} aria-labelledby="judul-daftar">
      {p && (
        <div className="dialog-isi">
          <div className="dialog-kepala">
            <div>
              <h2 id="judul-daftar">{p.judul}</h2>
              <div className="kartu-sub">
                {angka(p.dokumen.length)} dokumen
                {p.dokumen.length > MAKS_BARIS && ` · menampilkan ${MAKS_BARIS} pertama; unduh CSV untuk daftar lengkap`}
              </div>
            </div>
            <div className="dialog-tombol">
              <button type="button" className="tombol" onClick={unduh} disabled={!p.dokumen.length}>
                Unduh CSV
              </button>
              <button type="button" className="tombol" onClick={onTutup} autoFocus>
                Tutup
              </button>
            </div>
          </div>
          {p.catatan && <div className="catatan">{p.catatan}</div>}
          <div className="gulir">
            <table className="tabel-dok">
              <thead>
                <tr>
                  <th scope="col">ID</th>
                  <th scope="col">Judul</th>
                  <th scope="col">UKE II / Menu Program</th>
                  <th scope="col">Status</th>
                  <th scope="col">{p.labelKeterangan}</th>
                </tr>
              </thead>
              <tbody>
                {p.dokumen.slice(0, MAKS_BARIS).map((d) => (
                  <tr key={d.dokumen_id}>
                    <td>{d.dokumen_id}</td>
                    <td>{d.judul}</td>
                    <td>{d.sumber === 'ENTRI' ? d.uke2 : `Menu Program · ${d.menu_program}`}</td>
                    <td>{LABEL_STATUS[d.status_saat_ini] ?? d.status_saat_ini}</td>
                    <td>{p.keterangan(d)}</td>
                  </tr>
                ))}
                {!p.dokumen.length && (
                  <tr>
                    <td colSpan={5}>Tidak ada dokumen.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </dialog>
  );
}
