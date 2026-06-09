"use client";

import dynamic from "next/dynamic";

const FloodMap = dynamic(
  () => import("./FloodMap"),
  {
    ssr: false,
  }
);

interface MapSectionProps {
  latitude: number;
  longitude: number;
    riskLevel: string;
}

export default function MapSection({
  latitude,
  longitude,
    riskLevel,
}: MapSectionProps) {
  return (
    <FloodMap
      latitude={latitude}
      longitude={longitude}
        riskLevel={riskLevel}   
    />
  );
}