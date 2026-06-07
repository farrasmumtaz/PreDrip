import Link from "next/link";

import { resetPasswordAction } from "@/app/actions/auth";

interface ResetPasswordPageProps {
  searchParams?: Promise<{
    token?: string;
    error?: string;
  }>;
}

export default async function ResetPasswordPage({
  searchParams,
}: ResetPasswordPageProps): Promise<React.ReactElement> {
  const params = await searchParams;
  const token = params?.token ?? "";

  return (
    <main className="shell">
      <section className="panel">
        <div className="eyebrow">PreDrip</div>
        <h1>Reset password</h1>
        <p>Buat password baru untuk akun PreDrip.</p>
        {params?.error ? (
          <div className="message message-error">{params.error}</div>
        ) : null}
        <form action={resetPasswordAction}>
          <input name="token" type="hidden" value={token} />
          <label>
            Password baru
            <input
              name="password"
              type="password"
              autoComplete="new-password"
              required
            />
          </label>
          <button className="button" type="submit">
            Reset password
          </button>
        </form>
        <p className="footer-link">
          <Link href="/login">Kembali ke login</Link>
        </p>
      </section>
    </main>
  );
}
