export type RiskLevel = "AMAN" | "WASPADA" | "BAHAYA";

export interface RiskInput {
  sourceKind: "daily_observation" | "forecast";
  rainfallDailyMm: number | null;
  humidityPercent: number | null;
}

export type RiskResult =
  | { status: "available"; method: "rule-based"; score: number; level: RiskLevel; recommendation: string }
  | { status: "unavailable"; method: "rule-based"; score: null; level: null; recommendation: string };

export function calculateFloodRisk(input: RiskInput): RiskResult {
  const { rainfallDailyMm, humidityPercent } = input;
  if (input.sourceKind !== "daily_observation" || rainfallDailyMm === null || humidityPercent === null ||
      !Number.isFinite(rainfallDailyMm) || !Number.isFinite(humidityPercent) || rainfallDailyMm < 0 ||
      humidityPercent < 0 || humidityPercent > 100) {
    return {
      status: "unavailable", method: "rule-based", score: null, level: null,
      recommendation: "Skor aturan manual memerlukan curah hujan harian dan kelembapan dari observasi yang sesuai. Data prakiraan belum memenuhi input tersebut.",
    };
  }
  // Existing heuristic retained for comparable daily inputs; never a calibrated probability.
  const score = Math.min(rainfallDailyMm * 0.7 + humidityPercent * 0.3, 100);
  const level: RiskLevel = score < 30 ? "AMAN" : score < 70 ? "WASPADA" : "BAHAYA";
  return {
    status: "available", method: "rule-based", score, level,
    recommendation: "Indikator heuristik belum divalidasi untuk keputusan peringatan atau evakuasi. Pantau informasi resmi BPBD/BMKG.",
  };
}
