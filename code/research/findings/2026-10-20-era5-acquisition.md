# Akuisisi kandidat cuaca modern: ERA5

Tanggal: 20 Oktober 2026 WIB. Jenis sumber: **reanalisis grid**, melalui
[Open-Meteo Historical Weather API](https://open-meteo.com/en/docs/historical-weather-api),
berdasarkan ERA5 Copernicus C3S/ECMWF. Bukan observasi stasiun BMKG.

## Hasil aktual

| Pemeriksaan | Hasil |
|---|---|
| Periode | 2015-01-01 sampai 2025-12-31 |
| Jumlah hari | 4.018 |
| Missing hujan / kelembapan / suhu | 0 / 0 / 0 |
| Timezone / offset | Asia/Jakarta / +07:00 |
| Koordinat request | -6.9175, 107.6191 |
| Koordinat grid keluaran | -7, 107.5 |
| Elevasi grid | 1.030 m |
| Model / resolusi | ERA5 / 0,25 derajat |
| Seleksi sel / elevasi | nearest / nan (tanpa penyesuaian elevasi) |
| Waktu unduh | 2026-10-20T00:04:58.351Z |
| Ketersediaan fitur pada cutoff historis | belum diverifikasi, 4.018 `available_at` kosong |

JSON mentah, manifest, dan CSV lokal:

- `research/data/raw/era5-kota-bandung-2015-01-01-2025-12-31.json`
- `research/data/raw/era5-kota-bandung-2015-01-01-2025-12-31.manifest.json`
- `research/data/normalized/era5-kota-bandung-2015-01-01-2025-12-31.weather.csv`

SHA-256 JSON mentah:
`1884dc09c24a05ca4afd7466f8e1559125f5f9dc8a6a3ecdc959cb9c76d08fe4`

SHA-256 CSV normalisasi:
`19077acc020b566a3f9dab64ac568aa96cac0d3cf5352293cbbdc0992d4e339a`

```powershell
npm.cmd run data:acquire:era5 -- --latitude=-6.9175 --longitude=107.6191 --region kota-bandung --start 2015-01-01 --end 2025-12-31
```

CLI menolak snapshot yang sudah ada sebelum memanggil API. Gunakan `--name`
baru untuk mengambil ulang; hash raw dapat berubah karena metadata waktu generasi
API atau revisi data. Manifest setiap snapshot mencatat URL permintaannya.

## Keputusan penggunaan

Layak sebagai **kandidat EDA dan pengembangan metode retrospektif**. Kelengkapan
file tidak membuktikan ketepatan nilai atau keterwakilan spasial seluruh kota.
Grid tunggal belum dapat mendukung klaim hyper-local.

Publikasi ERA5 terlambat terhadap tanggal pengamatan. Jangan memakai cuaca D pada
cutoff D untuk mengklaim evaluasi peringatan operasional tanpa meninjau latensi
dan revisinya. Kolom `available_at` tetap kosong; waktu unduh bukan penggantinya.
Untuk melanjutkan target operasional, diperlukan observasi/prakiraan yang tersedia
pada cutoff atau rancangan fitur berlambat yang dapat dibuktikan.

Belum ada label harian terverifikasi yang mencakup dua kelas, cleaning terlatih,
split waktu, training, atau skor evaluasi. `trainingReadiness` tetap blocked.

Atribusi: weather data by Open-Meteo.com, based on ERA5 Copernicus Climate Change
Service information. Penggunaan mengikuti [ketentuan Open-Meteo](https://open-meteo.com/en/terms).
