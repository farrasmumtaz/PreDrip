# Eksperimen laporan banjir tercatat

Eksperimen retrospektif Kota Bandung ini memakai label proxy: `1` berarti ada
laporan banjir di arsip DIBI pada tanggal target; `0` hanya berarti tidak ada
laporan di snapshot tersebut. Label ini bukan ground truth ada/tidaknya banjir.
Data kejadian, angka cuaca, dan tanggal tidak dibuat-buat. Audit dataset resmi
tetap blocked; eksperimen ini tidak mengubah label kurasi resmi atau risk engine.

## Input DIBI

Gunakan Node.js 22.12+ dan `npm.cmd ci`, kemudian:

```powershell
npm.cmd run data:import:dibi -- --file "C:\Users\farra\Downloads\train-00000-of-00001.parquet"
```

Pembaca Parquet `hyparquet` hanya dependency development. CLI memvalidasi tanggal,
kode `3273`, nama wilayah, jenis `Banjir`, dan referensi record. Kabupaten Bandung
(`3204`) serta Bandung Barat (`3217`) tidak dicampur. Tanggal terakhir arsip
dihitung dari seluruh kejadian, bukan dari banjir Kota Bandung terakhir.

Output default: `research/data/normalized/dibi-kota-bandung.events.json`.
Pengulangan menolak menimpa file; gunakan `--out <nama-baru.json>` untuk snapshot
baru. Parquet asli tidak diubah. SHA-256 sumber disimpan di snapshot.

File sumber pengguna cocok dengan SHA-256 LFS pada arsip publik akun
`wriindonesia/dibi-disaster-data` di Hugging Face. Arsip ini merupakan salinan
catatan DIBI, bukan verifikasi ulang kejadian oleh PreDrip. Izin redistribusi
belum dikonfirmasi; Parquet dan output impor tidak dimasukkan ke Git.

## Training dan evaluasi

Setelah snapshot cuaca ERA5 dan hasil impor tersedia:

```powershell
npm.cmd run data:test
npm.cmd run experiment:train -- --accept-report-proxy
```

Flag tersebut menerima asumsi label eksperimen secara eksplisit. Output default
`research/reports/report-proxy-v1/` berisi `model.json`, `evaluation.json`, dan
`predictions.csv`. File model memuat urutan fitur, standardisasi, koefisien,
threshold, hash input, dan penanda `operationalUse: false`. Hasil tidak dikirim
ke dashboard. Output diabaikan Git; pengulangan wajib memakai folder baru:

```powershell
npm.cmd run experiment:train -- --accept-report-proxy --out research/reports/report-proxy-v2
```

CLI menolak folder output yang sudah ada. Jika penulisan terputus, gunakan folder
baru; jangan menganggap folder parsial sebagai eksperimen lengkap. Input alternatif
dapat diberikan melalui `--weather <csv>` dan `--events <json>`; format mengikuti
kontrak normalisasi. Simpan manifest ERA5 untuk asal-usul grid, satuan, dan periode.

Split ditetapkan sebelum training berdasarkan **tanggal target**: train sampai
31 Desember 2019, validation 2020–2021, test 1 Januari 2022–21 November 2024.
Tanggal akhir adalah akhir snapshot arsip, bukan bukti pelaporan harian lengkap.
Cuaca 2025 tidak dipakai untuk menciptakan label negatif. Tujuh target pertama
2015 dilewati karena riwayat sebelumnya tidak tersedia.

Fitur untuk target D+1: hujan D, hujan D-1, akumulasi hujan D-2 sampai D,
akumulasi D-6 sampai D, kelembapan D, suhu D. Jendela yang kehilangan hari/nilai
tidak diisi nol. Semua input menggunakan reanalisis retrospektif; timestamp
ketersediaan historis kosong. Penggeseran fitur saja tidak membuktikan bahwa
angka ERA5 tersebut tersedia pada cutoff prediksi saat itu.

Model adalah logistic regression TypeScript dengan bobot kelas N/(2 × jumlah
kelas), standardisasi dari train saja, L2 tetap 0,01 tanpa penalti intercept.
Optimisasi memakai full-batch gradient descent dengan backtracking, toleransi
gradien 1e-7 dan maksimum 10.000 iterasi; kegagalan konvergensi membatalkan hasil.
Threshold dipilih hanya dari validation dengan grid 0,1 / 0,25 / 0,5 / 0,75 / 0,9,
maksimalkan F1; tie memilih precision lalu threshold lebih tinggi. Test tidak
dipakai untuk fitting, standardisasi, atau pemilihan threshold.

Baseline selalu memprediksi tidak ada laporan. Confusion matrix, precision,
recall, F1 dan accuracy disimpan per split; metrik tanpa penyebut menjadi `null`.
Accuracy tinggi pada baseline hanya mencerminkan kelas yang sangat timpang.
Skor logistic berbobot bukan probabilitas banjir yang terkalibrasi.

Lihat [hasil eksperimen pertama](findings/2026-10-23-report-proxy-experiment.md).
