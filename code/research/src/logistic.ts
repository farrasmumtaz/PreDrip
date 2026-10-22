export interface LogisticModel {
  method: "weighted-logistic-regression";
  means: number[];
  scales: number[];
  coefficients: number[];
  intercept: number;
  iterations: number;
  gradientMax: number;
  l2: number;
}
function sigmoid(value: number): number { return value >= 0 ? 1 / (1 + Math.exp(-value)) : Math.exp(value) / (1 + Math.exp(value)); }
function dot(a: readonly number[], b: readonly number[]): number { return a.reduce((sum, value, index) => sum + value * b[index]!, 0); }
function checkRows(x: readonly number[][], y: readonly number[]): number {
  const width = x[0]?.length ?? 0;
  if (!width || x.length !== y.length || x.some((row) => row.length !== width || row.some((value) => !Number.isFinite(value))) || y.some((value) => value !== 0 && value !== 1)) throw new Error("Matriks training/label tidak valid.");
  if (!y.includes(0) || !y.includes(1)) throw new Error("Training memerlukan kedua kelas proxy.");
  return width;
}

export function fitLogistic(x: readonly number[][], y: readonly number[]): LogisticModel {
  const width = checkRows(x, y);
  const means = Array.from({ length: width }, (_, index) => x.reduce((sum, row) => sum + row[index]!, 0) / x.length);
  const scales = means.map((mean, index) => Math.sqrt(x.reduce((sum, row) => sum + (row[index]! - mean) ** 2, 0) / x.length) || 1);
  const scaled = x.map((row) => row.map((value, index) => (value - means[index]!) / scales[index]!));
  const positive = y.filter((value) => value === 1).length;
  const weights = y.map((value) => x.length / (2 * (value ? positive : x.length - positive)));
  let coefficients = Array<number>(width).fill(0);
  let intercept = 0;
  const l2 = 0.01;
  function loss(beta: readonly number[], bias: number): number {
    return scaled.reduce((sum, row, index) => {
      const z = dot(row, beta) + bias;
      return sum + weights[index]! * (Math.max(z, 0) - y[index]! * z + Math.log1p(Math.exp(-Math.abs(z))));
    }, 0) / x.length + l2 * dot(beta, beta) / 2;
  }
  let iterations = 0;
  let gradientMax = Infinity;
  for (; iterations < 10_000; iterations += 1) {
    const gradient = coefficients.map((value) => l2 * value);
    let biasGradient = 0;
    for (let row = 0; row < scaled.length; row += 1) {
      const error = weights[row]! * (sigmoid(dot(scaled[row]!, coefficients) + intercept) - y[row]!) / x.length;
      biasGradient += error;
      for (let column = 0; column < width; column += 1) gradient[column]! += error * scaled[row]![column]!;
    }
    gradientMax = Math.max(Math.abs(biasGradient), ...gradient.map(Math.abs));
    if (gradientMax < 1e-7) break;
    const before = loss(coefficients, intercept);
    let step = 1;
    let accepted = false;
    for (let attempt = 0; attempt < 30; attempt += 1) {
      const next = coefficients.map((value, index) => value - step * gradient[index]!);
      const bias = intercept - step * biasGradient;
      if (loss(next, bias) <= before - 1e-4 * step * (dot(gradient, gradient) + biasGradient ** 2)) { coefficients = next; intercept = bias; accepted = true; break; }
      step /= 2;
    }
    if (!accepted) throw new Error("Optimisasi logistic tidak menurun; hasil tidak disimpan.");
  }
  if (iterations === 10_000 || !Number.isFinite(gradientMax)) throw new Error("Optimisasi logistic belum konvergen; hasil tidak disimpan.");
  return { method: "weighted-logistic-regression", means, scales, coefficients, intercept, iterations, gradientMax, l2 };
}

export function scoreLogistic(model: LogisticModel, row: readonly number[]): number {
  if (row.length !== model.means.length || row.some((value) => !Number.isFinite(value))) throw new Error("Fitur inferensi tidak sesuai model.");
  return sigmoid(model.intercept + dot(row.map((value, index) => (value - model.means[index]!) / model.scales[index]!), model.coefficients));
}

export function evaluate(labels: readonly number[], scores: readonly number[], threshold: number) {
  if (!labels.length || labels.length !== scores.length || !Number.isFinite(threshold) || threshold < 0 || threshold > 1 || labels.some((value) => value !== 0 && value !== 1) || scores.some((value) => !Number.isFinite(value) || value < 0 || value > 1)) throw new Error("Input evaluasi tidak valid.");
  let tp = 0, fp = 0, tn = 0, fn = 0;
  labels.forEach((label, index) => { if (scores[index]! >= threshold) { if (label) tp += 1; else fp += 1; } else if (label) fn += 1; else tn += 1; });
  const precision = tp + fp ? tp / (tp + fp) : null;
  const recall = tp + fn ? tp / (tp + fn) : null;
  return { rows: labels.length, positives: tp + fn, tp, fp, tn, fn, precision, recall, f1: tp + fp + fn ? 2 * tp / (2 * tp + fp + fn) : null, accuracy: (tp + tn) / labels.length, predictedReports: tp + fp };
}

export function chooseThreshold(labels: readonly number[], scores: readonly number[]): number {
  if (!labels.includes(0) || !labels.includes(1)) throw new Error("Validation memerlukan kedua kelas untuk memilih threshold.");
  return [0.1, 0.25, 0.5, 0.75, 0.9].map((threshold) => ({ threshold, metrics: evaluate(labels, scores, threshold) }))
    .sort((a, b) => (b.metrics.f1 ?? -1) - (a.metrics.f1 ?? -1) || (b.metrics.precision ?? -1) - (a.metrics.precision ?? -1) || b.threshold - a.threshold)[0]!.threshold;
}
