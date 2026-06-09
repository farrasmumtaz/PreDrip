import { getWeatherByLocation, WeatherData } from "./services/bmkg";

export type RiskLevel =
  | "AMAN"
  | "WASPADA"
  | "BAHAYA";

export interface RiskResult {
  score: number;

  level: RiskLevel;

  recommendation: string;
}

export function calculateFloodRisk(
  weather: WeatherData,
): RiskResult {

  let score = 0;

  score += weather.rainfall * 0.7;

  score += weather.humidity * 0.3;

  score = Math.min(score, 100);

    if (score < 30) {
    return {
      score,

      level: "AMAN",

      recommendation:
        "Kondisi aman. Tetap pantau cuaca.",
    };
  }

  if (score < 70) {
    return {
      score,

      level: "WASPADA",

      recommendation:
        "Siapkan langkah antisipasi banjir.",
    };
  }

  return {
    score,

    level: "BAHAYA",

    recommendation:
      "Segera siapkan evakuasi.",
  };
}

const weather = await getWeatherByLocation(
  -6.9175,
  107.6191,
);

const risk =
  calculateFloodRisk(weather);