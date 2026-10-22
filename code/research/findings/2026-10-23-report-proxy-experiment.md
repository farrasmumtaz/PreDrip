# Eksperimen proxy laporan DIBI — 23 Oktober 2026

Training berhasil; model **belum layak untuk peringatan banjir**. Targetnya adalah
tanggal kejadian banjir yang tercatat dalam snapshot DIBI untuk Kota Bandung
besok. Label 0 diasumsikan tidak ada laporan dalam snapshot, bukan bukti tidak
banjir. Tidak ada angka cuaca atau kejadian yang direkayasa.

## Input dan pemisahan

- Parquet sumber: 53.900 record, seluruh kejadian 22 April 1972–21 November 2024.
- Filter `3273` dan `Banjir`: 26 record/tanggal kandidat; 16 dalam periode eksperimen.
- Cuaca ERA5: 4.018 hari 2015–2025, seluruh timestamp ketersediaan historis kosong.
- Target eksperimen dibatasi 2015–21 November 2024. Tujuh hari awal tanpa riwayat
  lengkap dilewati. Seluruh 16 tanggal positif tercakup.
- File asli, label kurasi resmi, audit kesiapan training dan risk engine tidak diubah.

| Split | Periode target terpakai | Hari | Laporan | Asumsi tanpa laporan |
| --- | --- | ---: | ---: | ---: |
| Train | 8 Januari 2015–31 Desember 2019 | 1.819 | 7 | 1.812 |
| Validation | 1 Januari 2020–31 Desember 2021 | 731 | 8 | 723 |
| Test | 1 Januari 2022–21 November 2024 | 1.056 | 1 | 1.055 |

Standardisasi/bobot dipelajari hanya dari train. L2 0,01 dan split ditetapkan
sebelum melihat hasil. Pemilihan threshold memakai validation saja; terpilih 0,5.
Spesifikasi fitur dan solver tersedia di [panduan eksperimen](../experiments.md).

## Evaluasi aktual

Confusion matrix berikut membandingkan prediksi dengan **label proxy**.
FP berarti tidak ada laporan pada tanggal itu dalam snapshot; kejadian riilnya
belum diverifikasi.

| Split | TP | FP | TN | FN | Precision | Recall | F1 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Train | 6 | 459 | 1.353 | 1 | 1,29% | 85,71% | 0,0254 |
| Validation | 5 | 219 | 504 | 3 | 2,23% | 62,50% | 0,0431 |
| Test | 1 | 293 | 762 | 0 | 0,34% | 100% | 0,0068 |

Pada test, 294 hari diprediksi positif, hanya satu cocok dengan laporan.
Recall 100% berasal dari **satu tanggal positif**, sehingga tidak memberikan
bukti generalisasi yang kuat. Baseline selalu negatif melewatkan tanggal itu:
recall/F1 0, accuracy 99,91%. Accuracy model 72,25%. Accuracy baseline tinggi
tidak menjadikannya sistem peringatan yang berguna.

Model disimpan lokal di `research/reports/report-proxy-v1/model.json`, evaluasi
di `evaluation.json`, prediksi bertanggal di `predictions.csv`. Semuanya diabaikan
Git. Artefak diberi `operationalUse: false`; skor tidak terkalibrasi dan tidak
dipetakan ke Aman/Waspada/Bahaya. Jangan memilih parameter berikutnya berdasarkan
hasil test ini lalu menyebut test yang sama sebagai evaluasi independen.

## Reproduksibilitas dan keterbatasan

SHA-256:

| Input | Hash |
| --- | --- |
| Cuaca CSV | `19077acc020b566a3f9dab64ac568aa96cac0d3cf5352293cbbdc0992d4e339a` |
| Snapshot impor JSON | `e90ff8c93c9a86acf75ecba14c7ad92fd12e1a17f802561ca2203e29dc294ef3` |
| Parquet asli | `1976133c2af56515c201ac072ed5ec89170483aa59d3c7821ba972681b26fb1e` |

Belum ada verifikasi kelengkapan pelaporan, tanggal kelanjutan banjir, label
negatif, atau waktu historis ketersediaan fitur. Grid cuaca tunggal belum mewakili
seluruh variasi hujan kota. Metadata arsip bukan jaminan cakupan setiap hari.
Langkah berikut yang dibutuhkan adalah meninjau bukti kejadian dan cakupan
pelaporan, menambah observasi positif serta fitur hidrologi yang tersedia pada
waktu prediksi, lalu menetapkan periode evaluasi baru sebelum eksperimen lanjut.
