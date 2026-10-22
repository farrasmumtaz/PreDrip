import FormMessage from "@/app/components/FormMessage";
import Link from "next/link";

import { registerAction } from "@/app/actions/auth";

interface RegisterPageProps {
  searchParams?: Promise<{
    error?: string;
  }>;
}

export default async function RegisterPage({
  searchParams,
}: RegisterPageProps): Promise<React.ReactElement> {
  const params = await searchParams;

  return (
    <main id="main-content" tabIndex={-1} className="shell">
      <section className="panel">
        <div className="eyebrow">PreDrip</div>
        <h1>Registrasi</h1>
        <p>Buat akun untuk menyimpan profil dan lokasi prioritas.</p>
        <FormMessage error={params?.error} />
        <form action={registerAction}>
          <label>
            Nama
            <input aria-describedby={params?.error ? "form-message" : undefined} name="name" type="text" autoComplete="name" required />
          </label>
          <label>
            Email
            <input aria-describedby={params?.error ? "form-message" : undefined} name="email" type="email" autoComplete="email" required />
          </label>
          <label>
            Password
            <input
              aria-describedby={params?.error ? "form-message" : undefined}
              name="password"
              type="password"
              autoComplete="new-password"
              required
            />
          </label>
          <label>
            Lokasi prioritas
            <input
              aria-describedby={params?.error ? "form-message" : undefined}
              name="homeAddress"
              type="text"
              autoComplete="street-address"
              placeholder="Contoh: Dayeuhkolot, Bandung"
            />
          </label>
          <button className="button" type="submit">
            Buat akun
          </button>
        </form>
        <p className="footer-link">
          Sudah punya akun? <Link href="/login">Login</Link>
        </p>
      </section>
    </main>
  );
}
