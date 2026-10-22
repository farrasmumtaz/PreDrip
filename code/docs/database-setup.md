# Database lokal dan upgrade

PreDrip saat ini memakai SQLite, bukan PostgreSQL. Dari folder `code`:

```powershell
Copy-Item .env.example .env
npm.cmd ci
npx.cmd prisma migrate deploy
npm.cmd run dev
```

Jangan menimpa `.env` yang sudah ada. Tidak perlu Docker untuk database SQLite.
Database lokal berada di `prisma/dev.db`; jangan masukkan database ke Git.

## Database yang sudah berisi pengguna

Migration `20260609032022_user_updates` diperbaiki agar menyalin password,
alamat, koordinat, dan timestamp dari nama kolom lama. Upgrade diuji pada database
terpisah yang memiliki pengguna, session, dan token reset. Database pengguna tidak
direset oleh perbaikan ini.

Sebelum upgrade, hentikan server dan salin database beserta file WAL/SHM jika ada.
Gunakan `prisma migrate status` lalu `prisma migrate deploy`. Instalasi yang sudah
menerapkan migration tersebut tidak menjalankannya ulang. `migrate dev` dapat
melaporkan checksum migration lama berubah: **jangan memilih reset database**.
Perubahan ini adalah koreksi jalur upgrade historis; jangan menandai migration
gagal sebagai berhasil tanpa memeriksa schema dan salinan database terlebih dahulu.
Pemulihan migration yang sebelumnya gagal harus dilakukan pada salinan backup
sesuai keadaan schema, bukan dengan menghapus tabel pengguna.

Folder `dokumen` dan README lama di root memuat rancangan awal PostgreSQL.
Kontrak operasional yang berlaku adalah schema SQLite dan panduan ini.
