# Kelayakan perluasan wilayah — 23 Oktober 2026

**Layak untuk eksperimen retrospektif lanjutan, belum untuk peringatan publik.**
Kabupaten Bandung adalah kandidat awal terkuat berdasarkan jumlah tanggal laporan
dan sebarannya per tahun. Audit ini tidak menghasilkan model baru atau bukti
peningkatan precision. Model dashboard Kota Bandung tetap memakai artefak lama.

Pilot: Kota Bandung (3273), Kabupaten Bandung (3204), Kabupaten Bandung Barat
(3217), dan Kota Cimahi (3277). Ini bukan seluruh batas metropolitan Bandung Raya;
Sumedang tidak masuk pilot. Jenis kejadian harus persis `Banjir`; kode dan nama
diperiksa bersama. Nama `Bandung` dengan kode 3204 dalam arsip berarti kabupaten.

## Kejadian 1 Januari 2015–21 November 2024

Arsip pengguna berisi 53.900 record semua jenis bencana, 22 April 1972–21 November
2024. SHA-256 `1976133c2af56515c201ac072ed5ec89170483aa59d3c7821ba972681b26fb1e`.

| Wilayah | Record sumber unik | Tanggal laporan unik | Dengan riwayat cuaca lengkap | 2015–2019 | 2020–2021 | 2022–2024 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Kota Bandung | 16 | 16 | 16 | 7 | 8 | 1 |
| Kabupaten Bandung | 153 | 150 | 149 | 58 | 55 | 37 |
| Bandung Barat | 21 | 21 | 21 | 6 | 11 | 4 |
| Cimahi | 17 | 17 | 17 | 2 | 9 | 6 |
| Total pasangan wilayah–tanggal | 207 | 204 | 203 | 73 | 83 | 48 |

204 bukan jumlah bencana independen atau tanggal kalender unik gabungan. Wilayah
berbeda dapat terdampak pada tanggal sama. Tiga record tambahan Kabupaten Bandung
jatuh pada tanggal yang sama dengan record lain. Semua referensi dipertahankan,
tetapi target harian dihitung sekali per wilayah.

Kabupaten Bandung memiliki tanggal laporan pada setiap tahun 2015–2024:
9, 23, 9, 9, 8, 18, 37, 15, 14, 8. Tahun tanpa laporan pada wilayah lain bukan
bukti tidak ada banjir atau pelaporan lengkap. Tanggal 4 Januari 2015 di Kabupaten
Bandung belum punya tujuh hari riwayat cuaca; perlu data akhir Desember 2014 jika
target itu akan disertakan. Positif 2015–2019 yang berpasangan lengkap adalah 57.

## Cuaca aktual

Tiga snapshot ERA5 baru diunduh lewat Open-Meteo, masing-masing 3.613 hari pada
2015–21 November 2024. Kota Bandung memakai snapshot sebelumnya 4.018 hari sampai
2025; label audit tetap berhenti pada akhir arsip 2024. Tidak ada nilai kosong
pada hujan, kelembapan, dan suhu. Waktu ketersediaan historis tetap tidak diketahui.

| Wilayah | Titik pilot permintaan (lat, lon) | Grid ERA5 hasil (lat, lon) |
| --- | --- | --- |
| Kota Bandung | -6.9175, 107.6191 | -7, 107.5 |
| Kabupaten Bandung | -7.001, 107.625 | -7, 107.75 |
| Bandung Barat | -6.833, 107.49 | -6.75, 107.5 |
| Cimahi | -6.87, 107.54 | -6.75, 107.5 |

Titik pilot adalah perkiraan untuk pemeriksaan data, bukan centroid administrasi,
lokasi seluruh kejadian, atau representasi DAS terverifikasi. Cimahi dan Bandung
Barat memakai grid sama: bukan empat seri cuaca independen. ERA5 beresolusi 0,25°
(sekitar 25 km); keterwakilan wilayah perlu ditinjau.
[Dokumentasi penyedia](https://open-meteo.com/en/docs/historical-weather-api).

SHA-256 CSV baru:

- Kabupaten Bandung: `3c8303c1cc25fe875ea4d1f66d6e77e24b307694bd5ec7efb5e2fea741d8dbe5`
- Bandung Barat: `f95ce5c14eafb25524aafb09ee144dc7dfd2fd23c784fd60051bc9cad126593e`
- Cimahi: `256bc90c5373052c0c2b7d10815d34815989e4690733f445c4069d15436fe0be`

CLI memeriksa kontrak cuaca, hash sesuai manifest, model ERA5, zona waktu, wilayah,
titik permintaan, periode, dan identitas grid. Parquet, snapshot dan hasil JSON
diabaikan Git; sumber asli tidak ditimpa. Izin redistribusi arsip belum dikonfirmasi.

## Keputusan metode

Mulai eksperimen berikut dari Kabupaten Bandung, bandingkan ambang hujan dengan
logistic regression memakai validasi waktu dalam periode pengembangan. Penggabungan
empat wilayah memerlukan fitur wilayah dan penanganan ketergantungan antarwilayah,
bukan menumpuk baris lalu membaginya acak.

Periode 2022–2024 sudah ditinjau pada eksperimen Kota Bandung dan audit ini; jangan
menyebutnya holdout baru yang belum dilihat. Tidak ada hari tanpa laporan yang
dinaikkan menjadi negatif terverifikasi. Seluruh halaman kejadian, durasi banjir,
dan kelengkapan arsip belum diperiksa ulang. Belum ada training regional baru.

Laporan aktual: `research/reports/bandung-raya-feasibility-v3/feasibility.json`.
Reproduksi: [panduan eksperimen](../experiments.md#kelayakan-bandung-raya).
