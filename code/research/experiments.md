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
