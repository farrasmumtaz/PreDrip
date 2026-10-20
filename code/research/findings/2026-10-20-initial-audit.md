# Audit awal dataset asli: Husein Bandung

Tanggal pemeriksaan: **20 Oktober 2026 WIB**.
Tujuan: memeriksa apakah sumber cuaca dapat mendukung target banjir hari berikutnya
untuk wilayah kandidat Kota Bandung pada periode proposal 2015–2025.

## Data yang diperoleh

- Sumber: [SACA&D BMKG, custom query](https://sacad.bmkg.go.id/dailydata/customquery.php).
- Kueri publik: Indonesia, HUSEIN - BANDUNG (STAID metadata 153), precipitation
  amount/RR, non-blended, seluruh tahun yang tersedia; SOUID 101993.
- Arsip lokal: `research/data/raw/saca-husein-bandung-rr.zip`.
- Isi yang diekstrak: `RR_SOUID101993.txt` (671.460 byte), `sources.txt` (1.366 byte).
- File sumber bertanggal 19 Oktober 2026; ini tanggal pembuatan ekspor, bukan bukti
  bahwa pengukuran tersedia sampai 2026.
- Atribusi dalam ekspor: van den Besselaar and Coauthors (2015), International
  Climate Assessment & Dataset (ICA&D): climate services across borders,
  doi:10.1175/BAMS-D-13-00249.1. Pertahankan header sumber dan ketentuan atribusinya.

| Pemeriksaan | Hasil aktual |
|---|---:|
| Total baris data | 18.628 |
| Rentang tanggal baris | 1975-01-01 sampai 2025-12-31 |
| Observasi valid, Q_RR=0 | 2.985 |
| Rentang tanggal observasi valid | 1975-01-01 sampai 1989-12-31 |
| Missing, Q_RR=9 / RR=-9999 | 15.643 |
| Suspect, Q_RR=1 | 0 |
| Baris periode 2015–2025 | 4.018 |
| Observasi valid periode 2015–2025 | **0** |
| Record format invalid / duplikat sumber-tanggal | 0 / 0 |
| STAID metadata / STAID pada record | **153 / 1993** |
| SOUID metadata / SOUID pada record | 101993 / 101993 |
| Curah hujan valid minimum–maksimum | 0–200 mm |

RR mentah bersatuan **0,1 mm**, sehingga nilai 70 berarti 7 mm. Kode missing
tidak dikonversi menjadi nol. Statistik observasi valid memakai flag kualitas;
keberadaan tanggal sampai 2025 tidak dianggap cakupan data terukur sampai 2025.
Jumlah valid pada rentang 1975–1989 juga tidak berarti setiap hari di rentang itu lengkap.

**Keputusan: kandidat ditolak untuk periode 2015–2025.** Perbedaan ID adalah
ketidakkonsistenan yang perlu diklarifikasi ke sumber, bukan alasan mengubah ID
tanpa bukti. Seri dipertahankan sebagai bahan audit dan pembelajaran cleaning,
belum dinormalisasi menjadi input model PreDrip.

## Reproduksibilitas

```powershell
npm.cmd run data:inspect:saca -- --file research/data/raw/RR_SOUID101993.txt --station 153 --source 101993 --start 2015-01-01 --end 2025-12-31
```

Laporan mesin lokal: `research/reports/saca-bandung-2015-2025.json`.
Inspector mengembalikan exit 2 karena kandidat ditolak, bukan karena gagal dieksekusi.

| File | SHA-256 |
|---|---|
| Arsip ZIP | `48d034f9544ab8cf533a43c8adc7bec58b736230935fe2965d6b9731d239f465` |
| RR_SOUID101993.txt | `a13ed2fbc8493b088c349b1124860d2c3f2ddd1b47259b49a95dd48049da248c` |
| sources.txt | `63bae59ca276adcc23bdd64f9752d7142575574f9e4bcc7e91172a5de57ce424` |

## Yang masih dibutuhkan

1. Contoh observasi harian modern dari BMKG Data Online/PTSP atau sumber resmi lain,
   disertai metadata stasiun, periode ukur, flag kualitas, dan latensi publikasi.
   [FAQ BMKG](https://dataonline.bmkg.go.id/faq) menyebut pembatasan portal dua tahun
   terakhir; ketersediaan periode proposal belum terkonfirmasi.
2. Catatan banjir terverifikasi dengan tanggal, wilayah, durasi/cakupan kejadian,
   dan informasi cakupan pemantauan untuk membenarkan label 0. Tabel BNPB mengalami
   HTTP 500 saat diakses dalam sesi ini; belum ada ekspor label yang diunduh.
3. Irisan lokasi/periode kedua sumber sebelum wilayah/periode studi difinalkan.

Tahap persiapan kontrak dan audit kandidat pertama selesai. Akuisisi dataset
yang layak, audit pasangan cuaca–label asli, dan training **belum selesai**.
Tidak ada hasil akurasi, probabilitas banjir, atau performa Bandung yang diklaim.
