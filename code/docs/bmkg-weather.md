# Prakiraan BMKG pada dashboard PreDrip

Fitur ini mengganti cuaca dummy pada `/dashboard` dengan prakiraan resmi BMKG.
Login, pilih kelurahan, lalu tekan **Tampilkan**. Pilihan awal mencakup Braga,
Merdeka, Kebon Pisang, dan Babakan Ciamis di Kecamatan Sumur Bandung.

## Sumber dan kontrak

- [Dokumentasi BMKG](https://data.bmkg.go.id/prakiraan-cuaca/).
- Endpoint tetap: `https://api.bmkg.go.id/publik/prakiraan-cuaca?adm4=<kode>`.
- [Daftar kelurahan Sumur Bandung](https://www.bmkg.go.id/cuaca/prakiraan-cuaca/32.73.19)
  menjadi referensi empat kode wilayah yang didukung. Wilayah baru harus ditinjau
  dan ditambahkan pada daftar, bukan menerima URL bebas dari query pengguna.
- Field terdokumentasi: suhu `t` (°C), kelembapan `hu` (%), angin `ws` (km/jam),
  arah `wd`, kondisi `weather_desc`, `utc_datetime`, dan `analysis_date`.
- UI mengatribusikan BMKG dan menautkan halaman resmi wilayah.

Lokasi prakiraan adalah kelurahan terpilih, bukan hasil reverse geocoding GPS.
GPS tetap digunakan pada peta pengguna. Posisi pengguna tidak dikirim ke BMKG;
request prakiraan hanya membawa kode wilayah yang dipilih.

## Perilaku dan validitas

- Semua tanggal sumber diparse sebagai UTC dan ditampilkan dalam WIB.
- Slot yang sudah berlalu tiga jam tidak dipakai. Bila tersedia dipilih slot aktif;
  jika belum ada slot aktif, dipakai slot terdekat ke depan dengan waktu berlaku
  yang ditampilkan eksplisit.
- Guard aplikasi menolak terbitan lebih dari 24 jam, waktu terbit lebih dari lima
  menit di masa depan, atau slot lebih dari 72 jam ke depan. Ini aturan aplikasi
  untuk freshness, bukan jaminan operasional dari penyedia.
- Identitas wilayah pada metadata root dan data harus sesuai request. Format,
  rentang nilai, waktu, dan kecocokan waktu terbit/berlaku divalidasi dengan Zod.
- Nilai kosong tetap tidak tersedia; angka nol tidak diganti default. Slot duplikat
  memakai terbitan terbaru untuk waktu berlaku yang sama.
- Fetch server memiliki timeout 8 detik, cache revalidasi 10 menit, dan menolak
  redirect upstream. Error jaringan/HTTP/schema/kedaluwarsa menghasilkan status
  tidak tersedia; tidak ada fallback angka dummy.
- Membuka dashboard tidak menulis `WeatherSnapshot`. Data lama dipertahankan di
  database, tetapi riwayat dummy lama tidak ditampilkan sebagai observasi BMKG.
- Tabel laporan dan peta tetap tersedia saat cuaca tidak dapat dimuat.

## Skor risiko

Rumus heuristik lama dipertahankan hanya untuk input observasi harian yang sesuai.
Prakiraan API ini tidak menyediakan kontrak curah hujan harian terdokumentasi yang
memadai untuk input itu. Field tambahan `tp` yang muncul pada respons tidak
dianggap sebagai curah hujan harian tanpa penjelasan unit/periode yang memadai.

Karena itu dashboard menampilkan **indikator risiko belum dinilai**, menjelaskan
metode aturan manual, dan tidak menggambar lingkaran hijau sebagai zona aman.
Skor bukan probabilitas banjir atau hasil model terlatih. Tidak ada rekomendasi
evakuasi otomatis dari heuristik yang belum divalidasi.

Fitur ini tidak melakukan training atau mengganti dataset ERA5 riset. Tidak ada
migrasi database, API key, dependency baru, atau perubahan environment yang diperlukan.

## Verifikasi PowerShell

```powershell
npm.cmd run weather:test
npm.cmd run weather:check
npm.cmd run build
```

`weather:check` memanggil BMKG resmi dan akan gagal jika penyedia tidak tersedia
atau respons tidak lolos validasi. Pemeriksaan unit memakai data sintetis yang
dibuat khusus pengujian dan tidak bergantung pada jaringan.

Setelah server lokal berjalan:

```powershell
npm.cmd run weather:test:web
```

Pengujian HTTP membuat user/session uji sementara dan membersihkannya pada akhir
pemeriksaan. Mencakup proteksi login, prakiraan live Braga/Merdeka, pemilihan
wilayah tidak valid, penjelasan risiko, serta tidak adanya penulisan snapshot
observasi dari render halaman. Hanya host loopback yang diizinkan.
