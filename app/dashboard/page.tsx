import { redirect } from "next/navigation";

import { logoutAction } from "@/app/actions/auth";
import { getCurrentUser } from "@/lib/auth/session";

export default async function DashboardPage(): Promise<React.ReactElement> {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="dashboard">
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
      </section>
    </main>
  );
}
