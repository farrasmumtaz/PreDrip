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
    <main className="shell">
      <section className="panel">
        <div className="eyebrow">PreDrip</div>
        <h1>Login</h1>
        <p>Masuk untuk mengakses dashboard awal PreDrip.</p>
        {params?.error ? (
          <div className="message message-error">{params.error}</div>
        ) : null}
        {params?.success ? (
          <div className="message message-success">{params.success}</div>
        ) : null}
        <form action={loginAction}>
          <label>
            Email
            <input name="email" type="email" autoComplete="email" required />
          </label>
          <label>
            Password
            <input
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
