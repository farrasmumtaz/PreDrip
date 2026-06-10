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
  reports: {
    id: string;
    latitude: number;
    longitude: number;
    waterLevel: number;
  }[];
}

export default function MapSection({
  latitude,
  longitude,
  riskLevel,
  reports,
}: MapSectionProps) {
  return (
    <FloodMap
      latitude={latitude}
      longitude={longitude}
      riskLevel={riskLevel}   
      reports={reports}
    />
  );
}