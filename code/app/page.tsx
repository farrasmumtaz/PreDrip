import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/session";

export default async function HomePage(): Promise<React.ReactElement> {
  const user = await getCurrentUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <main className="shell">
      <section className="panel">
        <div className="eyebrow">PreDrip MVP</div>
        <h1>Flood risk intelligence, dimulai dari auth yang aman.</h1>
        <p>
          Fondasi web PreDrip untuk registrasi, login, logout, forgot password,
          reset password, session, dan role dasar sebelum modul prediksi banjir
          dikembangkan.
        </p>
        <form>
          <Link className="button" href="/register">
            Buat akun
          </Link>
          <Link className="button button-secondary" href="/login">
            Login
          </Link>
        </form>
      </section>
    </main>
  );
}
