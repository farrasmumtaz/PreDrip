import Link from "next/link";
import type { ExperimentState } from "@/lib/experiments/load-experiment";
import styles from "@/app/dashboard/dashboard.module.css";

const date = (value: string) => new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Jakarta" }).format(new Date(`${value}T00:00:00+07:00`));
const percent = (value: number | null) => value === null ? "Belum dapat dihitung" : new Intl.NumberFormat("id-ID", { style: "percent", maximumFractionDigits: 2 }).format(value);

export default function ExperimentPanel({ experiment }: { experiment: ExperimentState }): React.ReactElement {
  return <section className={styles.section} aria-labelledby="experiment-heading">
    <div className={styles.sectionHeader}><div><span className={styles.badge}>AI eksperimen · data historis Kota Bandung</span><h2 id="experiment-heading">Model belum layak untuk peringatan banjir</h2></div><Link href="/dataset">Dataset &amp; Audit →</Link></div>
    <p>Logistic Regression mempelajari laporan banjir dalam arsip DIBI dan cuaca ERA5. Tidak ada laporan dalam arsip belum berarti tidak terjadi banjir. Hasil ini bukan prediksi cuaca atau risiko banjir hari ini.</p>
    {experiment.status === "ready" ? <>
      <p>Evaluasi test: <strong>{date(experiment.data.start)}–{date(experiment.data.end)}</strong> · {experiment.data.metrics.rows.toLocaleString("id-ID")} hari</p>
      <dl className={styles.experimentMetrics}>
        <div><dt>Laporan terdeteksi</dt><dd>{experiment.data.metrics.tp} dari {experiment.data.metrics.positives}</dd></div>
        <div><dt>Prediksi positif tanpa laporan</dt><dd>{experiment.data.metrics.fp}</dd></div>
        <div><dt>Precision terhadap arsip</dt><dd>{percent(experiment.data.metrics.precision)}</dd></div>
      </dl>
      <p>Jumlah laporan pada test sangat sedikit; hasil ini belum membuktikan kemampuan generalisasi. Baseline selalu negatif melewatkan {experiment.data.baseline.fn} tanggal laporan.</p>
      <details className={styles.experimentDetails}><summary>Lihat keluaran historis model terakhir</summary>
        <p>Target: <strong>{date(experiment.data.latest.targetDate)}</strong>, memakai cuaca hingga {date(experiment.data.latest.featureDate)}. Cakupan model seluruh Kota Bandung; pilihan kelurahan BMKG tidak mengubah hasil historis ini.</p>
        <p>Keluaran: <strong>{experiment.data.latest.predictedReport ? "Prediksi ada laporan" : "Prediksi tidak ada laporan"}</strong>. Arsip pada tanggal target: {experiment.data.latest.reported ? "ada laporan" : "tidak ada laporan tercatat"}.</p>
        <p>Skor model {experiment.data.latest.score.toLocaleString("id-ID", { maximumFractionDigits: 3 })} · threshold {experiment.data.threshold.toLocaleString("id-ID")}. Skor bukan probabilitas banjir. Cuaca ERA5 adalah reanalisis retrospektif dan belum terbukti tersedia pada waktu prediksi historis.</p>
      </details>
    </> : <p role="status">{experiment.reason === "missing" ? "Artefak model atau snapshot eksperimen belum tersedia pada instalasi ini." : "Artefak eksperimen tidak dapat diverifikasi; hasil model tidak ditampilkan."}</p>}
  </section>;
}
