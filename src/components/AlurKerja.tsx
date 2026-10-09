import { AMBANG_MENDEKATI_HK } from '../config';
import { useEffect, useState } from 'react';
import { angka, desimal, persen, rasio } from '../format';
import { statusWaktu, STATUS_PROSES, type DokumenSiap, type Filter, type Indikator } from '../indicators';
import { LABEL_TAHAP } from './Ringkasan';
import type { PermintaanDaftar } from './Umum';
import { ChipStatus, Ikon, JudulIkon, KotakIkon, type Nada, type NamaIkon } from './Ikon';

interface Props {
  ind: Indikator;
  filter: Filter;
  dokumen: DokumenSiap[];
  onDaftar: (p: PermintaanDaftar) => void;
}

const DESKRIPSI: Record<string, string> = {
  DRAFT: 'Disusun pengusul',
  OPERATOR_KONTEN: 'Pemeriksaan awal',
  PIC_UKE: 'Verifikasi unit kerja',
  TERVALIDASI: 'Menunggu publikasi',
};

const ketLama = (d: DokumenSiap) => (d.lama_hk == null ? '—' : `${d.lama_hk} hari kerja di tahap ini`);

export function AlurKerja({ ind, filter, dokumen, onDaftar }: Props) {
  if (filter.sumber === 'MENU_PROGRAM') {
    return (
      <section className="kartu">
        <h2>Kontrol alur kerja tidak berlaku untuk Menu Program</h2>
        <div className="kartu-sub">
          Menu Program tidak memiliki alur proses maupun UKE I/UKE II. Pilih sumber data "Entri" atau "Entri + Menu Program" untuk
          melihat tampilan ini.
        </div>
      </section>
    );
  }

  const hk = ind.batas_tertahan_hari_kerja;
  const r = ind.ringkasan;
  const totalEntri = r.entri;
  const pub = r.terpublikasi_entri;
  const tahap = STATUS_PROSES.map((s, i) => ({ s, n: i + 1, ...ind.tahap[s] }));
  const maks = Math.max(1, pub, ...tahap.map((t) => t.jumlah));
  const entri = dokumen.filter((d) => d.sumber === 'ENTRI');

  const terburuk = [...tahap].sort((a, b) => b.lebih_dari_5_hk - a.lebih_dari_5_hk)[0];
  const lainLewat = tahap.filter((t) => t.s !== terburuk.s && t.rata_rata_tertahan_hk != null && t.rata_rata_tertahan_hk > hk);
  const ditolak = entri.filter((d) => d.status_saat_ini === 'DITOLAK_OPERATOR' || d.status_saat_ini === 'DITOLAK_PIC');

  const aksi: { label: string; ikon: NamaIkon; nada: Nada; value: number; cta: string; daftar: PermintaanDaftar }[] = [
    {
      label: `Tertahan lebih dari ${hk} hari kerja di tahap ${LABEL_TAHAP[terburuk.s]}`,
      ikon: 'tertahan',
      nada: 'tertahan',
      value: terburuk.lebih_dari_5_hk,
      cta: `Lihat daftar untuk pengingat ${LABEL_TAHAP[terburuk.s]}`,
      daftar: {
        judul: `Tertahan lebih dari ${hk} hari kerja di tahap ${LABEL_TAHAP[terburuk.s]}`,
        catatan:
          terburuk.s === 'PIC_UKE'
            ? 'Kolom PIC tersedia pada berkas CSV. Pengiriman pengingat otomatis memerlukan integrasi dengan KOMENS dan belum tersedia pada versi statis ini.'
            : undefined,
        dokumen: entri.filter((d) => d.status_saat_ini === terburuk.s && d.lewat_batas).sort((a, b) => (b.lama_hk ?? 0) - (a.lama_hk ?? 0)),
        labelKeterangan: 'Lama tertahan',
        keterangan: ketLama,
      },
    },
    {
      label: 'Ditolak dan belum direvisi',
      ikon: 'ditolak',
      nada: 'perhatian',
      value: ditolak.length,
      cta: 'Lihat daftar dokumen',
      daftar: {
        judul: 'Ditolak dan belum direvisi',
        dokumen: ditolak,
        labelKeterangan: 'Ditolak oleh',
        keterangan: (d) => (d.status_saat_ini === 'DITOLAK_OPERATOR' ? 'Operator Konten' : 'PIC UKE'),
      },
    },
    {
      label: `Tervalidasi, belum dipublikasikan lebih dari ${hk} hari kerja`,
      ikon: 'TERVALIDASI',
      nada: 'proses',
      value: ind.tahap.TERVALIDASI.lebih_dari_5_hk,
      cta: 'Lihat daftar dokumen',
      daftar: {
        judul: `Tervalidasi, belum dipublikasikan lebih dari ${hk} hari kerja`,
        dokumen: entri.filter((d) => d.status_saat_ini === 'TERVALIDASI' && d.lewat_batas).sort((a, b) => (b.lama_hk ?? 0) - (a.lama_hk ?? 0)),
        labelKeterangan: 'Lama tertahan',
        keterangan: ketLama,
      },
    },
  ];

  return (
    <div className="tumpuk">
      <section className="kartu" aria-labelledby="judul-alur">
        <div>
          <JudulIkon nama="alur" id="judul-alur">
            Alur kerja entri: di mana dokumen tertahan?
          </JudulIkon>
          <div className="kartu-sub">
            {angka(totalEntri)} dokumen entri · batas maksimal tertahan di setiap tahap: <b>{hk} hari kerja</b> sejak perubahan
            status terakhir (tanpa akhir pekan dan hari libur)
          </div>
        </div>
        {tahap.map((t) => {
          const st = statusWaktu(t.rata_rata_tertahan_hk);
          const lewat = t.rata_rata_tertahan_hk != null && t.rata_rata_tertahan_hk > hk;
          return (
            <div key={t.s} className="baris-tahap">
              <div className="kepala">
                <span className="nomor" aria-hidden="true">
                  <Ikon nama={t.s} ukuran={18} />
                  <small>{t.n}</small>
                </span>
                <div>
                  <b>{LABEL_TAHAP[t.s]}</b>
                  <span>{DESKRIPSI[t.s]}</span>
                </div>
              </div>
              <div className="grafik">
                <div className="lintasan" aria-hidden="true">
                  <div className="isi-bar" style={{ width: `${(100 * t.jumlah) / maks}%`, background: lewat ? 'var(--perhatian)' : 'var(--biru-tahap)' }} />
                </div>
                <span className="jumlah">
                  <b>{angka(t.jumlah)}</b> · {rasio(t.jumlah, totalEntri)}
                </span>
              </div>
              <div className="ket">
                <b>
                  {angka(t.lebih_dari_5_hk)} dokumen &gt; {hk} hari kerja ({persen(t.persen_melewati)})
                </b>
                <span>
                  {t.rata_rata_tertahan_hk == null ? 'Tidak ada dokumen di tahap ini' : `Rata-rata tertahan ${desimal(t.rata_rata_tertahan_hk)} hari kerja`}
                </span>
              </div>
              <ChipStatus status={st} />
            </div>
          );
        })}
        <div className="baris-tahap">
          <div className="kepala">
            <span className="nomor" aria-hidden="true">
              <Ikon nama="PUBLISH" ukuran={18} />
              <small>5</small>
            </span>
            <div>
              <b>Publish</b>
              <span>Tayang di KOMENS</span>
            </div>
          </div>
          <div className="grafik">
            <div className="lintasan" aria-hidden="true">
              <div className="isi-bar" style={{ width: `${(100 * pub) / maks}%`, background: 'var(--utama)' }} />
            </div>
            <span className="jumlah">
              <b>{angka(pub)}</b> · {rasio(pub, totalEntri)}
            </span>
          </div>
          <div className="ket">
            <b>Selesai</b>
            <span>Mencapai {rasio(pub, totalEntri)} dari entri</span>
          </div>
          <ChipStatus status="Selesai" />
        </div>
        <div className="keluar pemisah">
          <b>Keluar dari alur:</b>
          <span className="ikon-teks">
            <Ikon nama="ditolak" ukuran={15} />
            Ditolak Operator Konten: <b>{angka(ind.status_entri.DITOLAK_OPERATOR ?? 0)}</b>
          </span>
          <span className="ikon-teks">
            <Ikon nama="ditolak" ukuran={15} />
            Ditolak PIC UKE: <b>{angka(ind.status_entri.DITOLAK_PIC ?? 0)}</b>
          </span>
          <span className="ikon-teks">
            <Ikon nama="unpublish" ukuran={15} />
            UnPublish: <b>{angka(ind.status_entri.UNPUBLISH ?? 0)}</b>
          </span>
        </div>
        {r.dalam_proses_entri > 0 && (
          <div className="catatan perhatian">
            <b>Catatan analis:</b> tahap {LABEL_TAHAP[terburuk.s]} memuat {angka(terburuk.jumlah)} dokumen, dan{' '}
            {angka(terburuk.lebih_dari_5_hk)} di antaranya ({persen(terburuk.persen_melewati)}) sudah melewati batas {hk} hari kerja
            dengan rata-rata tertahan {desimal(terburuk.rata_rata_tertahan_hk)} hari kerja.
            {lainLewat.length > 0 &&
              ` Tahap ${lainLewat.map((t) => `${LABEL_TAHAP[t.s]} (rata-rata ${desimal(t.rata_rata_tertahan_hk)} hari kerja)`).join(' dan ')} juga melewati batas.`}{' '}
            Secara keseluruhan {angka(r.tertahan_lebih_dari_5_hk)} dokumen tertahan lebih dari {hk} hari kerja.
          </div>
        )}
      </section>

      <section aria-label="Aksi cepat" className="aksi-cepat">
        {aksi.map((a) => (
          <div key={a.label} className="aksi" data-nada={a.nada}>
            <div className="kpi-kepala">
              <div className="label">{a.label}</div>
              <KotakIkon nama={a.ikon} nada={a.nada} />
            </div>
            <div className="n">{angka(a.value)}</div>
            <button type="button" className="tombol" onClick={() => onDaftar(a.daftar)}>
              {a.cta}
            </button>
          </div>
        ))}
      </section>

      <TabelUke ind={ind} />
    </div>
  );
}

function TabelUke({ ind }: { ind: Indikator }) {
  const hk = ind.batas_tertahan_hari_kerja;
  const kelompok = Object.entries(ind.uke1)
    .map(([nama, u]) => ({ nama, ...u }))
    .sort((a, b) => b.lebih_dari_5_hk - a.lebih_dari_5_hk || a.nama.localeCompare(b.nama, 'id'));
  const kunci = kelompok.map((k) => k.nama).join('|');
  const [terbuka, setTerbuka] = useState<Record<string, boolean>>({});
  // Saat isi tabel berubah (filter), buka UKE I teratas sebagai titik awal.
  useEffect(() => {
    setTerbuka(kelompok.length ? { [kelompok[0].nama]: true } : {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kunci]);

  const sel = (u: { total: number; publish: number; persen_publish: number | null; dalam_proses: number; lebih_dari_5_hk: number; rata_rata_tertahan_hk: number | null; status: string }) => (
    <>
      <span role="cell">{angka(u.total)}</span>
      <span role="cell" className="sel-persen">
        <span className="lintasan" aria-hidden="true">
          <span className="isi-bar" style={{ display: 'block', width: `${u.persen_publish ?? 0}%`, background: 'var(--utama)' }} />
        </span>
        <span>{persen(u.persen_publish)}</span>
      </span>
      <span role="cell">{angka(u.dalam_proses)}</span>
      <span role="cell" style={{ fontWeight: 700 }}>{angka(u.lebih_dari_5_hk)}</span>
      <span role="cell">{u.rata_rata_tertahan_hk == null ? '—' : `${desimal(u.rata_rata_tertahan_hk)} hari`}</span>
      <span role="cell">
        <ChipStatus status={u.status} />
      </span>
    </>
  );

  return (
    <section className="kartu" aria-labelledby="judul-tabel">
      <div className="kepala-tabel">
        <div>
          <JudulIkon nama="tertahan" id="judul-tabel">
            Ketepatan waktu per UKE I dan UKE II
          </JudulIkon>
          <div className="kartu-sub">
            Entri · diurutkan dari dokumen tertahan lebih dari {hk} hari kerja terbanyak · klik UKE I untuk membuka UKE II
          </div>
        </div>
        <div className="tombol-grup">
          <button type="button" className="tombol" onClick={() => setTerbuka(Object.fromEntries(kelompok.map((k) => [k.nama, true])))}>
            Buka semua
          </button>
          <button type="button" className="tombol" onClick={() => setTerbuka({})}>
            Tutup semua
          </button>
        </div>
      </div>
      <div className="keterangan-status">
        <span>Status mengikuti rata-rata lama tertahan:</span>
        <span>
          <b>Dalam batas</b> kurang dari {AMBANG_MENDEKATI_HK} hari kerja
        </span>
        <span>
          <b>Mendekati batas</b> {AMBANG_MENDEKATI_HK}–{hk} hari kerja
        </span>
        <span>
          <b>Melewati batas</b> lebih dari {hk} hari kerja
        </span>
        <span>
          <b>Tidak ada antrean</b> tanpa dokumen dalam proses
        </span>
      </div>
      <div className="gulir" tabIndex={0} aria-label="Tabel ketepatan waktu, dapat digulir ke samping">
        <div className="tabel-uke" role="table" aria-label="Ketepatan waktu per UKE I dan UKE II">
          <div role="row" className="judul-kolom">
            <span role="columnheader">Unit kerja</span>
            <span role="columnheader">Total</span>
            <span role="columnheader">Terpublikasi</span>
            <span role="columnheader">Dalam proses</span>
            <span role="columnheader">Tertahan lebih dari {hk} hari kerja</span>
            <span role="columnheader">Rata-rata tertahan (hari kerja)</span>
            <span role="columnheader">Status</span>
          </div>
          {kelompok.map((g) => {
            const buka = !!terbuka[g.nama];
            const anak = Object.entries(g.uke2)
              .map(([nama, u]) => ({ nama, ...u }))
              .sort((a, b) => b.lebih_dari_5_hk - a.lebih_dari_5_hk || a.nama.localeCompare(b.nama, 'id'));
            return (
              <div key={g.nama} role="rowgroup">
                <div role="row" className="induk">
                  <span role="rowheader" style={{ minWidth: 0 }}>
                    <button
                      type="button"
                      className="tombol-buka"
                      aria-expanded={buka}
                      onClick={() => setTerbuka((t) => ({ ...t, [g.nama]: !buka }))}
                    >
                      <span className="caret" aria-hidden="true">
                        {buka ? '▾' : '▸'}
                      </span>
                      <span>
                        <span style={{ display: 'block' }}>{g.nama}</span>
                        <small>{anak.length} UKE II</small>
                      </span>
                    </button>
                  </span>
                  {sel(g)}
                </div>
                {buka &&
                  anak.map((u) => (
                    <div key={u.nama} role="row" className="anak">
                      <span role="rowheader" style={{ minWidth: 0 }}>
                        <span className="nama-unit">{u.nama}</span>
                      </span>
                      {sel(u)}
                    </div>
                  ))}
              </div>
            );
          })}
          {!kelompok.length && <div className="catatan-kecil" style={{ padding: 8 }}>Tidak ada dokumen entri pada filter ini.</div>}
        </div>
      </div>
    </section>
  );
}
