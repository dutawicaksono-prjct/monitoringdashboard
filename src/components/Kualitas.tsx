import { AMBANG_PRIORITAS_DIMENSI, BATAS_BELUM_DIPERBARUI_BULAN } from '../config';
import { angka, desimal, rasio } from '../format';
import { masalahPerUke1, predikatMasalah, type DokumenSiap, type Indikator, type Konteks, type Kualitas as TKualitas, type Filter } from '../indicators';
import type { PermintaanDaftar } from './Umum';
import { Ikon, JudulIkon, KotakIkon } from './Ikon';
import { KonsistensiTag, labelBentuk } from './Tag';

/** Tujuh dimensi kualitas metadata (Bruce & Hillman), urut sesuai skor_dimensi_1..7. */
export const NAMA_DIMENSI = [
  'Kelengkapan',
  'Akurasi',
  'Asal-usul (provenance)',
  'Kesesuaian standar',
  'Konsistensi logis',
  'Kemutakhiran isi (ketepatan waktu)',
  'Aksesibilitas',
];

type KunciMasalah = keyof TKualitas['masalah'];

interface Props {
  ind: Indikator;
  ctx: Konteks;
  filter: Filter;
  dokumen: DokumenSiap[];
  onDaftar: (p: PermintaanDaftar) => void;
}

export function Kualitas({ ind, ctx, filter, dokumen, onDaftar }: Props) {
  const q = ind.kualitas;
  const total = ind.ringkasan.total_aset;
  const pred = predikatMasalah(ctx);

  const dims = NAMA_DIMENSI.map((nama, i) => ({ nama, skor: q.skor_per_dimensi[`dimensi_${i + 1}`] }));
  const prioritas = dims
    .filter((d) => d.skor != null && d.skor < AMBANG_PRIORITAS_DIMENSI)
    .sort((a, b) => (a.skor as number) - (b.skor as number));

  const ember = [
    { nama: 'Di bawah 50', n: q.sebaran_skor.di_bawah_50, warna: 'var(--perhatian)' },
    { nama: '50–69', n: q.sebaran_skor['50_69'], warna: 'var(--biru-muda)' },
    { nama: '70–84', n: q.sebaran_skor['70_84'], warna: 'var(--utama)' },
    { nama: '85 ke atas', n: q.sebaran_skor['85_ke_atas'], warna: 'var(--utama)' },
  ];
  const maksEmber = Math.max(1, ...ember.map((e) => e.n));

  const daftarMasalah: { k: KunciMasalah; label: string; ket: string; nilai: (d: DokumenSiap) => string }[] = [
    {
      k: 'metadata_belum_lengkap',
      label: 'Metadata wajib belum lengkap',
      ket: `Skor kelengkapan di bawah ${q.ambang_kelengkapan}`,
      nilai: (d) => `Skor kelengkapan ${desimal(d.skor_dimensi[0])}`,
    },
    { k: 'tanpa_pic', label: 'Tanpa PIC / pemilik', ket: 'Dokumen entri tanpa PIC UKE', nilai: () => 'PIC kosong' },
    {
      k: 'belum_diperbarui_12_bulan',
      label: `Belum diperbarui lebih dari ${BATAS_BELUM_DIPERBARUI_BULAN} bulan`,
      ket: 'Dihitung dari tanggal data',
      nilai: (d) => `Pembaruan terakhir ${d.tgl_pembaruan_terakhir}`,
    },
    {
      k: 'kandidat_duplikat',
      label: 'Kandidat duplikat',
      ket: 'Hash konten sama dengan dokumen lain',
      nilai: (d) => `Hash ${d.hash_konten.slice(0, 10)}…`,
    },
    { k: 'file_tidak_terbaca', label: 'File tidak terbaca (OCR gagal)', ket: 'Pemindaian teks gagal', nilai: () => 'OCR gagal' },
    {
      k: 'tag_tidak_baku',
      label: 'Tag tidak baku',
      ket: 'Memakai bentuk tag yang bukan bentuk baku menurut kamus tag (padanan bahasa Inggris tidak dihitung)',
      nilai: (d) =>
        (ctx.tag?.perDokumen.get(d.dokumen_id) ?? [])
          .filter((p) => p.status === 'varian')
          .map((p) => `${p.tulisan} → ${p.konsep} (${labelBentuk(p.status, p.jenis).toLowerCase()})`)
          .join('; '),
    },
  ];
  const tampilMasalah = daftarMasalah.filter(
    (m) => (m.k !== 'tanpa_pic' || filter.sumber !== 'MENU_PROGRAM') && (m.k !== 'tag_tidak_baku' || q.tag !== null),
  );

  return (
    <div className="tumpuk">
      <div className="baris-kartu">
        <section className="kartu" style={{ flex: '1 1 560px' }} aria-labelledby="judul-skor">
          <div className="kepala-skor">
            <div>
              <JudulIkon nama="skorKualitas" id="judul-skor">
                Skor kualitas metadata
              </JudulIkon>
              <div className="kartu-sub">Rata-rata tujuh dimensi (Bruce &amp; Hillman) · 0–100 · {angka(total)} dokumen</div>
            </div>
            <div className="skor-besar">
              <span className="n">{desimal(q.skor_rata_rata)}</span>
              <span className="u">/100</span>
            </div>
          </div>
          <div className="daftar-bar">
            {dims.map((d) => {
              const prio = d.skor != null && d.skor < AMBANG_PRIORITAS_DIMENSI;
              return (
                <div key={d.nama} className="baris-bar grid-dimensi">
                  <span className="nama">{d.nama}</span>
                  <div className="lintasan" aria-hidden="true">
                    <div className="isi-bar" style={{ width: `${d.skor ?? 0}%`, background: prio ? 'var(--perhatian)' : 'var(--utama)' }} />
                  </div>
                  <span className={`nilai${prio ? ' prioritas' : ''}`}>
                    {desimal(d.skor)} {prio ? 'Prioritas perbaikan' : ''}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="catatan perhatian">
            <b>Catatan analis:</b>{' '}
            {prioritas.length
              ? `dimensi terlemah adalah ${prioritas.map((d) => `${d.nama.toLowerCase()} (${desimal(d.skor)})`).join(' dan ')}. Dimensi dengan skor di bawah ${AMBANG_PRIORITAS_DIMENSI} diprioritaskan untuk perbaikan.`
              : `tidak ada dimensi dengan skor di bawah ${AMBANG_PRIORITAS_DIMENSI}.`}
          </div>
        </section>

        <section className="kartu" style={{ flex: '1 1 380px' }} aria-labelledby="judul-sebaran">
          <div>
            <JudulIkon nama="sebaran" id="judul-sebaran">
              Sebaran skor per dokumen
            </JudulIkon>
            <div className="kartu-sub">Dari total {angka(total)} dokumen KOMENS</div>
          </div>
          <div className="daftar-bar">
            {ember.map((e) => (
              <div key={e.nama} className="baris-bar grid-sebaran">
                <span className="nama">{e.nama}</span>
                <div className="lintasan" aria-hidden="true">
                  <div className="isi-bar" style={{ width: `${(100 * e.n) / maksEmber}%`, background: e.warna }} />
                </div>
                <span className="nilai">
                  <b>{angka(e.n)}</b> · {rasio(e.n, total)}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="kartu" aria-labelledby="judul-masalah">
        <div>
          <JudulIkon nama="masalah" id="judul-masalah">
            Masalah kualitas yang perlu dibersihkan
          </JudulIkon>
          <div className="kartu-sub">Klik daftar untuk melihat dokumen yang bermasalah dan menugaskan perbaikan</div>
        </div>
        <div className="masalah">
          {tampilMasalah.map((m) => (
            <div key={m.k} className="kartu-masalah" data-nada="perhatian">
              <div className="kpi-kepala">
                <div className="label">{m.label}</div>
                <KotakIkon nama={m.k} nada="perhatian" />
              </div>
              <div className="n">{angka(q.masalah[m.k])}</div>
              <div className="p">{rasio(q.masalah[m.k], total)} dari total dokumen</div>
              <button
                type="button"
                className="tombol"
                onClick={() =>
                  onDaftar({
                    judul: m.label,
                    catatan: m.ket,
                    dokumen: dokumen
                      .filter(pred[m.k])
                      .sort((a, b) => (m.k === 'kandidat_duplikat' ? a.hash_konten.localeCompare(b.hash_konten) : 0)),
                    labelKeterangan: 'Keterangan',
                    keterangan: m.nilai,
                  })
                }
              >
                Lihat daftar
              </button>
            </div>
          ))}
        </div>
      </section>

      {q.tag && <KonsistensiTag q={q.tag} ctx={ctx} dokumen={dokumen} onDaftar={onDaftar} />}

      {filter.sumber !== 'MENU_PROGRAM' && (
        <MatriksUke1
          ctx={ctx}
          dokumen={dokumen}
          daftar={daftarMasalah.filter((m) => m.k !== 'tag_tidak_baku' || q.tag !== null)}
          pred={pred}
          onDaftar={onDaftar}
        />
      )}
    </div>
  );
}

interface ItemMasalah {
  k: KunciMasalah;
  label: string;
  ket: string;
  nilai: (d: DokumenSiap) => string;
}

function MatriksUke1({
  ctx,
  dokumen,
  daftar,
  pred,
  onDaftar,
}: {
  ctx: Konteks;
  dokumen: DokumenSiap[];
  daftar: ItemMasalah[];
  pred: ReturnType<typeof predikatMasalah>;
  onDaftar: (p: PermintaanDaftar) => void;
}) {
  const baris = masalahPerUke1(ctx, dokumen).map((b) => ({ ...b, jumlah: daftar.reduce((a, m) => a + b.masalah[m.k], 0) }));
  baris.sort((a, b) => b.jumlah - a.jumlah || a.uke1.localeCompare(b.uke1, 'id'));
  if (!baris.length) return null;
  const maks: Record<string, number> = Object.fromEntries(daftar.map((m) => [m.k, Math.max(1, ...baris.map((b) => b.masalah[m.k]))]));
  const teratas = baris[0];
  const totalSemua = baris.reduce((a, b) => a + b.jumlah, 0);
  return (
    <section className="kartu" aria-labelledby="judul-matriks">
      <div>
        <JudulIkon nama="matriks" id="judul-matriks">
          Masalah kualitas per UKE I
        </JudulIkon>
        <div className="kartu-sub">
          Dokumen entri · diurutkan dari jumlah masalah terbanyak · angka terbesar di setiap kolom ditandai · klik angka untuk melihat
          daftarnya
        </div>
      </div>
      <div className="gulir" tabIndex={0} aria-label="Tabel masalah kualitas per UKE I, dapat digulir ke samping">
        <table className="tabel-dok tabel-matriks">
          <thead>
            <tr>
              <th scope="col">UKE I</th>
              <th scope="col">Dokumen entri</th>
              {daftar.map((m) => (
                <th key={m.k} scope="col">
                  {m.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {baris.map((b) => (
              <tr key={b.uke1}>
                <th scope="row">{b.uke1}</th>
                <td>{angka(b.total)}</td>
                {daftar.map((m) => {
                  const n = b.masalah[m.k];
                  const puncak = n > 0 && n === maks[m.k];
                  return (
                    <td key={m.k}>
                      <button
                        type="button"
                        className={`sel-matriks${puncak ? ' puncak' : ''}`}
                        disabled={!n}
                        aria-label={`${m.label}, ${b.uke1}: ${n} dokumen${puncak ? ', terbanyak' : ''}`}
                        onClick={() =>
                          onDaftar({
                            judul: `${m.label}: ${b.uke1}`,
                            catatan: m.ket,
                            dokumen: dokumen.filter((d) => d.sumber === 'ENTRI' && d.uke1 === b.uke1 && pred[m.k](d)),
                            labelKeterangan: 'Keterangan',
                            keterangan: m.nilai,
                          })
                        }
                      >
                        {puncak && <Ikon nama="masalah" ukuran={13} />}
                        {angka(n)}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {teratas.jumlah > 0 && (
        <div className="catatan">
          <b>Catatan analis:</b> {teratas.uke1} menyumbang masalah kualitas terbanyak ({angka(teratas.jumlah)} temuan,{' '}
          {rasio(teratas.jumlah, totalSemua)} dari seluruh temuan pada dokumen entri). Satu dokumen dapat memiliki lebih dari satu
          masalah.
        </div>
      )}
    </section>
  );
}
