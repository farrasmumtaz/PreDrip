"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function LocationTracker({ latitude, longitude }: { latitude: number | null; longitude: number | null }): React.ReactElement {
  const router = useRouter();
  const [status, setStatus] = useState("Memeriksa lokasi GPS…");
  useEffect(() => {
    let cancelled = false;
    if (!navigator.geolocation) {
      setStatus("GPS tidak didukung. Peta memakai lokasi tersimpan atau titik awal Bandung.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        if (cancelled) return;
        if (latitude === position.coords.latitude && longitude === position.coords.longitude) {
          setStatus("Peta memakai lokasi GPS terakhir.");
          return;
        }
        try {
        const response = await fetch("/api/location", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          }),
        });
        if (!response.ok) throw new Error("save-failed");
        if (!cancelled) {
          setStatus("Lokasi GPS diperbarui.");
          router.refresh();
        }
        } catch {
          if (!cancelled) setStatus("Lokasi GPS belum dapat disimpan. Coba muat ulang halaman.");
        }
      },
      () => { if (!cancelled) setStatus("GPS tidak tersedia atau izin ditolak. Peta memakai lokasi tersimpan atau titik awal Bandung."); },
      { timeout: 10_000, maximumAge: 60_000 }
    );
    return () => { cancelled = true; };
  }, [latitude, longitude, router]);

  return <p role="status" aria-live="polite">{status}</p>;
}
