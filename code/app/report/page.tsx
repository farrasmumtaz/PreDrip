"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ReportPage(): React.ReactElement {
  const router = useRouter();

  const [waterLevel, setWaterLevel] =
    useState<number>(0);

  const [description, setDescription] =
    useState<string>("");

  const [loading, setLoading] =
    useState<boolean>(false);
  const [error, setError] = useState("");

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    try {
      setLoading(true);
      setError("");
      if (!navigator.geolocation) throw new Error("GPS tidak didukung pada perangkat ini.");

      const position =
        await new Promise<GeolocationPosition>(
          (resolve, reject) => {
            navigator.geolocation.getCurrentPosition(
              resolve,
              reject,
              { timeout: 10_000, maximumAge: 60_000 },
            );
          },
        );

      const latitude =
        position.coords.latitude;

      const longitude =
        position.coords.longitude;

      const response =
        await fetch("/api/report", {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            latitude,
            longitude,
            waterLevel,
            description,
          }),
        });

      if (!response.ok) {
        const body: unknown = await response.json().catch(() => null);
        const detail = body && typeof body === "object" && "error" in body && typeof body.error === "string" ? body.error : "Gagal mengirim laporan. Coba lagi.";
        throw new Error(response.status === 401 ? "Sesi berakhir. Silakan login kembali sebelum mengirim laporan." : detail);
      }

      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : "GPS tidak tersedia atau izin ditolak. Aktifkan izin lokasi lalu coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main id="main-content" tabIndex={-1} className="report-page">
      <h1>Buat Laporan Banjir</h1>
      <p><a href="/dashboard">Kembali ke dashboard</a></p>
      {error && <p id="report-error" role="alert" className="message message-error">{error}</p>}

      <form onSubmit={handleSubmit}>
        <div
          style={{
            marginBottom: "1rem",
          }}
        >
          <label htmlFor="water-level">
            Tinggi Air (cm)
          </label>

          <input
            id="water-level"
            name="waterLevel"
            aria-describedby={error ? "report-error" : undefined}
            type="number"
            min={0}
            max={2000}
            step="any"
            value={waterLevel}
            onChange={(event) =>
              setWaterLevel(
                Number(event.target.value),
              )
            }
            required
          />
        </div>

        <div
          style={{
            marginBottom: "1rem",
          }}
        >
          <label htmlFor="report-description">
            Deskripsi
          </label>

          <textarea
            id="report-description"
            name="description"
            aria-describedby={error ? "report-error" : undefined}
            required
            maxLength={2000}
            value={description}
            onChange={(event) =>
              setDescription(
                event.target.value,
              )
            }
            rows={4}
          />
        </div>

        <button
          className="button"
          type="submit"
          disabled={loading}
        >
          {loading
            ? "Mengirim…"
            : "Kirim Laporan"}
        </button>
      </form>
    </main>
  );
}
