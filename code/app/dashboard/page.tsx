import { redirect } from "next/navigation";
import LocationTracker from "@/app/components/dashboard/LocationTracker";
import { logoutAction } from "@/app/actions/auth";
import { getCurrentUser } from "@/lib/auth/session";
import {
  getWeatherByLocation,
} from "@/lib/services/bmkg";

import {
  calculateFloodRisk,
} from "@/lib/risk-engine";
import MapSection from "@/app/components/map/MapSection";
import { prisma } from "@/lib/prisma";

export default async function DashboardPage(): Promise<React.ReactElement> {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }
const weather =
  await getWeatherByLocation(
    user.homeLatitude ?? -6.9175,
    user.homeLongitude ?? 107.6191,
  );
await prisma.weatherSnapshot.create({
  data: {
    latitude: user.homeLatitude!,
    longitude: user.homeLongitude!,

    rainfall: weather.rainfall,
    humidity: weather.humidity,
    temperature: weather.temperature,

    weatherCode: weather.weatherCondition,

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
const risk =
  calculateFloodRisk(weather);

  return (
    <main className="dashboard">
      <LocationTracker />
      <header className="dashboard-header">
        <div>
          <div className="eyebrow">Dashboard</div>
          <h1>Halo, {user.name}</h1>
          <p>
            Auth foundation aktif. Modul prediksi, peta risiko, notifikasi, dan
            laporan warga bisa dibangun di atas struktur user ini.
          </p>
        </div>
        <form action={logoutAction}>
          <button className="button button-secondary" type="submit">
            Logout
          </button>
        </form>
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
          <h2>Next module</h2>
          <p>Profile, lokasi prioritas, dan preference notifikasi.</p>
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
          <h2>Status Risiko</h2>
          <p>{risk.level}</p>
        </article>

        <article className="metric">
          <h2>Latitude</h2>
          <p>{String(user.homeLatitude)}</p>
        </article>

        <article className="metric">
          <h2>Longitude</h2>
          <p>{String(user.homeLongitude)}</p>
        </article>
      </section>

        <article className="metric">
  <h2>Riwayat Cuaca</h2>

  {history.map((item) => (
    <p key={item.id}>
      {item.rainfall} mm -
      {" "}
      {item.recordedAt.toLocaleTimeString()}
    </p>
  ))}
</article>
      <section
  style={{
    marginTop: "2rem",
  }}
>
  <h2>Peta Lokasi</h2>

  <MapSection
  latitude={user.homeLatitude ?? -6.9175}
  longitude={user.homeLongitude ?? 107.6191}
  riskLevel={risk.level}
/>
</section>
    </main>
  );
}
