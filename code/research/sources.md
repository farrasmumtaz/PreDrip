# Pemeriksaan sumber dataset PreDrip

Diperiksa 20 Oktober 2026 lewat halaman publik, seri RR SACA&D, dan API ERA5.
Seri SACA&D tidak cocok untuk 2015–2025. Kandidat ERA5 2015–2025 berhasil diunduh
dan dinormalisasi untuk eksperimen retrospektif. Dua hari positif dari rilis resmi
sudah dikurasi; label harian lengkap dan kelas negatif belum diperoleh.

| Sumber | Temuan | Keputusan awal |
|---|---|---|
| [BMKG Data Online: FAQ](https://dataonline.bmkg.go.id/faq) | Ada parameter RR (mm), RH_avg (%), Tavg (°C), dan ss (penyinaran, jam). Portal menjelaskan akun/login serta batas akses dua tahun terakhir; halaman juga menyebut menu Data Bulanan dan batas unduh per bulan. | Kandidat utama observasi. Periksa contoh unduhan untuk memastikan resolusi dan stasiun yang benar. Periode 2015–2025 belum terkonfirmasi. Kebutuhan di luar layanan publik dapat dikonsultasikan lewat PTSP yang ditautkan BMKG; belum ada permintaan yang dikirim. |
| [SACA&D: daily data](https://sacad.bmkg.go.id/dailydata/index.php) dan [subset](https://sacad.bmkg.go.id/dailydata/predefinedseries.php) | Seri harian stasiun; sebagian dapat diakses untuk riset nonkomersial. Seri blended dapat mengisi data dari stasiun sekitar. | Kandidat alternatif, periksa flag kualitas, izin, periode, dan risiko memakai infilling yang tidak tersedia pada cutoff historis. Non-blended diprioritaskan untuk pemeriksaan awal. |
| [SACA&D: stasiun RR](https://sacad.bmkg.go.id/download/data/stations_rr.txt), [sumber RR](https://sacad.bmkg.go.id/download/data/SACA_nonblend_info_rr.txt), dan [kueri publik](https://sacad.bmkg.go.id/dailydata/customquery.php) | Metadata menyebut HUSEIN - BANDUNG STAID 153, SOUID 101993, periode 1975–1989. Unduhan aktual berisi 18.628 baris 1975–2025, tetapi hanya 2.985 observasi valid pada 1975–1989; 2015–2025 seluruhnya missing. STAID isi seri 1993 berbeda dari metadata 153. | **Ditolak untuk periode proposal 2015–2025.** Selisih ID memerlukan klarifikasi; tidak dikoreksi diam-diam. Seri ini tidak membuktikan bahwa semua sumber/stasiun BMKG lain juga tidak memiliki data modern. |
| [BNPB: tabel pencarian data bencana](https://gis.bnpb.go.id/databencana/tabel/pencarian.php) | Indeks pencarian publik memperlihatkan kolom tanggal kejadian, jenis, lokasi, kabupaten, dan provinsi. Pembukaan alat web gagal; permintaan terminal dengan akses jaringan menghasilkan HTTP 500. | Kandidat label kejadian, perlu akses/ekspor resmi dan verifikasi rentang serta kelengkapan Bandung. Tidak membuktikan hari tanpa banjir. |
| [Portal SDI: jumlah kejadian bencana Jawa Barat](https://data.go.id/dataset/dataset/jumlah-kejadian-bencana-berdasarkan-jenis-bencana-di-jawa-barat1) | Metadata berisi jumlah kejadian dan tahun dengan agregasi kabupaten/kota; contoh ini tidak menyediakan tanggal tiap kejadian. | Hanya konteks/EDA agregat. Tidak cocok langsung sebagai label banjir harian. |
| [API prakiraan BMKG](https://data.bmkg.go.id/prakiraan-cuaca/) | Prakiraan tiga hari, interval tiga jam. | Kandidat integrasi tampilan cuaca di tahap lain. Bukan observasi historis untuk dataset training awal. |
| [Open-Meteo Historical Weather API](https://open-meteo.com/en/docs/historical-weather-api) | Reanalisis ERA5 dipatok eksplisit; request WIB 2015–2025 menghasilkan 4.018 hari tanpa missing pada hujan, kelembapan, dan suhu. Grid keluaran -7, 107.5 berbeda dari koordinat request -6.9175, 107.6191. | Kandidat EDA/eksperimen retrospektif. Bukan stasiun BMKG atau bukti fitur tersedia pada cutoff D. Manifest mencatat sumber, unit, grid, dan SHA-256. |
| [Katalog BNPB](https://data.bnpb.go.id/api/3/action/package_search?q=kejadian&rows=100) | Katalog publik dapat dibaca. Kueri `kejadian` menghasilkan 70 metadata dataset; paket nasional terpilih yang ditinjau berisi rekap agregat atau tautan infografis. Kueri `bandung` mengembalikan 0 metadata dataset. | Katalog yang ditinjau belum memberi label harian Bandung; hasil pencarian 0 bukan bukti tidak ada data Bandung pada sumber lain. |
| [Rilis Pemprov Jabar](https://jabarprov.go.id/berita/bey-machmudin-tinjau-banjir-bandang-braga-12039) dan [rilis BNPB](https://bnpb.go.id/berita/perkembangan-situasi-dan-penanganan-bencana-tanggal-17-maret-2025) | Isi laporan mengidentifikasi dua tanggal kejadian Kota Bandung: 2024-01-11 dan 2025-03-15; tanggal publikasi dipisahkan dari tanggal kejadian. | Seed label positif untuk audit join. Bukan daftar lengkap dan tidak membenarkan pemberian label 0 pada hari lain. Lihat [bukti](evidence/README.md). |

FAQ BMKG juga menyebut RR diamati pukul 07.00 waktu setempat. Periode yang diwakili
tanggal RR dan latensi publikasinya perlu dikonfirmasi sebelum join dengan label.
Jangan menganggap semua observasi tanggal D sudah tersedia pada akhir tanggal D.

## Status akses

- Arsip RR Husein Bandung, seri ASCII, serta `sources.txt` berhasil diunduh dan
  disimpan di `data/raw/`. SHA-256 serta hasil audit dicatat pada
  [temuan audit](findings/2026-10-20-initial-audit.md). Ekspor label lengkap belum diperoleh;
  dua label positif telah dikurasi dari rilis resmi yang dibaca.
- Permintaan terminal awal gagal pada jaringan terbatas. Setelah akses jaringan
  tersedia, kueri publik per stasiun berhasil; tidak perlu mengunduh seluruh arsip
  lintas negara. Tidak ada seri yang direkonstruksi dari potongan mesin pencari.
- Belum login, membuat akun, atau mengirim permintaan data ke BMKG/BPBD/BNPB.
- Belum dapat menyatakan Kota Bandung lebih layak daripada Kabupaten Bandung;
  kandidat awal dipertahankan sampai contoh observasi dan label dapat dicocokkan.
- Snapshot ERA5 dan hasil akuisisi tersedia; lihat
  [laporan ERA5](findings/2026-10-20-era5-acquisition.md).
- Halaman kejadian Barata Jabar mengembalikan halaman status layanan/penolakan akses
  saat dibaca dari terminal; endpoint ArcGIS publik BNPB yang diperiksa HTTP 500.
  Tidak ada akses login atau pembatasan yang dilewati.
