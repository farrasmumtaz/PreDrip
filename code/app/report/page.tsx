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

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    try {
      setLoading(true);

      const position =
        await new Promise<GeolocationPosition>(
          (resolve, reject) => {
            navigator.geolocation.getCurrentPosition(
              resolve,
              reject,
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
        throw new Error(
          "Gagal mengirim laporan",
        );
      }

      alert("Laporan berhasil dikirim");

      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      console.error(error);

      alert("Gagal mengirim laporan");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        maxWidth: "600px",
        margin: "2rem auto",
      }}
    >
      <h1>Buat Laporan Banjir</h1>

      <form onSubmit={handleSubmit}>
        <div
          style={{
            marginBottom: "1rem",
          }}
        >
          <label>
            Tinggi Air (cm)
          </label>

          <input
            type="number"
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
          <label>
            Deskripsi
          </label>

          <textarea
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
          type="submit"
          disabled={loading}
        >
          {loading
            ? "Mengirim..."
            : "Kirim Laporan"}
        </button>
      </form>
    </main>
  );
}