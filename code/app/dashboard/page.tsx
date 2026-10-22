import Link from "next/link";
import { redirect } from "next/navigation";

import { logoutAction } from "@/app/actions/auth";
import LocationTracker from "@/app/components/dashboard/LocationTracker";
import ExperimentPanel from "@/app/components/dashboard/ExperimentPanel";
import { loadExperiment } from "@/lib/experiments/load-experiment";
import MapSection from "@/app/components/map/MapSection";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { calculateFloodRisk } from "@/lib/risk-engine";
import { BMKG_AREAS, DEFAULT_BMKG_ADM4, getWeatherForecast, isBmkgArea, type ForecastSlot } from "@/lib/services/bmkg";

import styles from "./dashboard.module.css";

export const dynamic = "force-dynamic";
const dateTime = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" });
const dayFormat = new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "short", timeZone: "Asia/Jakarta" });
const hourFormat = new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" });
const number = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 });
const display = (value: number | null, unit: string): string => value === null ? "Belum tersedia" : `${number.format(value)}${unit}`;

export default async function DashboardPage({ searchParams }: {
  searchParams: Promise<{ adm4?: string | string[] }>;
}): Promise<React.ReactElement> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const params = await searchParams;
  const adm4 = params.adm4 === undefined ? DEFAULT_BMKG_ADM4 : typeof params.adm4 === "string" ? params.adm4 : "";
  const [forecast, reportsRaw, totalReports, experiment] = await Promise.all([
    getWeatherForecast(adm4),
    prisma.citizenReport.findMany({ take: 20, orderBy: { createdAt: "desc" } }),
    prisma.citizenReport.count(),
    loadExperiment(),
  ]);
  const risk = calculateFloodRisk({ sourceKind: "forecast", rainfallDailyMm: null, humidityPercent: forecast.status === "ready" ? forecast.selected.humidityPercent : null });
  const latitude = user.homeLatitude ?? -6.9175;
  const longitude = user.homeLongitude ?? 107.6191;
  const reports = reportsRaw.map((report) => ({ id: report.id, latitude: Number(report.latitude), longitude: Number(report.longitude), waterLevel: report.waterLevel }));
  const groups = new Map<string, ForecastSlot[]>();
  if (forecast.status === "ready") {
    for (const slot of forecast.slots) {
      const day = dayFormat.format(new Date(slot.validAt));
      const group = groups.get(day) ?? [];
      group.push(slot);
      groups.set(day, group);
    }
  }

  return (
    <main id="main-content" tabIndex={-1} className="dashboard">
      <LocationTracker latitude={user.homeLatitude} longitude={user.homeLongitude} />
      <header className={styles.header}>
        <div><div className="eyebrow">PreDrip · Dashboard</div><h1>Halo, {user.name}</h1><p>{user.email} · {user.role}</p></div>
        <nav className={styles.actions} aria-label="Navigasi dashboard"><Link href="/dataset" className="button button-secondary">Dataset & Audit</Link><Link href="/report" className="button">Buat Laporan</Link><form action={logoutAction}><button className="button button-secondary" type="submit">Logout</button></form></nav>
      </header>

      <section className={styles.weather} aria-labelledby="forecast-heading">
        <div className={styles.weatherHeader}><div><span className={styles.badge}>Sumber: BMKG · Prakiraan</span><h2 id="forecast-heading">Prakiraan cuaca wilayah</h2><p>Lokasi prakiraan dipilih berdasarkan kelurahan dan terpisah dari posisi GPS pada peta.</p></div>
          <form action="/dashboard" method="get" className={styles.areaForm}><label htmlFor="weather-area">Kelurahan · Sumur Bandung<select id="weather-area" name="adm4" defaultValue={isBmkgArea(adm4) ? adm4 : ""}>{!isBmkgArea(adm4) && <option value="" disabled>Pilih wilayah</option>}{BMKG_AREAS.map((area) => <option value={area.adm4} key={area.adm4}>{area.name}</option>)}</select></label><button type="submit" className="button">Tampilkan</button></form>
        </div>

        {forecast.status === "ready" ? <>
          <div className={styles.forecastLocation}><strong>{forecast.area.village}, {forecast.area.district}, {forecast.area.city}</strong><span>Waktu prakiraan: {dateTime.format(new Date(forecast.selected.validAt))} WIB</span><span>Diproduksi BMKG: {dateTime.format(new Date(forecast.selected.issuedAt))} WIB</span></div>
          <div className={styles.metrics}><article><h3>Kondisi cuaca</h3><strong>{forecast.selected.condition}</strong><small>Prakiraan terdekat, bukan pengamatan langsung</small></article><article><h3>Suhu</h3><strong>{display(forecast.selected.temperatureC, " °C")}</strong></article><article><h3>Kelembapan</h3><strong>{display(forecast.selected.humidityPercent, "%")}</strong></article><article><h3>Angin</h3><strong>{display(forecast.selected.windKmh, " km/jam")}</strong>{forecast.selected.windDirection && <small>Arah {forecast.selected.windDirection}</small>}</article></div>
          <div className={styles.forecastGroups}>{[...groups].map(([day, slots]) => <section key={day}><h3>{day} · WIB</h3><div className={styles.tableScroll}><table className={styles.table}><caption className={styles.hidden}>Prakiraan BMKG {day}</caption><thead><tr><th scope="col">Waktu</th><th scope="col">Cuaca</th><th scope="col">Suhu</th><th scope="col">Kelembapan</th></tr></thead><tbody>{slots.map((slot) => <tr key={slot.validAt}><th scope="row">{hourFormat.format(new Date(slot.validAt))}</th><td>{slot.condition}</td><td>{display(slot.temperatureC, " °C")}</td><td>{display(slot.humidityPercent, "%")}</td></tr>)}</tbody></table></div></section>)}</div>
        </> : <div role="status" className={styles.error}><h3>{forecast.reason === "invalid-area" ? "Wilayah prakiraan belum didukung" : forecast.reason === "stale" ? "Prakiraan terbaru belum tersedia" : "Prakiraan BMKG belum dapat dimuat"}</h3><p>{forecast.reason === "invalid-area" ? "Pilih salah satu kelurahan yang tersedia untuk menampilkan prakiraan." : "Data tidak ditampilkan karena belum dapat diverifikasi atau telah melewati masa berlaku. Coba muat kembali halaman dalam beberapa saat."}</p><Link href={isBmkgArea(adm4) ? `/dashboard?adm4=${adm4}` : "/dashboard"}>Muat ulang prakiraan</Link></div>}
        <p className={styles.attribution}>Data prakiraan cuaca: <a href={isBmkgArea(adm4) ? `https://www.bmkg.go.id/cuaca/prakiraan-cuaca/${adm4}` : "https://www.bmkg.go.id/cuaca/prakiraan-cuaca"} target="_blank" rel="noopener noreferrer">BMKG (Badan Meteorologi, Klimatologi, dan Geofisika) ↗</a>. Waktu ditampilkan dalam WIB.</p>
      </section>
      <ExperimentPanel experiment={experiment} />

      <section className={styles.risk} aria-labelledby="risk-heading"><div><span className={styles.badge}>Metode: aturan manual · belum divalidasi</span><h2 id="risk-heading">Indikator risiko banjir: belum dinilai</h2><p>{risk.recommendation}</p><details><summary>Tentang perhitungan</summary><p>Rumus eksperimen: curah hujan harian × 0,7 + kelembapan × 0,3, dibatasi 100. Skor bukan probabilitas banjir atau keluaran model AI. Nilai prakiraan per slot tidak diperlakukan sebagai curah hujan harian. Ikuti informasi resmi BPBD/BMKG untuk kesiapsiagaan.</p></details></div></section>

      <section className={styles.section} aria-labelledby="reports-heading"><div className={styles.sectionHeader}><div><h2 id="reports-heading">Laporan warga</h2><p>{totalReports} laporan tersimpan · menampilkan maksimal 20 laporan terbaru</p></div><Link href="/report">Buat laporan →</Link></div>{reportsRaw.length === 0 ? <p>Belum ada laporan.</p> : <div className={styles.reports}>{reportsRaw.map((report) => <article key={report.id}><strong>Tinggi air: {number.format(report.waterLevel)} cm</strong><p>{report.description}</p><small>{Number(report.latitude).toFixed(5)}, {Number(report.longitude).toFixed(5)} · {dateTime.format(report.createdAt)} WIB</small></article>)}</div>}</section>
      <section className={styles.section}><h2>Lokasi & laporan warga</h2><p>Peta menampilkan posisi pengguna atau titik awal Bandung serta laporan warga. Belum ada zona risiko banjir yang tervalidasi.</p><MapSection latitude={latitude} longitude={longitude} riskLevel={risk.level} reports={reports} locationLabel={user.homeLatitude !== null && user.homeLongitude !== null ? "Lokasi Anda" : "Titik awal Bandung"} /></section>
    </main>
  );
}
