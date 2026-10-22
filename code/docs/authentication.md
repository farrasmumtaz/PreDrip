# Batas autentikasi

- Password register/reset/login dibatasi 72 byte UTF-8 sesuai bcrypt. Akun lama
  yang dahulu memakai password terpotong harus mengganti password lewat recovery
  development/pengelola; jangan memotong password pengguna secara diam-diam.
- Token reset diklaim di dalam transaksi yang sama dengan perubahan password,
  pencabutan semua link reset lain dan semua session akun.
- Kesalahan validasi password mempertahankan token reset yang berformat benar.
- Recovery produksi **dinonaktifkan secara eksplisit** sampai email provider
  dikonfigurasi. Semua alamat mendapat respons sama sebelum lookup akun dan tidak
  ada token baru yang dibuat. Tidak ada email produksi yang diklaim terkirim.
- Pembatasan request memakai counter SQLite atomik, dibagikan antar worker yang
  memakai database sama. Window 15 menit; per akun: register 5, login 10, forgot 3,
  reset 5. Batas global per window: login 300, operasi lain masing-masing 100.
  Identitas disimpan sebagai SHA-256, bukan email/token asli.
- Counter kedaluwarsa dibersihkan saat request berikutnya. Batas global dipilih
  untuk pilot kecil; sebelum memperluas deployment, sesuaikan kapasitas dan gunakan
  limiter gateway bersama apabila beberapa instance tidak berbagi SQLite.
- Jalankan `prisma migrate deploy` sebelum menjalankan kode baru agar tabel counter
  tersedia. Tidak ada fallback limiter dalam memori yang dapat dilewati worker lain.

Jalankan `npm.cmd run security:test`. Tes memakai database sementara terpisah,
bukan `prisma/dev.db`. Jangan gunakan tes web lama pada database produksi.
