import FormMessage from "@/app/components/FormMessage";
import Link from "next/link";

import { loginAction } from "@/app/actions/auth";

interface LoginPageProps {
  searchParams?: Promise<{
    error?: string;
    success?: string;
  }>;
}

export default async function LoginPage({
  searchParams,
}: LoginPageProps): Promise<React.ReactElement> {
  const params = await searchParams;

  return (
    <main id="main-content" tabIndex={-1} className="shell">
      <section className="panel">
        <div className="eyebrow">PreDrip</div>
        <h1>Login</h1>
        <p>Masuk untuk mengakses dashboard awal PreDrip.</p>
        <FormMessage error={params?.error} success={params?.success} />
        <form action={loginAction}>
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
              autoComplete="current-password"
              required
            />
          </label>
          <button className="button" type="submit">
            Login
          </button>
        </form>
        <p className="footer-link">
          <Link href="/forgot-password">Lupa password?</Link>
          {" · "}
          <Link href="/register">Buat akun</Link>
        </p>
      </section>
    </main>
  );
}
