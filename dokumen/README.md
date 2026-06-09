# PreDrip

Next.js App Router MVP untuk fondasi autentikasi PreDrip.

## Stack

- Next.js App Router
- TypeScript strict
- PostgreSQL
- Prisma
- bcryptjs password hashing
- HTTP-only cookie session

## Fitur Auth

- Register
- Login
- Logout
- Forgot password
- Reset password
- Password hash
- Session token hash di database
- Role dasar `USER` dan `ADMIN`

## Setup

Copy env jika belum ada:

```powershell
copy .env.example .env
```

Jalankan PostgreSQL lokal via Docker:

```powershell
docker compose up -d
```

Install dependency:

```powershell
npm.cmd install
```

Buat tabel database:

```powershell
npx.cmd prisma migrate dev --name init
```

Jalankan app:

```powershell
npm.cmd run dev
```

Buka:

```text
http://localhost:3000
```

## Catatan Forgot Password

Email provider belum dikonfigurasi pada MVP. Saat development, link reset password ditulis ke terminal Next.js:

```text
[PreDrip] Password reset untuk user@email.com: http://localhost:3000/reset-password?token=...
```

## Struktur Penting

```text
app/
  actions/auth.ts
  (auth)/
  dashboard/
lib/
  auth/
  mail/
  prisma.ts
prisma/
  schema.prisma
```

