import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  outputFileTracingIncludes: {
    "/dashboard": [
      "./research/reports/report-proxy-v1/model.json",
      "./research/data/normalized/era5-kota-bandung-2015-01-01-2025-12-31.weather.csv",
      "./research/data/normalized/dibi-kota-bandung.events.json",
    ],
    "/dataset": [
      "./research/data/raw/era5-kota-bandung-2015-01-01-2025-12-31.manifest.json",
      "./research/data/normalized/era5-kota-bandung-2015-01-01-2025-12-31.weather.csv",
      "./research/evidence/kota-bandung-positive-labels.csv",
    ],
  },
};

export default function config(phase: string): NextConfig {
  return { ...nextConfig, distDir: phase === PHASE_DEVELOPMENT_SERVER ? ".next-dev" : ".next" };
}
