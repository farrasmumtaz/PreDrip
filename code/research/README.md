# PreDrip: fondasi dataset dan audit awal

Status 20 Oktober 2026: kontrak, template, CLI audit, dan pengujian tersedia.
Seri SACA&D Husein Bandung sudah diaudit dan tidak cocok untuk 2015–2025.
Alternatif **reanalisis ERA5** 2015–2025 telah diunduh dan dinormalisasi: 4.018 hari,
tanpa nilai kosong pada tiga fitur yang diminta. ERA5 bukan observasi stasiun BMKG
dan tidak membuktikan ketersediaan fitur pada cutoff operasional. Dataset gabungan
cuaca dan label yang layak training belum tersedia. Dua label positif awal dari
rilis resmi sudah dikurasi untuk audit pasangan; kelas negatif belum tersedia.
Update 23 Oktober 2026: training retrospektif dengan label proxy laporan DIBI
sudah dijalankan melalui [pipeline eksperimen](experiments.md). Hasilnya belum
membuktikan kemampuan peringatan banjir; dataset resmi tetap blocked.
Angka pada `fixtures/` seluruhnya sintetis.
Lihat [hasil audit data asli](findings/2026-10-20-initial-audit.md).
Lihat pula [hasil akuisisi ERA5](findings/2026-10-20-era5-acquisition.md).
Referensi label awal tersedia di [catatan bukti](evidence/README.md).

## Melihat dataset di web

Jalankan aplikasi, login, lalu buka `/dataset` atau pilih **Dataset & Audit** pada
dashboard. Halaman menampilkan ringkasan audit aktual, grafik akumulasi hujan bulanan
dengan pilihan tahun, tabel angka per bulan, cakupan label, bukti kejadian, dan
kesiapan eksperimen. Filter tahun memakai query `?year=2024` dan dirender di server.

CSV serta manifest dibaca dari snapshot ERA5 lokal dan bukti label yang dilacak Git;
laporan audit JSON lama tidak dipakai sebagai sumber angka. SHA-256 CSV, periode,
jumlah hari, dan identitas seri diperiksa sebelum data ditampilkan. Jika snapshot
belum tersedia atau tidak konsisten, halaman menampilkan status yang sesuai.
Instalasi baru perlu menjalankan akuisisi ERA5 terlebih dahulu. Data tidak diunduh
otomatis ketika seseorang membuka halaman. Snapshot lokal disertakan pada file
tracing build route `/dataset`; deployment tetap memerlukan file tersebut.

Halaman memerlukan login pada direct route dan menggunakan Server Component.
Tidak ada endpoint API baru atau perubahan database. Grafik membedakan nol hujan,
nilai kosong, dan bulan yang belum memiliki observasi. Persentase label adalah
cakupan bukti, bukan probabilitas banjir. Dashboard cuaca utama masih modul terpisah.

Verifikasi HTTP setelah server lokal aktif:

```powershell
npm.cmd run data:test:web
```

Verifikasi memakai user/session uji sementara yang dihapus pada akhir pemeriksaan;
tidak memerlukan kredensial pengguna. Target default `http://127.0.0.1:3000`, hanya
menerima host loopback. Pemeriksaan mencakup redirect tanpa login, isi audit,
tautan sumber, filter tahun, dan fallback parameter yang tidak valid.

## Pertanyaan eksperimen

Dengan informasi yang benar-benar tersedia paling lambat pukul 23:59:59.999 WIB
pada tanggal D, apakah **ada banjir pada tanggal D+1** di satu wilayah studi?

- Wilayah kandidat: **Kota Bandung**, `region_id=kota-bandung`.
  Kabupaten Bandung dan Kabupaten Bandung Barat merupakan wilayah berbeda.
  Pemilihan final mengikuti kecocokan catatan kejadian dan stasiun cuaca.
- Unit data: satu wilayah pada satu tanggal kalender WIB; satu seri sumber tetap
  sebagai input awal (stasiun atau grid yang ditandai eksplisit). Penggabungan
  beberapa sumber memerlukan desain tersendiri.
- Horizon: satu hari; output klasifikasi harian, tanpa klaim waktu/jam banjir.
- Periode belum ditetapkan: ambil irisan periode observasi dan label yang valid.
  Rentang 2015–2025 dalam proposal bukan bukti bahwa data tersebut tersedia.
- Definisi label 1: ada banjir pada hari target, termasuk kelanjutan kejadian
  sebelumnya bila sumber mengonfirmasinya. Ini bukan target khusus onset banjir.
  Daftar tanggal mulai kejadian saja belum cukup untuk label semua hari terdampak.
- Cutoff di atas adalah rancangan eksperimen. Jika observasi harian baru tersedia
  pukul 07.00 hari berikutnya, lag/ubah periode fitur; jangan menggeser timestamp
  agar terlihat tersedia sebelum cutoff. Model operasional harus mengikuti latensi nyata.

## Kontrak CSV normalisasi v1

CSV UTF-8, delimiter koma, header wajib (urutan bebas), angka desimal memakai titik,
tanggal `YYYY-MM-DD`. File mentah vendor dipertahankan terpisah. CSV bukan format
impor langsung Excel BMKG. `source_ref` menunjuk file/bagian dokumen/ID rekaman asli
yang dapat ditelusuri lewat catatan akuisisi.

`templates/weather.csv`:

| Kolom | Ketentuan |
|---|---|
| `date` | Tanggal periode observasi yang sudah dipetakan ke definisi hari studi. |
| `region_id` | ID wilayah studi yang konsisten. |
| `station_id` | ID seri sumber: ID stasiun asli untuk observasi; prefix `grid:era5:` untuk grid reanalisis dengan koordinat sebenarnya pada manifest. Jangan diganti ID wilayah. Nama kolom dipertahankan untuk kompatibilitas kontrak v1. |
| `rainfall_mm` | Curah hujan harian mm; kosong jika missing, 0 hanya jika nol terukur. |
| `humidity_pct` | Rata-rata kelembapan 0–100%; boleh kosong dan diaudit. |
| `temperature_c` | Rata-rata suhu °C; boleh kosong dan diaudit. |
| `available_at` | Waktu fitur pertama tersedia, ISO 8601 dengan offset/Z; kosong jika tidak diketahui. Bukan waktu download sekarang. |
| `source_ref` | Referensi bukti observasi dan konvensi periode/waktu ketersediaan. Wajib. |

`templates/flood-labels.csv`:

| Kolom | Ketentuan |
|---|---|
| `date` | Tanggal banjir diamati/terjadi di wilayah, bukan waktu laporan diunggah. |
| `region_id` | Wilayah yang sama dengan cuaca. |
| `flood_status` | `1` = banjir terkonfirmasi; `0` = ketiadaan banjir didukung cakupan pemantauan; `unknown` = tidak cukup bukti. |
| `source_ref` | Wajib untuk 0/1; referensi sumber dan cakupan pemantauan negatif harus dapat ditinjau. |

Jangan membuat label 0 hanya dari tanggal yang tidak ada di daftar kejadian.
Agregasikan beberapa kejadian pada wilayah/hari yang sama dengan aturan terdokumentasi;
CLI menolak duplikat, bukan memilih salah satunya. Data crowd report aplikasi saat ini
belum otomatis menjadi ground truth. Tanggal `createdAt` bukan jaminan tanggal kejadian.

Kode khusus seperti 8888, 9999, atau -9999 ditolak sebagai angka cuaca. Baca kamus
dataset yang benar sebelum mengubahnya menjadi missing. Batas fisik di CLI hanya
pemeriksaan awal; nilai dalam rentang belum otomatis benar. Jangan mengisi missing
dengan nol/median global. Transformasi yang belajar statistik dilakukan dari training
saja setelah rancangan split waktu tersedia.

## Menjalankan di PowerShell

Dari `C:\PreDrip\code`, gunakan dependency yang sudah terpasang:

```powershell
npm.cmd run data:test
npm.cmd run data:audit -- --help
npm.cmd run data:audit:example
```

Contoh mencetak audit ke terminal dan bisa dijalankan berulang. Salinan hasil
pemeriksaan awal tersedia lokal di `research/reports/example.synthetic.json`.
Untuk menyimpan audit gunakan `--out <nama-baru.json>`; CLI menolak menimpa output
yang sudah ada. Contoh sintetis sengaja berisi missing dan timestamp yang terlambat.

Audit ulang seri asli yang sudah diunduh:

```powershell
npm.cmd run data:inspect:saca -- --file research/data/raw/RR_SOUID101993.txt --station 153 --source 101993 --start 2015-01-01 --end 2025-12-31
```

Exit 2 pada inspeksi ini adalah hasil penolakan kandidat sesuai audit, bukan crash.
Seri mentah memakai 0,1 mm; inspector menampilkan statistik valid dalam mm dan
memisahkan flag valid/suspect/missing. Baris bertanggal 2025 dengan flag missing
tidak dihitung sebagai observasi 2025. Perbedaan STAID dengan metadata dilaporkan,
bukan diperbaiki tanpa konfirmasi. Inspector tidak mengekspor data training.

Setelah data asli dinormalisasi ke dua file tersebut:

```powershell
npm.cmd run data:audit -- --weather research/data/normalized/weather.csv --labels research/data/normalized/flood-labels.csv --region kota-bandung --kind historical --out research/reports/audit-historical-001.json
```

## Mengunduh kandidat ERA5

```powershell
npm.cmd run data:acquire:era5 -- --latitude=-6.9175 --longitude=107.6191 --region kota-bandung --start 2015-01-01 --end 2025-12-31
```

Snapshot periode ini sudah tersedia lokal. Pengulangan sengaja ditolak sebelum
request jaringan jika nama output sudah ada; pakai `--name era5-bandung-refresh-001`
untuk snapshot baru. Jalankan `--help` untuk melihat argumen. Tidak ada API key
atau dependency baru yang dibutuhkan. Penggunaan endpoint publik mengikuti
[ketentuan penyedia](https://open-meteo.com/en/terms).

Satu eksekusi menghasilkan JSON mentah, manifest berisi URL request/koordinat grid/
unit/SHA-256, dan CSV normalisasi. Model dipatok `era5`, hari mengikuti `Asia/Jakarta`,
satuan mm/°C, grid terdekat tanpa penyesuaian elevasi. CLI memvalidasi format,
panjang array, urutan kalender, rentang fisik awal, timezone, dan satuan sebelum
menulis. Null tetap missing, nol tetap nol. Raw data dan hasil normalisasi lokal
tidak dimasukkan ke Git.

ERA5 mempunyai latensi publikasi/revisi. Semua `available_at` sengaja kosong
karena waktu ketersediaan historis per hari belum diverifikasi. Waktu unduh tidak
boleh menjadi penggantinya. Data ini dapat dipakai untuk EDA/eksperimen retrospektif;
training untuk target operasional D+1 tetap membutuhkan rancangan fitur yang
tersedia pada cutoff serta label 0/1 terverifikasi.

## Menjalankan audit pasangan

Audit pilot cuaca ERA5 asli dan dua label positif yang telah diperiksa:

```powershell
npm.cmd run data:audit:pilot
```

Hasil saat ini: 4.018 hari cuaca, 2 pasangan label besok positif, 0 label negatif,
4.016 hari tanpa label besok. Semua waktu ketersediaan fitur belum diverifikasi,
sehingga `completeAvailablePairs=0` dan `trainingReadiness=blocked`.
Ini hasil audit data asli parsial, bukan performa model.

`--kind historical` adalah deklarasi pemilik data, bukan verifikasi otomatis sumber.
CLI audit tidak menggunakan database aplikasi, tidak memanggil BMKG, dan tidak mengimpor
snapshot dummy dashboard. Input asli tidak diubah. Output menyimpan SHA-256 kedua
file untuk reproduksibilitas. Raw data, normalisasi, hasil audit, serta hasil kompilasi
diabaikan Git; kontrak, template, kode, fixture sintetis, dan kurasi kecil label
positif beserta referensi publiknya dilacak.

## Membaca hasil

- `issues`: record invalid, duplikat, konflik wilayah, satuan/format bermasalah.
  Statistik memakai record valid; jika ada issue, hasil masih parsial.
- `weather`: periode, stasiun, gap kalender **di antara tanggal valid pertama/terakhir**,
  nilai kosong, waktu ketersediaan tidak diketahui, atau melewati cutoff.
  Kekurangan di luar rentang file harus dibandingkan manual dengan rencana akuisisi.
- `labels`: jumlah 1, 0, unknown yang valid; rasio ini mengikuti cakupan sumber,
  belum otomatis mencerminkan prevalensi banjir sebenarnya.
- `nextDayAlignment`: cuaca D dicocokkan dengan label D+1 berdasarkan kalender,
  bukan baris berikutnya. `completeAvailablePairs` hanya menghitung pasangan dengan
  ketiga fitur lengkap dan tersedia sebelum cutoff, bukan dataset siap training.
- `structuralStatus=pass`: bentuk input lolos; missing/gap/label unknown masih mungkin ada.
  Exit 0 untuk struktur lolos, 2 untuk struktur bermasalah/input kosong, 1 untuk
  kegagalan format CSV/argumen/IO. Baca `blockers` walaupun exit 0.
- `trainingReadiness=blocked`: alat ini tidak menyetujui training otomatis.
  Provenance, keterwakilan spasial, konvensi waktu, dan label negatif perlu review.

## Akuisisi berikutnya dan kriteria selesai tahap dataset

1. Gunakan [daftar sumber yang sudah diperiksa](sources.md), prioritaskan observasi
   harian stasiun yang mewakili wilayah dan catatan kejadian bertanggal.
2. Peroleh contoh satu periode yang tumpang tindih terlebih dahulu, kemudian perluas
   jika cocok. Simpan file asli dalam `data/raw/` dan catat URL, tanggal akses, pembuat,
   lisensi/izin, stasiun, periode, definisi hari, kode missing, dan cakupan pelaporan
   dalam salinan `templates/acquisition-notes.md` di `data/raw/`.
3. Cocokkan lokasi dan waktu. Pastikan ada bukti memadai untuk label 0 serta 1;
   simpan ketidakpastian sebagai unknown. Jika negatif tidak dapat dibuktikan,
   revisi rancangan label/eksperimen sebelum supervised training.
4. Normalisasi salinan data ke template, jalankan audit, perbaiki konflik sumber,
   lalu dokumentasikan periode terpilih dan keterbatasannya.
5. Tahap dataset selesai setelah data asli diperoleh, audit aktual ditinjau, definisi
   target/cutoff disepakati berdasarkan sumber, dan kedua kelas cukup untuk rancangan
   split waktu. Belum ada ambang jumlah kejadian yang dianggap cukup secara otomatis.

Setelah itu: cleaning terdokumentasi, EDA, fitur lag/akumulasi hujan, split waktu,
baseline sederhana → Logistic Regression → Random Forest → LSTM bila mendukung.
Evaluasi precision, recall, F1, confusion matrix serta alarm palsu/banjir terlewat.
