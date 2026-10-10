// Bagian "Konsistensi tagging" pada tampilan Kualitas Aset (spesifikasi 1.4, bagian 4.4 dan 5.2).
import { useMemo, useState } from 'react';
import { angka, persen, rasio } from '../format';
import { kandidatKeCsv, normalTag, type DokumenSiap, type Konteks, type KonsepTag, type StatistikTag, type StatusTag } from '../indicators';
import { Ikon, JudulIkon } from './Ikon';
import type { PermintaanDaftar } from './Umum';

export const LABEL_STATUS_TAG: Record<StatusTag, string> = {
  baku: 'Baku',
  padanan_bahasa: 'Padanan bahasa Inggris',
  varian: 'Tidak baku',
  belum_di_kamus: 'Belum di kamus',
};

const WARNA_STATUS_TAG: Record<StatusTag, string> = {
  baku: 'var(--utama)',
  padanan_bahasa: 'var(--biru-muda)',
  varian: 'var(--perhatian)',
  belum_di_kamus: 'var(--garis-input)',
};

const URUT_STATUS: StatusTag[] = ['baku', 'padanan_bahasa', 'varian', 'belum_di_kamus'];

type Saring = 'semua' | 'varian' | 'belum' | 'bahasa';
const LABEL_SARING: Record<Saring, string> = {
  semua: 'Semua tag',
  varian: 'Ada bentuk tidak baku',
  belum: 'Belum di kamus',
  bahasa: 'Ada padanan bahasa Inggris',
};
const TAMPIL = 15;

/** Label satu bentuk: status dan, untuk bentuk tidak baku, jenisnya menurut kamus. */
export function labelBentuk(status: StatusTag, jenis: string): string {
  return status === 'varian' && jenis ? `${LABEL_STATUS_TAG.varian} (${jenis})` : LABEL_STATUS_TAG[status];
}

interface Props {
  q: StatistikTag;
  ctx: Konteks;
  dokumen: DokumenSiap[];
  onDaftar: (p: PermintaanDaftar) => void;
}

export function KonsistensiTag({ q, ctx, dokumen, onDaftar }: Props) {
  const [cari, setCari] = useState('');
  const [saring, setSaring] = useState<Saring>('semua');
  const [semua, setSemua] = useState(false);

  const konsep = useMemo(
    () =>
      Object.entries(q.per_konsep)
        .map(([nama, k]) => ({ nama, ...k, bentukUrut: Object.entries(k.bentuk).sort((a, b) => b[1].penggunaan - a[1].penggunaan) }))
        .sort((a, b) => b.penggunaan - a.penggunaan || a.nama.localeCompare(b.nama, 'id')),
    [q],
  );
  const kunciCari = normalTag(cari);
  const baris = konsep.filter((k) => {
    const st = k.bentukUrut.map(([, b]) => b.status);
    if (saring === 'varian' && !st.includes('varian')) return false;
    if (saring === 'belum' && !st.includes('belum_di_kamus')) return false;
    if (saring === 'bahasa' && !st.includes('padanan_bahasa')) return false;
    return !kunciCari || normalTag(k.nama).includes(kunciCari) || k.bentukUrut.some(([n]) => n.includes(kunciCari));
  });
  const tampil = semua ? baris : baris.slice(0, TAMPIL);

  const terendah = konsep
    .filter((k) => k.persen_konsistensi !== null && k.bentukUrut.some(([, b]) => b.status === 'varian'))
    .sort((a, b) => (a.persen_konsistensi as number) - (b.persen_konsistensi as number))[0];
  const variTerendah = terendah?.bentukUrut.find(([, b]) => b.status === 'varian')?.[1];

  const daftarKonsep = (nama: string, k: KonsepTag) => {
    const tagDok = (d: DokumenSiap) => (ctx.tag?.perDokumen.get(d.dokumen_id) ?? []).filter((p) => p.konsep === nama);
    onDaftar({
      judul: `Dokumen bertag "${nama}"`,
      catatan: `${angka(k.dokumen)} dokumen · ${Object.keys(k.bentuk).length} bentuk penulisan`,
      dokumen: dokumen.filter((d) => tagDok(d).length > 0),
      labelKeterangan: 'Tag yang dipakai',
      keterangan: (d) => tagDok(d).map((p) => `${p.tulisan} (${labelBentuk(p.status, p.jenis).toLowerCase()})`).join('; '),
    });
  };

  const unduhKandidat = () => {
    const url = URL.createObjectURL(new Blob([kandidatKeCsv(q.kandidat_padanan)], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'kandidat_kamus_tag.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const dipakai = q.penggunaan_tag;
  return (
    <section className="kartu" aria-labelledby="judul-tag">
      <div>
        <JudulIkon nama="tag" id="judul-tag">
          Konsistensi tagging
        </JudulIkon>
        <div className="kartu-sub">
          Bentuk baku mengacu pada kamus tag (kamus_tag.csv) · padanan bahasa Inggris dihitung konsisten · {angka(q.dokumen_bertag)}{' '}
          dokumen bertag
        </div>
      </div>

      <div className="rincian-jalan">
        <div>
          <span>Konsistensi tag</span>
          <span className="n">{persen(q.persen_konsistensi)}</span>
          <span>pemakaian berbentuk baku atau padanan bahasa Inggris</span>
        </div>
        <div>
          <span>Pemakaian tag</span>
          <span className="n">{angka(dipakai)}</span>
          <span>
            {angka(q.konsep_unik)} konsep · {angka(q.bentuk_unik)} bentuk penulisan
          </span>
        </div>
        <div>
          <span>Bentuk tidak baku</span>
          <span className="n perhatian-teks">{angka(q.penggunaan.varian)}</span>
          <span>pada {angka(q.konsep_dengan_varian)} konsep</span>
        </div>
        <div>
          <span>Belum di kamus</span>
          <span className="n">{angka(q.penggunaan.belum_di_kamus)}</span>
          <span>{angka(q.kandidat_padanan.length)} kandidat padanan</span>
        </div>
        <div>
          <span>Dokumen tanpa tag</span>
          <span className="n">{angka(q.dokumen_tanpa_tag)}</span>
          <span>{rasio(q.dokumen_tanpa_tag, q.dokumen_bertag + q.dokumen_tanpa_tag)} dari dokumen</span>
        </div>
      </div>

      <div
        className="bar-jalan"
        role="img"
        aria-label={URUT_STATUS.map((s) => `${LABEL_STATUS_TAG[s]} ${angka(q.penggunaan[s])}`).join(', ') + ' pemakaian tag.'}
      >
        <div className="lintasan">
          {URUT_STATUS.map((s) => (
            <div key={s} className="isi-bar" style={{ width: `${dipakai ? (100 * q.penggunaan[s]) / dipakai : 0}%`, background: WARNA_STATUS_TAG[s] }} />
          ))}
        </div>
      </div>
      <div className="legenda">
        {URUT_STATUS.map((s) => (
          <span key={s}>
            <span className="swatch" style={{ background: WARNA_STATUS_TAG[s] }} />
            {LABEL_STATUS_TAG[s]} · <b>{angka(q.penggunaan[s])}</b> ({rasio(q.penggunaan[s], dipakai)})
          </span>
        ))}
      </div>

      {terendah && variTerendah && (
        <div className="catatan perhatian">
          <b>Catatan analis:</b> konsistensi terendah ada pada tag "{terendah.nama}" ({persen(terendah.persen_konsistensi)}); bentuk tidak
          baku yang paling sering dipakai adalah "{variTerendah.tulisan}" ({angka(variTerendah.penggunaan)} kali).
          {q.kandidat_padanan.length > 0 &&
            ` Ada ${angka(q.kandidat_padanan.length)} tag yang belum di kamus tetapi mirip tag lain; verifikasi lalu tambahkan ke kamus agar ikut dihitung.`}
        </div>
      )}

      <div className="kepala-tabel">
        <div>
          <h3 className="judul-sub">Seluruh tag yang diinput</h3>
          <div className="kartu-sub">Satu baris = satu konsep beserta semua bentuk penulisannya · diurutkan dari pemakaian terbanyak</div>
        </div>
        <div className="saring-tabel" role="group" aria-label="Saring tabel tag">
          <label>
            Cari tag
            <input type="search" value={cari} onChange={(e) => setCari(e.target.value)} placeholder="mis. kemiskinan" />
          </label>
          <label>
            Tampilkan
            <select value={saring} onChange={(e) => setSaring(e.target.value as Saring)}>
              {(Object.keys(LABEL_SARING) as Saring[]).map((s) => (
                <option key={s} value={s}>
                  {LABEL_SARING[s]}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
      <div className="gulir" tabIndex={0} aria-label="Tabel seluruh tag, dapat digulir ke samping">
        <table className="tabel-dok tabel-tag">
          <thead>
            <tr>
              <th scope="col">Tag (bentuk baku)</th>
              <th scope="col">Bentuk yang dipakai</th>
              <th scope="col">Pemakaian</th>
              <th scope="col">Dokumen</th>
              <th scope="col">Konsistensi</th>
              <th scope="col">
                <span className="sr-only">Aksi</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {tampil.map((k) => (
              <tr key={k.nama}>
                <th scope="row">{k.nama}</th>
                <td>
                  <ul className="daftar-bentuk">
                    {k.bentukUrut.map(([n, b]) => (
                      <li key={n} className="bentuk-tag" data-status={b.status}>
                        <span className="tulisan">{b.tulisan}</span>
                        <span className="ket">
                          {labelBentuk(b.status, b.jenis)} · {angka(b.penggunaan)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </td>
                <td>{angka(k.penggunaan)}</td>
                <td>{angka(k.dokumen)}</td>
                <td>
                  {k.persen_konsistensi === null ? (
                    <span className="redup">Belum di kamus</span>
                  ) : (
                    <span className="sel-persen">
                      <span className="lintasan" aria-hidden="true">
                        <span
                          className="isi-bar"
                          style={{
                            display: 'block',
                            width: `${k.persen_konsistensi}%`,
                            background: k.persen_konsistensi < 100 ? 'var(--perhatian)' : 'var(--utama)',
                          }}
                        />
                      </span>
                      <span>{persen(k.persen_konsistensi)}</span>
                    </span>
                  )}
                </td>
                <td>
                  <button type="button" className="tombol tombol-kecil" onClick={() => daftarKonsep(k.nama, k)} aria-label={`Daftar dokumen bertag ${k.nama}`}>
                    Daftar
                  </button>
                </td>
              </tr>
            ))}
            {!tampil.length && (
              <tr>
                <td colSpan={6}>Tidak ada tag yang cocok.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {baris.length > TAMPIL && (
        <button type="button" className="tombol" onClick={() => setSemua((x) => !x)} aria-expanded={semua}>
          {semua ? `Tampilkan ${TAMPIL} teratas` : `Tampilkan semua ${angka(baris.length)} tag`}
        </button>
      )}

      {q.kandidat_padanan.length > 0 && (
        <>
          <div className="kepala-tabel pemisah">
            <div>
              <h3 className="judul-sub">Kandidat padanan untuk diverifikasi</h3>
              <div className="kartu-sub">
                Tag yang belum di kamus tetapi mirip ejaan atau merupakan kepanjangan tag lain. Tidak digabung otomatis.
              </div>
            </div>
            <button type="button" className="tombol tombol-tautan" onClick={unduhKandidat}>
              <Ikon nama="unduh" ukuran={15} />
              Unduh sebagai baris kamus (CSV)
            </button>
          </div>
          <div className="gulir" tabIndex={0} aria-label="Tabel kandidat padanan tag, dapat digulir ke samping">
            <table className="tabel-dok tabel-pic">
              <thead>
                <tr>
                  <th scope="col">Tag yang dipakai</th>
                  <th scope="col">Usulan bentuk baku</th>
                  <th scope="col">Alasan</th>
                  <th scope="col">Dokumen</th>
                </tr>
              </thead>
              <tbody>
                {q.kandidat_padanan.map((x) => (
                  <tr key={x.tag}>
                    <td>{q.per_konsep[x.tag]?.bentuk[x.tag]?.tulisan ?? x.tag}</td>
                    <td>
                      <b>{x.usulan_baku}</b>
                    </td>
                    <td>{x.alasan === 'singkatan' ? 'Kepanjangan/singkatan' : `Ejaan mirip (${angka(Math.round((x.kemiripan ?? 0) * 100))}%)`}</td>
                    <td>{angka(x.dokumen)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
