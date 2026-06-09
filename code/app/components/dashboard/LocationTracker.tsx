"use client";

import { useEffect } from "react";

export default function LocationTracker() {
  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        await fetch("/api/location", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          }),
        });
      },
      (error) => {
        console.error(error);
      }
    );
  }, []);

  return null;
}