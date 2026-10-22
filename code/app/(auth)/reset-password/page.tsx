import FormMessage from "@/app/components/FormMessage";
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
    <main id="main-content" tabIndex={-1} className="shell">
      <section className="panel">
        <div className="eyebrow">PreDrip</div>
        <h1>Reset password</h1>
        <p>Buat password baru untuk akun PreDrip.</p>
        <FormMessage error={params?.error} />
        <form action={resetPasswordAction}>
          <input aria-describedby={params?.error ? "form-message" : undefined} name="token" type="hidden" value={token} />
          <label>
            Password baru
            <input
              aria-describedby={params?.error ? "form-message" : undefined}
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
