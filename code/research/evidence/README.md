# Bukti awal label banjir Kota Bandung

Diperiksa 20 Oktober 2026. File `kota-bandung-positive-labels.csv` adalah **kurasi
awal dua hari positif** dari isi rilis pemerintah yang dibaca, bukan ekspor daftar
kejadian lengkap atau sampel representatif. Tidak ada label negatif yang dibuat.

| Tanggal kejadian | Tanggal publikasi | Lokasi dan dasar label |
|---|---|---|
| 2024-01-11 | 2024-01-12 | Rilis [Pemprov Jabar](https://jabarprov.go.id/berita/bey-machmudin-tinjau-banjir-bandang-braga-12039) menyebut banjir bandang Braga, Kota Bandung, terjadi sore 11 Januari. Tanggal dan lokasi juga dikonfirmasi [Bappeda Jabar](https://bappeda.jabarprov.go.id/banjir-bandang-di-kawasan-braga-150-orang-dievakuasi/). |
| 2025-03-15 | 2025-03-17 | Rilis [BNPB](https://bnpb.go.id/berita/perkembangan-situasi-dan-penanganan-bencana-tanggal-17-maret-2025) melaporkan banjir Kota Bandung setelah hujan pada Sabtu 15 Maret. Tanggal publikasi 17 Maret tidak dipakai sebagai tanggal kejadian. |

Label 1 berarti ada kejadian banjir di suatu bagian wilayah kota pada tanggal
itu. Banjir bandang termasuk cakupan awal, sesuai target umum ada/tidak ada banjir.
Belum ada definisi kedalaman/durasi minimum untuk target akhir. Dokumen ini tidak
menetapkan durasi banjir atau status hari sebelum/sesudahnya tanpa bukti tambahan.
Pernyataan kondisi surut di lokasi tertentu tidak membuktikan seluruh kota bebas
banjir pada hari tersebut.

Kurasi ini dipakai untuk menguji join dengan data cuaca asli. Dua label 1 dan
ketiadaan label 0 belum mendukung supervised training/evaluasi klasifikasi.
Hari yang tidak tercantum tetap missing/unknown. Jangan menganggap ada hanya dua
kejadian pada periode studi atau menghitung prevalensi banjir dari kurasi ini.

Audit pasangan lokal setelah snapshot ERA5 tersedia:

```powershell
npm.cmd run data:audit:pilot
```

Audit lokal 20 Oktober 2026 menghasilkan `knownLabelPairs` 2, `noFloodPairs` 0,
dan `missingLabelDays` 4.016. `completeAvailablePairs` tetap 0
karena ketersediaan fitur sebelum cutoff historis belum diverifikasi.
Laporan lengkap lokal: `research/reports/era5-positive-seed-audit.json`.
Untuk menghasilkan dataset yang layak perlu catatan kejadian lebih lengkap,
durasi/cakupan, bukti kelas negatif, serta data fitur yang sesuai cutoff.
