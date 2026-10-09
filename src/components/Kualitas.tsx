import { AMBANG_PRIORITAS_DIMENSI, BATAS_BELUM_DIPERBARUI_BULAN } from '../config';
import { angka, desimal, rasio } from '../format';
import { predikatMasalah, type DokumenSiap, type Indikator, type Konteks, type Kualitas as TKualitas, type Filter } from '../indicators';
import type { PermintaanDaftar } from './Umum';
import { JudulIkon, KotakIkon } from './Ikon';

/** Tujuh dimensi kualitas metadata (Bruce & Hillman), urut sesuai skor_dimensi_1..7. */
export const NAMA_DIMENSI = [
  'Kelengkapan',
  'Akurasi',
  'Asal-usul (provenance)',
  'Kesesuaian standar',
  'Konsistensi logis',
  'Ketepatan waktu',
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
  ];
  const tampilMasalah = daftarMasalah.filter((m) => m.k !== 'tanpa_pic' || filter.sumber !== 'MENU_PROGRAM');

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
    </div>
  );
}
