import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/session";
import { loadDataset } from "@/lib/datasets/load-dataset";

import RainfallChart from "./RainfallChart";
import styles from "./dataset.module.css";

export const metadata: Metadata = { title: "Dataset & kualitas data | PreDrip" };
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const number = new Intl.NumberFormat("id-ID");
const dateFormat = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Jakarta" });
function date(value: string): string { return dateFormat.format(new Date(`${value}T00:00:00+07:00`)); }

function SourceLink({ reference }: { reference: string }): React.ReactElement {
  try {
    const url = new URL(reference);
    if (url.protocol !== "https:") return <span>Referensi perlu ditinjau</span>;
    const names: Record<string, string> = { "jabarprov.go.id": "Pemprov Jawa Barat", "bnpb.go.id": "BNPB" };
    return <a href={url.href} target="_blank" rel="noopener noreferrer">{names[url.hostname] ?? url.hostname} <span aria-hidden="true">↗</span></a>;
  } catch {
    return <span>Referensi lokal</span>;
  }
}

export default async function DatasetPage({ searchParams }: {
  searchParams: Promise<{ year?: string | string[] }>;
}): Promise<React.ReactElement> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const [state, params] = await Promise.all([loadDataset(), searchParams]);

  const navigation = (
    <nav className={styles.nav} aria-label="Navigasi utama">
      <Link href="/dashboard" className={styles.brand}><span aria-hidden="true" className={styles.brandMark}>P</span>PreDrip<span className={styles.brandDivider}>/</span><span className={styles.brandSection}>Research</span></Link>
      <div className={styles.navLinks}><Link href="/dashboard">Dashboard</Link><Link href="/dataset" aria-current="page">Dataset</Link><Link href="/report">Laporan</Link></div>
    </nav>
  );
  if (state.status !== "ready") {
    return <main className={styles.page}>{navigation}<section className={styles.empty}>
      <span className={styles.eyebrow}>DATASET PREDRIP</span>
      <h1>{state.status === "missing" ? "Dataset belum tersedia" : "Dataset perlu diperiksa"}</h1>
      <p>{state.status === "missing" ? "Snapshot penelitian belum tersedia pada instalasi ini. Siapkan data untuk menampilkan ringkasan, grafik hujan, dan audit label." : "Data dan metadata sumber belum konsisten. Ringkasan akan tersedia setelah snapshot diperiksa dan diperbarui."}</p>
      <Link href="https://github.com/farrasmumtaz/PreDrip/blob/main/code/research/README.md" target="_blank" rel="noopener noreferrer" className={styles.primaryLink}>Buka panduan dataset ↗</Link>
      <Link href="/dashboard" className={styles.backLink}>Kembali ke dashboard</Link>
    </section></main>;
  }

  const { audit, source, rainfall, evidence } = state.data;
  const requestedYear = typeof params.year === "string" && /^\d{4}$/.test(params.year) ? Number(params.year) : null;
  const selected = rainfall.find((item) => item.year === requestedYear) ?? rainfall[rainfall.length - 1];
  const missingFeatures = Object.values(audit.weather.missingValues).reduce((sum, count) => sum + count, 0);
  const labelledPercentage = audit.nextDayAlignment.knownLabelPairs / audit.weather.validRows * 100;
  const pendingLabels = audit.nextDayAlignment.missingLabelDays + audit.nextDayAlignment.unknownLabelDays;
  const metrics = [
    { label: "Hari cuaca", value: number.format(audit.weather.validRows), detail: `${source.start.slice(0, 4)}–${source.end.slice(0, 4)} · resolusi harian` },
    { label: "Nilai fitur kosong", value: number.format(missingFeatures), detail: "Hujan, kelembapan, dan suhu" },
    { label: "Target besok berlabel", value: number.format(audit.nextDayAlignment.knownLabelPairs), detail: "Tanggal dengan bukti yang cocok" },
    { label: "Target belum diketahui", value: number.format(pendingLabels), detail: "Tanpa label atau masih unknown" },
  ];
  const checks = [
    { title: "Label belum mewakili kedua kelas", detail: `${number.format(audit.nextDayAlignment.floodPairs)} pasangan banjir dan ${number.format(audit.nextDayAlignment.noFloodPairs)} pasangan tanpa banjir.`, pending: audit.nextDayAlignment.floodPairs === 0 || audit.nextDayAlignment.noFloodPairs === 0 },
    { title: "Ketersediaan fitur perlu diverifikasi", detail: `${number.format(audit.weather.unknownAvailability)} hari belum memiliki bukti waktu tersedia sebelum prediksi.`, pending: audit.weather.unknownAvailability > 0 || audit.weather.unavailableAtCutoff > 0 },
    { title: "Pembagian waktu & evaluasi belum dilakukan", detail: "Periode training, validation, dan test perlu ditetapkan setelah data layak.", pending: true },
  ];

  return (
    <main className={styles.page}>
      {navigation}
      <header className={styles.header}>
        <div><span className={styles.eyebrow}>DATASET & KUALITAS DATA</span><h1>Fondasi sebelum prediksi.</h1><p>Kenali cakupan cuaca dan bukti banjir yang mendasari eksperimen PreDrip.</p></div>
        <span className={styles.researchBadge}><span /> Eksperimen historis</span>
      </header>

      <div className={styles.period}><span>Kota Bandung</span><span aria-hidden="true">·</span><span>{date(source.start)} — {date(source.end)}</span><span aria-hidden="true">·</span><span>Hari kalender WIB</span></div>

      <section className={styles.notice} aria-labelledby="training-status">
        <span className={styles.noticeIcon} aria-hidden="true">!</span>
        <div><h2 id="training-status">Belum siap untuk training</h2><p>Struktur data lolos audit. Kelengkapan label dan waktu ketersediaan cuaca masih perlu dilengkapi sebelum model dapat dievaluasi.</p></div>
        <a href="#readiness" className={styles.noticeLink}>Lihat alasannya <span aria-hidden="true">↓</span></a>
      </section>

      <section className={styles.metrics} aria-label="Ringkasan audit">
        {metrics.map((metric, index) => <article className={styles.metric} key={metric.label}><span className={styles.metricNumber}>0{index + 1}</span><h2>{metric.label}</h2><strong>{metric.value}</strong><p>{metric.detail}</p></article>)}
      </section>

      <div className={styles.analysisGrid}>
        <section className={styles.card} aria-labelledby="rainfall-heading">
          <div className={styles.cardHeader}><div><span className={styles.eyebrow}>POLA CUACA</span><h2 id="rainfall-heading">Curah hujan sepanjang tahun</h2></div>
            {selected && <form action="/dataset" method="get" className={styles.yearForm}><label htmlFor="dataset-year" className={styles.visuallyHidden}>Tahun grafik hujan</label><select id="dataset-year" name="year" defaultValue={selected.year}>{[...rainfall].reverse().map((item) => <option value={item.year} key={item.year}>{item.year}</option>)}</select><button type="submit">Tampilkan</button></form>}
          </div>
          {selected && <RainfallChart data={selected.months} year={selected.year} />}
        </section>

        <aside className={styles.card} aria-labelledby="coverage-heading">
          <span className={styles.eyebrow}>CAKUPAN LABEL</span><h2 id="coverage-heading">Bukti masih terbatas</h2>
          <div className={styles.coverageValue}>{new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 }).format(labelledPercentage)}<span>%</span></div>
          <p className={styles.coverageDescription}>target besok sudah memiliki label. Angka ini menunjukkan cakupan bukti, bukan peluang banjir.</p>
          <div className={styles.coverageTrack} aria-hidden="true"><span style={{ width: `${labelledPercentage}%` }} /></div>
          <dl className={styles.coverageList}><div><dt><span className={styles.dotTeal} />Banjir terkonfirmasi</dt><dd>{number.format(audit.nextDayAlignment.floodPairs)}</dd></div><div><dt><span className={styles.dotBlue} />Tanpa banjir terkonfirmasi</dt><dd>{number.format(audit.nextDayAlignment.noFloodPairs)}</dd></div><div><dt><span className={styles.dotGrey} />Belum diketahui</dt><dd>{number.format(pendingLabels)}</dd></div></dl>
          <div className={styles.coverageNote}>Hari tanpa laporan tetap belum diketahui. Ketiadaan laporan tidak otomatis berarti tidak banjir.</div>
        </aside>
      </div>

      <section className={`${styles.card} ${styles.evidenceCard}`} aria-labelledby="evidence-heading">
        <div className={styles.cardHeader}><div><span className={styles.eyebrow}>BUKTI KEJADIAN</span><h2 id="evidence-heading">Dari laporan resmi ke label harian</h2></div><span className={styles.subtleBadge}>{number.format(evidence.length)} hari dikurasi</span></div>
        <p className={styles.sectionDescription}>Tanggal kejadian digunakan sebagai label. Kurasi awal ini belum mewakili seluruh kejadian pada periode studi.</p>
        <div className={styles.tableScroll}><table className={styles.table}><caption className={styles.visuallyHidden}>Bukti label banjir Kota Bandung</caption><thead><tr><th scope="col">Tanggal kejadian</th><th scope="col">Wilayah</th><th scope="col">Label</th><th scope="col">Sumber bukti</th></tr></thead><tbody>{evidence.map((item) => <tr key={item.date}><th scope="row">{date(item.date)}</th><td>Kota Bandung</td><td><span className={item.status === "1" ? styles.floodBadge : styles.subtleBadge}>{item.status === "1" ? "Banjir terkonfirmasi" : item.status === "0" ? "Tanpa banjir" : "Belum diketahui"}</span></td><td><SourceLink reference={item.sourceRef} /></td></tr>)}</tbody></table></div>
      </section>

      <div className={styles.bottomGrid}>
        <section className={styles.card} id="readiness" aria-labelledby="readiness-heading"><span className={styles.eyebrow}>KESIAPAN EKSPERIMEN</span><h2 id="readiness-heading">Yang perlu diselesaikan</h2><ol className={styles.checks}>{checks.filter((check) => check.pending).map((check, index) => <li key={check.title}><span>{index + 1}</span><div><h3>{check.title}</h3><p>{check.detail}</p></div></li>)}</ol></section>
        <section className={`${styles.card} ${styles.sourceCard}`} aria-labelledby="source-heading"><span className={styles.eyebrow}>SUMBER & BATASAN</span><h2 id="source-heading">ERA5 melalui Open-Meteo</h2><p>Reanalisis berbasis grid, berbeda dari observasi langsung stasiun BMKG. Keterwakilan grid terhadap seluruh Kota Bandung belum divalidasi.</p><dl className={styles.sourceList}><div><dt>Koordinat grid</dt><dd>{source.returnedGrid.latitude}, {source.returnedGrid.longitude}</dd></div><div><dt>Diunduh pada</dt><dd>{dateFormat.format(new Date(source.acquiredAt))}</dd></div><div><dt>Integritas snapshot</dt><dd>CSV cocok dengan metadata</dd></div></dl><a href="https://open-meteo.com/en/docs/historical-weather-api" target="_blank" rel="noopener noreferrer" className={styles.sourceLink}>Tentang sumber cuaca ↗</a><small>Data cuaca: Open-Meteo, berdasarkan informasi ERA5 Copernicus Climate Change Service / ECMWF.</small></section>
      </div>
      <footer className={styles.footer}><span>PreDrip Research · Data lebih jelas, eksperimen lebih terukur.</span><span>Audit dihitung dari snapshot saat halaman dibuka.</span></footer>
    </main>
  );
}
