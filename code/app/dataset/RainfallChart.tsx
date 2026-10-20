import type { MonthlyRainfall } from "@/research/src/dataset-view";

import styles from "./dataset.module.css";

const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const number = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 });

export default function RainfallChart({ data, year }: { data: MonthlyRainfall[]; year: number }): React.ReactElement {
  const max = Math.max(100, ...data.map((item) => item.totalMm ?? 0));
  const upperBound = Math.ceil(max / 100) * 100;
  const chart = { left: 56, top: 22, width: 696, height: 208 };
  const step = chart.width / 12;
  const knownMonths = data.filter((item) => item.totalMm !== null);

  return (
    <figure className={styles.chart}>
      <div className={styles.chartLegend}><span /> Akumulasi hujan bulanan · mm</div>
      <svg viewBox="0 0 780 276" role="img" aria-labelledby="rainfall-title rainfall-description">
        <title id="rainfall-title">{`Curah hujan bulanan Kota Bandung tahun ${year}`}</title>
        <desc id="rainfall-description">Akumulasi hujan dari reanalisis ERA5. Angka setiap bulan tersedia pada tabel di bawah grafik. Bulan tanpa data ditandai tanda pisah.</desc>
        {[0, 1, 2, 3, 4].map((tick) => {
          const y = chart.top + chart.height - tick * chart.height / 4;
          return (
            <g key={tick}>
              <line x1={chart.left} x2={chart.left + chart.width} y1={y} y2={y} stroke="#e6edf2" strokeDasharray={tick === 0 ? undefined : "4 5"} />
              <text x={chart.left - 12} y={y + 4} textAnchor="end" fill="#6b7d8d" fontSize="12">{number.format(upperBound * tick / 4)}</text>
            </g>
          );
        })}
        {data.map((item, index) => {
          const height = (item.totalMm ?? 0) / upperBound * chart.height;
          const x = chart.left + step * index + 12;
          return (
            <g key={item.month}>
              {item.totalMm === null ? (
                <text x={x + 17} y={chart.top + chart.height - 10} textAnchor="middle" fill="#91a0ad">—</text>
              ) : (
                <rect x={x} y={chart.top + chart.height - height} width="34" height={height} rx="5" fill={item.totalMm === max ? "#155e75" : "#33a6a0"}>
                  <title>{`${months[index]}: ${number.format(item.totalMm)} mm; ${item.observedDays} hari terukur, ${item.missingDays} hari kosong`}</title>
                </rect>
              )}
              <text x={x + 17} y="254" textAnchor="middle" fill="#6b7d8d" fontSize="12">{months[index]}</text>
            </g>
          );
        })}
      </svg>
      <figcaption>Jumlah dari {knownMonths.reduce((total, item) => total + item.observedDays, 0)} hari dengan nilai hujan. Total bulanan yang memiliki hari kosong masih bersifat parsial.</figcaption>
      <details className={styles.chartDetails}>
        <summary>Lihat angka per bulan</summary>
        <div className={styles.tableScroll}>
          <table className={styles.table}>
            <caption className={styles.visuallyHidden}>Rincian akumulasi curah hujan {year}</caption>
            <thead><tr><th scope="col">Bulan</th><th scope="col">Hujan (mm)</th><th scope="col">Hari terukur</th><th scope="col">Hari kosong</th></tr></thead>
            <tbody>{data.map((item, index) => (
              <tr key={item.month}><th scope="row">{months[index]} {year}</th><td>{item.totalMm === null ? "Belum ada data" : number.format(item.totalMm)}</td><td>{item.observedDays}</td><td>{item.missingDays}</td></tr>
            ))}</tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
