import { redirect } from "next/navigation";

import { logoutAction } from "@/app/actions/auth";
import LocationTracker from "@/app/components/dashboard/LocationTracker";
import MapSection from "@/app/components/map/MapSection";

import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { calculateFloodRisk } from "@/lib/risk-engine";
import { getWeatherByLocation } from "@/lib/services/bmkg";
import Link from "next/link";

export default async function DashboardPage(): Promise<React.ReactElement> {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const latitude =
    user.homeLatitude ?? -6.9175;

  const longitude =
    user.homeLongitude ?? 107.6191;

  const weather =
    await getWeatherByLocation(
      latitude,
      longitude,
    );

  await prisma.weatherSnapshot.create({
    data: {
      latitude,
      longitude,

      rainfall: weather.rainfall,
      humidity: weather.humidity,
      temperature: weather.temperature,

      weatherCode:
        weather.weatherCondition,

      recordedAt: new Date(),
    },
  });

  const history =
    await prisma.weatherSnapshot.findMany({
      take: 10,
      orderBy: {
        recordedAt: "desc",
      },
    });

  const reportsRaw =
    await prisma.citizenReport.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });

  const reports = reportsRaw.map((report) => ({
    id: report.id,
    latitude: Number(report.latitude),
    longitude: Number(report.longitude),
    waterLevel: report.waterLevel,
  }));

  const risk =
    calculateFloodRisk(weather);

  return (
    <main className="dashboard">
      <LocationTracker />

      <header className="dashboard-header">
        <div>
          <div className="eyebrow">
            Dashboard
          </div>

          <h1>
            Halo, {user.name}
          </h1>

          <p>
            Monitoring cuaca, prediksi risiko
            banjir, pelacakan lokasi, dan
            laporan warga.
          </p>
        </div>

        <form action={logoutAction}>
          <button
            className="button button-secondary"
            type="submit"
          >
            Logout
          </button>
        </form>

        <div
  style={{
    display: "flex",
    gap: "1rem",
  }}
>
  <Link
    href="/report"
    className="button"
  >
    Buat Laporan
  </Link>

  <form action={logoutAction}>
    <button
      className="button button-secondary"
      type="submit"
    >
      Logout
    </button>
  </form>
</div>
      </header>

      <section className="grid">
        <article className="metric">
          <h2>Status akun</h2>
          <p>{user.email}</p>
        </article>

        <article className="metric">
          <h2>Role</h2>
          <p>{user.role}</p>
        </article>

        <article className="metric">
          <h2>Curah Hujan</h2>
          <p>{weather.rainfall} mm</p>
        </article>

        <article className="metric">
          <h2>Kelembaban</h2>
          <p>{weather.humidity}%</p>
        </article>

        <article className="metric">
          <h2>Suhu</h2>
          <p>{weather.temperature}°C</p>
        </article>

        <article className="metric">
          <h2>Status Risiko</h2>
          <p>{risk.level}</p>
        </article>

        <article className="metric">
          <h2>Latitude</h2>
          <p>{latitude}</p>
        </article>

        <article className="metric">
          <h2>Longitude</h2>
          <p>{longitude}</p>
        </article>

        <article className="metric">
          <h2>Total Laporan</h2>
          <p>{reports.length}</p>
        </article>
      </section>

      <section
        style={{
          marginTop: "2rem",
        }}
      >
        <article className="metric">
          <h2>Riwayat Cuaca</h2>

          {history.map((item) => (
            <p key={item.id}>
              {item.rainfall} mm
              {" - "}
              {item.recordedAt.toLocaleTimeString()}
            </p>
          ))}
        </article>
      </section>

      <section
  style={{
    marginTop: "2rem",
  }}
>
  <article className="metric">
    <h2>Laporan Warga</h2>

    {reportsRaw.length === 0 ? (
      <p>Belum ada laporan.</p>
    ) : (
      reportsRaw.map((report) => (
        <div
          key={report.id}
          style={{
            marginBottom: "1rem",
            padding: "1rem",
            border: "1px solid #ddd",
            borderRadius: "8px",
          }}
        >
          <strong>
            Tinggi Air: {report.waterLevel} cm
          </strong>

          <p
            style={{
              marginTop: "0.5rem",
            }}
          >
            {report.description}
          </p>

          <small>
            Lokasi:
            {" "}
            {Number(report.latitude).toFixed(5)}
            ,
            {" "}
            {Number(report.longitude).toFixed(5)}
          </small>

          <br />

          <small>
            {report.createdAt.toLocaleString()}
          </small>
        </div>
      ))
    )}
  </article>
</section>

      <section
        style={{
          marginTop: "2rem",
        }}
      >
        <h2>Peta Lokasi</h2>

        <MapSection
          latitude={latitude}
          longitude={longitude}
          riskLevel={risk.level}
          reports={reports}
        />
      </section>
    </main>
  );
}