"use client";

import dynamic from "next/dynamic";
import type { RiskLevel } from "@/lib/risk-engine";

const FloodMap = dynamic(
  () => import("./FloodMap"),
  {
    ssr: false,
  }
);

interface MapSectionProps {
  latitude: number;
  longitude: number;
  riskLevel: RiskLevel | null;
  locationLabel?: string;
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
  locationLabel,
}: MapSectionProps) {
  return (
    <FloodMap
      latitude={latitude}
      longitude={longitude}
      riskLevel={riskLevel}   
      reports={reports}
      locationLabel={locationLabel}
    />
  );
}
