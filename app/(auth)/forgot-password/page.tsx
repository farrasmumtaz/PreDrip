import Link from "next/link";

import { forgotPasswordAction } from "@/app/actions/auth";

interface ForgotPasswordPageProps {
  searchParams?: Promise<{
    error?: string;
    success?: string;
  }>;
}

export default async function ForgotPasswordPage({
  searchParams,
}: ForgotPasswordPageProps): Promise<React.ReactElement> {
  const params = await searchParams;

  return (
    <main className="shell">
      <section className="panel">
        <div className="eyebrow">PreDrip</div>
        <h1>Lupa password</h1>
        <p>Masukkan email akun. Pada mode development, link reset tampil di terminal.</p>
        {params?.error ? (
          <div className="message message-error">{params.error}</div>
        ) : null}
        {params?.success ? (
          <div className="message message-success">{params.success}</div>
        ) : null}
        <form action={forgotPasswordAction}>
          <label>
            Email
            <input name="email" type="email" autoComplete="email" required />
          </label>
          <button className="button" type="submit">
            Kirim link reset
          </button>
        </form>
        <p className="footer-link">
          <Link href="/login">Kembali ke login</Link>
        </p>
      </section>
    </main>
  );
}
