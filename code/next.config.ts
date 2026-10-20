import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  outputFileTracingIncludes: {
    "/dataset": [
      "./research/data/raw/era5-kota-bandung-2015-01-01-2025-12-31.manifest.json",
      "./research/data/normalized/era5-kota-bandung-2015-01-01-2025-12-31.weather.csv",
      "./research/evidence/kota-bandung-positive-labels.csv",
    ],
  },
};

export default nextConfig;
