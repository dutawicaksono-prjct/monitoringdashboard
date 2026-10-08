import { useState } from 'react';
import { angka, BULAN_PENDEK, desimal, namaBulan, persen, rasio, selisih, tanggalPanjang } from '../format';
import { bulatkan, STATUS_PROSES, type Filter, type Indikator } from '../indicators';
import { NAMA_DIMENSI } from './Kualitas';
import type { Tab } from './Umum';

const TARGET_POSISI = (t: number) => ({ left: `${t}%` });

interface Props {
  ind: Indikator;
  filter: Filter;
  onTab: (t: Tab) => void;
}

export function Ringkasan({ ind, filter, onTab }: Props) {
  const r = ind.ringkasan;
  const adaEntri = filter.sumber !== 'MENU_PROGRAM';
  const adaMenu = filter.sumber !== 'ENTRI' && !filter.uke1 && !filter.uke2;
  const target = ind.target_publikasi_persen;
  const hk = ind.batas_tertahan_hari_kerja;

  const gulirKe = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  // ---------------------------------------------------------------- perlu perhatian
  const wawasan: { k: string; t: string; a: string; go: () => void }[] = [];
  if (adaEntri && r.tertahan_lebih_dari_5_hk > 0) {
    const terburuk = STATUS_PROSES.map((s) => ({ s, ...ind.tahap[s] })).sort((a, b) => b.lebih_dari_5_hk - a.lebih_dari_5_hk)[0];
    wawasan.push({
      k: 'Alur kerja',
      t: `${angka(terburuk.lebih_dari_5_hk)} dokumen tertahan lebih dari ${hk} hari kerja di tahap ${LABEL_TAHAP[terburuk.s]}; secara total ${angka(r.tertahan_lebih_dari_5_hk)} dokumen melewati batas.`,
      a: 'Buka kontrol alur kerja',
      go: () => onTab('alur'),
    });
  }
  if (r.total_aset > 0) {
    wawasan.push({
      k: 'Target publikasi',
      t:
        r.kekurangan_menuju_target > 0
          ? `Capaian publish ${persen(r.persen_publish)} dari target ${target}%; masih kurang ${angka(r.kekurangan_menuju_target)} dokumen.`
          : `Capaian publish ${persen(r.persen_publish)}; target ${target}% sudah tercapai.`,
      a: adaEntri ? 'Lihat capaian per UKE I' : 'Lihat rekapitulasi',
      go: () => gulirKe(adaEntri ? 'capaian' : 'rekap'),
    });
  }
  const masalah = Object.entries(ind.kualitas.masalah).filter(([k]) => adaEntri || k !== 'tanpa_pic').sort((a, b) => b[1] - a[1])[0];
  const dimTerendah = Object.entries(ind.kualitas.skor_per_dimensi)
    .filter(([, v]) => v != null)
    .sort((a, b) => (a[1] as number) - (b[1] as number))[0];
  if (masalah && masalah[1] > 0) {
    wawasan.push({
      k: 'Kualitas metadata',
      t: `${angka(masalah[1])} dokumen ${LABEL_MASALAH_KALIMAT[masalah[0]]}${
        dimTerendah ? `; ${NAMA_DIMENSI[Number(dimTerendah[0].split('_')[1]) - 1].toLowerCase()} skor terendah (${desimal(dimTerendah[1])})` : ''
      }.`,
      a: 'Buka kualitas aset',
      go: () => onTab('kualitas'),
    });
  }

  // ---------------------------------------------------------------- KPI
  const pembanding = ind.snapshot_pembanding;
  const perubahan = ind.perubahan_dibanding_akhir_bulan_lalu;
  const teksPerubahan = (n: number | undefined) =>
    perubahan ? `${selisih(n)} dibanding akhir bulan lalu` : 'Dibanding akhir bulan lalu: —';
  const selisihTarget = r.persen_publish == null ? null : bulatkan(target - r.persen_publish, 1);

  const kpi = [
    {
      label: 'Total aset pengetahuan',
      value: angka(r.total_aset),
      sub: teksPerubahan(perubahan?.total_aset),
      note: `Entri ${angka(r.entri)} + Menu Program ${angka(r.menu_program)}`,
    },
    {
      label: 'Terpublikasi (gabungan)',
      value: angka(r.terpublikasi),
      bar: r.persen_publish ?? 0,
      sub: `${persen(r.persen_publish)} dari total · ${
        selisihTarget != null && selisihTarget > 0 ? `selisih ${desimal(selisihTarget)} poin dari target` : 'target tercapai'
      }`,
      note: `Entri ${angka(r.terpublikasi_entri)} + Program ${angka(r.terpublikasi_menu_program)} · kurang ${angka(r.kekurangan_menuju_target)} dokumen untuk mencapai ${target}%`,
    },
    ...(adaEntri
      ? [
          {
            label: 'Dalam proses (entri)',
            value: angka(r.dalam_proses_entri),
            sub: `${rasio(r.dalam_proses_entri, r.total_aset)} dari total`,
            note: 'Menu Program tidak memiliki alur proses',
          },
          {
            label: `Tertahan lebih dari ${hk} hari kerja`,
            value: angka(r.tertahan_lebih_dari_5_hk),
            sub: `${rasio(r.tertahan_lebih_dari_5_hk, r.dalam_proses_entri)} dari ${angka(r.dalam_proses_entri)} dokumen dalam proses`,
            note: `Entri · batas maksimal ${hk} hari kerja per tahap`,
          },
        ]
      : []),
    {
      label: 'Skor kualitas metadata',
      value: desimal(ind.kualitas.skor_rata_rata),
      unit: '/100',
      sub: 'Dibanding akhir bulan lalu: —',
      note: 'Rata-rata tujuh dimensi · snapshot skor belum tersedia',
    },
  ];

  return (
    <div className="tumpuk">
      {wawasan.length > 0 && (
        <section aria-labelledby="judul-perhatian" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <h2 id="judul-perhatian" className="label-bagian">
            Perlu perhatian
          </h2>
          <div className="wawasan">
            {wawasan.map((w) => (
              <button key={w.k} type="button" className="kartu-wawasan" onClick={w.go}>
                <span className="k">{w.k}</span>
                <span className="t">{w.t}</span>
                <span className="a">{w.a}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      <section aria-label="Indikator utama" className="kpi-baris">
        {kpi.map((k) => (
          <div key={k.label} className="kpi">
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-nilai">
              <span className="n">{k.value}</span>
              {k.unit && <span className="u">{k.unit}</span>}
            </div>
            {'bar' in k && k.bar !== undefined && (
              <>
                <div className="kpi-bar" role="img" aria-label={`Capaian ${persen(r.persen_publish)} dari target ${target}%`}>
                  <div className="lintasan">
                    <div className="isi-bar" style={{ width: `${k.bar}%`, background: 'var(--utama)' }} />
                  </div>
                  <div className="penanda-target" style={TARGET_POSISI(target)} />
                </div>
                <div className="kpi-target">Target {target}%</div>
              </>
            )}
            <div className="kpi-sub">{k.sub}</div>
            <div className="kpi-catatan">{k.note}</div>
          </div>
        ))}
      </section>
      {perubahan && pembanding && (
        <div className="catatan-kecil" style={{ marginTop: -12 }}>
          Pembanding: snapshot akhir bulan {tanggalPanjang(pembanding.tanggal_snapshot)}. Perubahan lain: terpublikasi{' '}
          {selisih(perubahan.terpublikasi)}, dalam proses {selisih(perubahan.dalam_proses_entri)}, tidak tayang{' '}
          {selisih(perubahan.tidak_tayang)}, tertahan lebih dari {hk} hari kerja {selisih(perubahan.tertahan_lebih_dari_5_hk)}.
        </div>
      )}

      {adaEntri && <CapaianUke1 ind={ind} />}
      <Rekap ind={ind} filter={filter} />

      <div className="baris-kartu">
        {adaEntri && <TrenBulanan ind={ind} />}
        {adaMenu && <MenuProgram ind={ind} />}
      </div>
    </div>
  );
}

export const LABEL_TAHAP: Record<string, string> = {
  DRAFT: 'Draft',
  OPERATOR_KONTEN: 'Operator Konten',
  PIC_UKE: 'PIC UKE',
  TERVALIDASI: 'Tervalidasi',
};

const LABEL_MASALAH_KALIMAT: Record<string, string> = {
  metadata_belum_lengkap: 'metadata wajib belum lengkap',
  tanpa_pic: 'tanpa PIC / pemilik',
  belum_diperbarui_12_bulan: 'belum diperbarui lebih dari 12 bulan',
  kandidat_duplikat: 'merupakan kandidat duplikat',
  file_tidak_terbaca: 'memiliki file tidak terbaca (OCR gagal)',
};

function CapaianUke1({ ind }: { ind: Indikator }) {
  const target = ind.target_publikasi_persen;
  const baris = Object.entries(ind.uke1)
    .map(([nama, u]) => ({ nama, ...u }))
    .sort((a, b) => (a.persen_publish ?? 0) - (b.persen_publish ?? 0) || a.nama.localeCompare(b.nama, 'id'));
  return (
    <section id="capaian" className="kartu" aria-labelledby="judul-capaian">
      <div>
        <h2 id="judul-capaian">Capaian publikasi per UKE I terhadap target {target}%</h2>
        <div className="kartu-sub">
          Dokumen entri (manual dan interoperabilitas tanpa kategori program), diurutkan dari capaian terendah. Menu Program tidak
          memiliki UKE I/UKE II karena dikategorikan menurut substansi.
        </div>
      </div>
      <div className="legenda">
        <span>
          <span className="swatch" style={{ background: 'var(--utama)' }} />
          Capaian 50% atau lebih
        </span>
        <span>
          <span className="swatch" style={{ background: 'var(--perhatian)' }} />
          Capaian di bawah 50%
        </span>
        <span>
          <span className="swatch-target" />
          Target {target}%
        </span>
      </div>
      {baris.map((g) => {
        const p = g.persen_publish ?? 0;
        const rendah = p < 50;
        return (
          <div key={g.nama} className="baris-capaian">
            <div className="nama">{g.nama}</div>
            <div className="grafik">
              <div className="bar" aria-hidden="true">
                <div className="lintasan">
                  <div className="isi-bar" style={{ width: `${p}%`, background: rendah ? 'var(--perhatian)' : 'var(--utama)' }} />
                </div>
                <div className="penanda-target" style={TARGET_POSISI(target)} />
              </div>
              <span className="angka">
                <b>{persen(g.persen_publish)}</b> · {angka(g.publish)} dari {angka(g.total)}
                {rendah && <span className="tanda-bawah">Di bawah 50%</span>}
              </span>
            </div>
          </div>
        );
      })}
      {!baris.length && <div className="catatan-kecil">Tidak ada dokumen entri pada filter ini.</div>}
    </section>
  );
}

function Rekap({ ind, filter }: { ind: Indikator; filter: Filter }) {
  const r = ind.ringkasan;
  const target = ind.target_publikasi_persen;
  const w = (x: number, t: number) => (t ? (100 * x) / t : 0);
  const semua = [
    {
      src: 'Entri',
      ada: filter.sumber !== 'MENU_PROGRAM',
      total: r.entri,
      pub: r.terpublikasi_entri,
      proses: r.dalam_proses_entri as number | null,
      prosesLabel: 'dalam proses',
      masalah: r.tidak_tayang_entri,
      masalahLabel: 'ditolak / UnPublish',
    },
    {
      src: 'Menu Program',
      ada: filter.sumber !== 'ENTRI' && !filter.uke1 && !filter.uke2,
      total: r.menu_program,
      pub: r.terpublikasi_menu_program,
      proses: null,
      prosesLabel: 'tanpa alur proses',
      masalah: r.tidak_tayang_menu_program,
      masalahLabel: 'UnPublish',
    },
    {
      src: 'Total KOMENS',
      ada: true,
      total: r.total_aset,
      pub: r.terpublikasi,
      proses: r.dalam_proses_entri,
      prosesLabel: 'dalam proses',
      masalah: r.tidak_tayang,
      masalahLabel: 'tidak tayang',
    },
  ].filter((x) => x.ada);
  const kontrolOk = r.total_aset === r.terpublikasi + r.dalam_proses_entri + r.tidak_tayang;
  const unpubProg = r.tidak_tayang_menu_program;

  return (
    <section id="rekap" className="kartu" aria-labelledby="judul-rekap">
      <div>
        <h2 id="judul-rekap">Rekapitulasi angka per sumber data</h2>
        <div className="kartu-sub">
          Total dokumen KOMENS = entri + Menu Program. Persentase publish dihitung terhadap total masing-masing sumber.
        </div>
      </div>
      <div className="legenda">
        <span>
          <span className="swatch" style={{ background: 'var(--utama)' }} />
          Terpublikasi
        </span>
        <span>
          <span className="swatch" style={{ background: 'var(--biru-muda)' }} />
          Dalam proses (hanya entri)
        </span>
        <span>
          <span className="swatch" style={{ background: 'var(--perhatian)' }} />
          Tidak tayang (ditolak / UnPublish)
        </span>
        <span>
          <span className="swatch-target" />
          Target publish {target}%
        </span>
      </div>
      {semua.map((x) => (
        <div key={x.src} className="baris-rekap">
          <div className="sumber">
            <b>{x.src}</b>
            <span>{angka(x.total)} dokumen</span>
          </div>
          <div className="grafik">
            <div className="bar" aria-hidden="true">
              <div className="lintasan">
                <div className="isi-bar" style={{ width: `${w(x.pub, x.total)}%`, background: 'var(--utama)' }} />
                <div className="isi-bar" style={{ width: `${w(x.proses ?? 0, x.total)}%`, background: 'var(--biru-muda)' }} />
                <div className="isi-bar" style={{ width: `${w(x.masalah, x.total)}%`, background: 'var(--perhatian)' }} />
              </div>
              <div className="penanda-target" style={TARGET_POSISI(target)} />
            </div>
            <div className="rincian">
              <span>
                <b>{angka(x.pub)}</b> publish ({rasio(x.pub, x.total)})
              </span>
              <span>
                <b>{x.proses == null ? '—' : angka(x.proses)}</b> {x.prosesLabel}
              </span>
              <span>
                <b>{angka(x.masalah)}</b> {x.masalahLabel}
              </span>
            </div>
          </div>
        </div>
      ))}
      <div className="catatan-kecil">
        Persamaan kontrol {kontrolOk ? 'terpenuhi' : 'TIDAK terpenuhi'}: total {angka(r.total_aset)}{' '}
        {kontrolOk ? '=' : '≠'} terpublikasi {angka(r.terpublikasi)} + dalam proses {angka(r.dalam_proses_entri)} + tidak tayang{' '}
        {angka(r.tidak_tayang)}.
      </div>
      {semua.some((x) => x.src === 'Menu Program') && unpubProg > 0 && (
        <div className="catatan perhatian">
          <b>Catatan analis:</b> Menu Program hanya memiliki status Publish dan UnPublish. Sebanyak {angka(unpubProg)} dokumen Menu
          Program berstatus UnPublish ({rasio(unpubProg, r.menu_program)})
          {r.kekurangan_menuju_target > 0
            ? `, setara ${rasio(Math.min(unpubProg, r.kekurangan_menuju_target), r.kekurangan_menuju_target)} dari kekurangan ${angka(r.kekurangan_menuju_target)} dokumen menuju target ${target}%`
            : ''}
          . Perlu dipastikan apakah dokumen tersebut memang sengaja tidak ditayangkan atau belum dipublikasikan.
        </div>
      )}
    </section>
  );
}

function TrenBulanan({ ind }: { ind: Indikator }) {
  const data = Object.entries(ind.dokumen_baru_per_bulan).map(([b, v]) => ({ m: Number(b.slice(5, 7)), b, v }));
  const bulanData = ind.tanggal_data.slice(0, 7);
  const tglData = Number(ind.tanggal_data.slice(8, 10));
  const maks = Math.max(1, ...data.map((d) => d.v));
  const TINGGI = 170;
  const rata = ind.rata_rata_bulanan_bulan_lengkap;
  const lengkap = data.filter((d) => d.b < bulanData);
  const totalTahun = data.reduce((a, d) => a + d.v, 0);
  const parsial = data.find((d) => d.b === bulanData);
  const awal = data[0];
  const akhir = data[data.length - 1];
  const lonjakan = rata ? lengkap.filter((d) => d.v >= 1.5 * rata).sort((a, b) => b.v - a.v) : [];
  const rentangLengkap = lengkap.length ? `${BULAN_PENDEK[lengkap[0].m - 1]}–${BULAN_PENDEK[lengkap[lengkap.length - 1].m - 1]}` : '';

  return (
    <section className="kartu" style={{ flex: '2 1 560px' }} aria-labelledby="judul-tren">
      <div>
        <h2 id="judul-tren">Dokumen baru per bulan, {ind.tahun_tren}</h2>
        <div className="kartu-sub">
          Entri · {angka(totalTahun)} dokumen baru {awal && akhir ? `${BULAN_PENDEK[awal.m - 1]}–${BULAN_PENDEK[akhir.m - 1]}` : ''}
          {parsial && ` · ${BULAN_PENDEK[parsial.m - 1]}* = parsial (s.d. ${tglData} ${BULAN_PENDEK[parsial.m - 1]})`}
        </div>
      </div>
      <div className="tren" role="img" aria-label={`Grafik batang dokumen baru per bulan tahun ${ind.tahun_tren}; rincian pada tabel berikut.`}>
        {rata != null && (
          <>
            <div className="garis-rata" style={{ bottom: (rata / maks) * TINGGI }} />
            <div className="label-rata" style={{ bottom: (rata / maks) * TINGGI + 4 }}>
              Rata-rata {rentangLengkap}: {desimal(rata)} per bulan
            </div>
          </>
        )}
        {data.map((d) => (
          <div key={d.b} className="kolom">
            <span>{angka(d.v)}</span>
            <div
              className="batang"
              style={{ height: Math.max(3, Math.round((d.v / maks) * TINGGI)), background: d.b === bulanData ? 'var(--biru-muda)' : 'var(--utama)' }}
            />
          </div>
        ))}
      </div>
      <div className="label-bulan" aria-hidden="true">
        {data.map((d) => (
          <div key={d.b}>
            {BULAN_PENDEK[d.m - 1]}
            {d.b === bulanData ? '*' : ''}
          </div>
        ))}
      </div>
      <table className="sr-only">
        <caption>Dokumen baru per bulan {ind.tahun_tren}</caption>
        <tbody>
          {data.map((d) => (
            <tr key={d.b}>
              <th scope="row">
                {namaBulan(d.m)}
                {d.b === bulanData ? ' (parsial)' : ''}
              </th>
              <td>{d.v}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="catatan">
        <b>Catatan analis:</b>{' '}
        {lonjakan.length
          ? `lonjakan ${lonjakan.map((d) => `${namaBulan(d.m)} (${angka(d.v)})`).join(' dan ')} jauh di atas rata-rata (1,5 kali atau lebih). Perlu ditelusuri apakah berasal dari impor massal atau kinerja entri yang sebenarnya, agar tren tidak disalahartikan.`
          : 'tidak ada bulan dengan jumlah dokumen baru 1,5 kali rata-rata atau lebih.'}
      </div>
    </section>
  );
}

function MenuProgram({ ind }: { ind: Indikator }) {
  const [sembunyikanTeratas, setSembunyikan] = useState(false);
  const semua = Object.entries(ind.dokumen_per_menu_program).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'id'));
  const total = semua.reduce((a, [, v]) => a + v, 0);
  const TAMPIL = 6;
  const baris: [string, number][] = semua.slice(0, TAMPIL);
  const sisa = semua.slice(TAMPIL);
  if (sisa.length) baris.push([`${sisa.length} menu lainnya`, sisa.reduce((a, [, v]) => a + v, 0)]);
  const teratas = semua[0];
  const dominan = teratas && total ? teratas[1] / total >= 0.5 : false;
  const tampil = sembunyikanTeratas && dominan ? baris.filter(([n]) => n !== teratas[0]) : baris;
  const maks = Math.max(1, ...tampil.map(([, v]) => v));

  return (
    <section className="kartu" style={{ flex: '1 1 380px' }} aria-labelledby="judul-menu">
      <div>
        <h2 id="judul-menu">Dokumen per Menu Program</h2>
        <div className="kartu-sub">Total {angka(total)} dokumen · diurutkan dari terbanyak</div>
      </div>
      {dominan && (
        <button type="button" className="tombol" aria-pressed={sembunyikanTeratas} onClick={() => setSembunyikan((s) => !s)}>
          {sembunyikanTeratas ? `Tampilkan ${teratas[0]} kembali` : `Sembunyikan ${teratas[0]} (skala terpisah)`}
        </button>
      )}
      <div className="daftar-bar">
        {tampil.map(([nama, v]) => (
          <div key={nama} className="baris-bar grid-menu">
            <span className="nama">{nama}</span>
            <div className="lintasan" aria-hidden="true">
              <div className="isi-bar" style={{ width: `${(100 * v) / maks}%`, background: 'var(--utama)' }} />
            </div>
            <span className="nilai">
              <b>{angka(v)}</b> · {rasio(v, total)}
            </span>
          </div>
        ))}
        {!tampil.length && <div className="catatan-kecil">Tidak ada dokumen Menu Program pada filter ini.</div>}
      </div>
      {sisa.length > 0 && (
        <div className="catatan-kecil">
          Menu lainnya: {sisa.map(([n, v]) => `${n} (${angka(v)})`).join(', ')}.
        </div>
      )}
      {dominan && (
        <div className="catatan">
          <b>Catatan analis:</b> {teratas[0]} menyumbang {rasio(teratas[1], total)} dokumen Menu Program, sehingga menu lain tampak
          nyaris tak terlihat jika digabung. Gunakan tombol di atas untuk skala terpisah.
        </div>
      )}
    </section>
  );
}
