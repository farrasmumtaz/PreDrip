import FormMessage from "@/app/components/FormMessage";
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
    <main id="main-content" tabIndex={-1} className="shell">
      <section className="panel">
        <div className="eyebrow">PreDrip</div>
        <h1>Lupa password</h1>
        <p>{process.env.NODE_ENV === "production" ? "Pemulihan password belum tersedia. Hubungi pengelola PreDrip." : "Masukkan email akun. Pada mode development, link reset tampil di terminal."}</p>
        <FormMessage error={params?.error} success={params?.success} />
        <form action={forgotPasswordAction}>
          <label>
            Email
            <input aria-describedby={params?.error ? "form-message" : undefined} name="email" type="email" autoComplete="email" required />
          </label>
          <button className="button" type="submit" disabled={process.env.NODE_ENV === "production"}>
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
