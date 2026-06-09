# Business Requirement Document

## 1. Ringkasan Bisnis

**Produk:** PreDrip  
**Jenis Sistem:** Web application prediksi risiko banjir berbasis lokasi  
**Target Implementasi Awal:** MVP web menggunakan Node.js dan Next.js full-stack  
**Sumber Dasar:** Proposal PreDrip DINACOM 2026 dan kebutuhan autentikasi dari owner produk

PreDrip adalah platform mitigasi banjir yang memberikan prediksi risiko banjir secara hyper-local, menyajikan informasi cuaca terkini, riwayat banjir wilayah, peta risiko interaktif, notifikasi dini, dan laporan kondisi lapangan dari masyarakat. Pada fase awal realisasi web, sistem harus memiliki fondasi autentikasi yang aman sebelum modul prediksi, peta, laporan, dan dashboard dikembangkan.

## 2. Problem Statement

Peringatan dini banjir yang tersedia saat ini cenderung terlambat, terlalu umum, dan tidak cukup spesifik terhadap kondisi wilayah pengguna. Masyarakat di daerah rawan banjir tidak memiliki cukup waktu untuk melakukan evakuasi atau mengamankan aset. Di sisi lain, pihak seperti BPBD, PMI, dan organisasi kemanusiaan membutuhkan data risiko yang cepat, terpusat, dan dapat dipercaya untuk menentukan prioritas respons.

Untuk mewujudkan solusi digital tersebut, PreDrip membutuhkan sistem web yang:

- Memiliki identitas pengguna yang valid dan aman.
- Menyimpan lokasi prioritas pengguna untuk pemantauan risiko.
- Mendukung akses personal bagi masyarakat dan akses operasional bagi stakeholder.
- Menjadi fondasi bagi modul risiko banjir, notifikasi, laporan warga, dan dashboard.

## 3. Business Goals

1. Menyediakan platform digital yang membantu masyarakat menerima informasi risiko banjir secara lebih cepat, spesifik lokasi, dan mudah dipahami.
2. Menjadi fondasi sistem mitigasi banjir berbasis data untuk masyarakat, BPBD, PMI, dan organisasi kemanusiaan.
3. Meningkatkan kesiapsiagaan pengguna melalui akun personal, lokasi prioritas, dan mekanisme notifikasi berbasis risiko.
4. Menjamin keamanan data pengguna, terutama email, password, lokasi rumah/kantor, dan riwayat aktivitas.
5. Menyiapkan arsitektur produk yang dapat berkembang ke fitur prediksi LSTM, integrasi BMKG, peta risiko, laporan warga, dan Emergency SOS.

## 4. Business Objectives

| Kode | Objective | Target Awal |
|---|---|---|
| BO-01 | Pengguna dapat membuat akun dan masuk ke sistem secara aman. | Registrasi, login, logout berjalan stabil pada MVP. |
| BO-02 | Password pengguna tidak pernah disimpan dalam bentuk plain text. | Password wajib di-hash menggunakan algoritma kuat. |
| BO-03 | Pengguna dapat memulihkan akses akun. | Forgot password dan reset password tersedia dengan token terbatas waktu. |
| BO-04 | Sistem dapat menyimpan data identitas dasar dan lokasi prioritas pengguna. | Data profil minimal siap untuk fitur risiko berbasis lokasi. |
| BO-05 | Sistem siap dikembangkan ke modul risiko banjir. | Struktur role, user, session, dan audit dasar tidak menghambat ekspansi fitur. |
| BO-06 | Sistem menjaga kepatuhan privasi data. | Data sensitif dilindungi dan akses dibatasi sesuai role. |

## 5. Scope MVP

### 5.1 In Scope

- Registrasi pengguna baru.
- Login pengguna.
- Logout pengguna.
- Hash password.
- Forgot password.
- Reset password.
- Session management.
- Validasi input autentikasi.
- Role awal: `USER`, `ADMIN`.
- Profil dasar pengguna.
- Penyimpanan lokasi prioritas pengguna sebagai baseline untuk fitur risiko.
- Struktur awal halaman authenticated dan unauthenticated.

### 5.2 Out of Scope untuk Fase Autentikasi

- Model LSTM prediksi banjir.
- Training dan retraining model.
- Integrasi API BMKG real-time.
- Interactive map risiko banjir.
- Smart notification berbasis geofencing.
- Timeline/crowd reporting.
- Dashboard BPBD/PMI.
- Emergency SOS.

Fitur di atas tetap masuk roadmap produk PreDrip, tetapi tidak dieksekusi sebelum fondasi autentikasi dan struktur user selesai.

## 6. Stakeholder

| Stakeholder | Kepentingan |
|---|---|
| Masyarakat wilayah rawan banjir | Mendapatkan akses personal ke informasi risiko dan notifikasi dini. |
| Admin platform | Mengelola data pengguna, validasi laporan, dan konfigurasi sistem. |
| BPBD / Pemerintah Daerah | Memantau wilayah prioritas dan mengambil keputusan berbasis data. |
| PMI / Organisasi kemanusiaan | Menyiapkan respons, logistik, relawan, dan posko berdasarkan risiko. |
| Tim pengembang | Membangun sistem modular yang aman, maintainable, dan siap scale. |
| Owner produk | Merealisasikan proposal PreDrip menjadi aplikasi web bertahap. |

## 7. Target User

### 7.1 User Publik

Pengguna umum yang tinggal, bekerja, atau memiliki aset di wilayah rawan banjir. Pada MVP, user publik membutuhkan akun, login, pengelolaan identitas dasar, dan lokasi prioritas.

### 7.2 Admin

Pengelola sistem yang memiliki akses lebih tinggi untuk kebutuhan operasional awal seperti melihat user, memverifikasi data di fase berikutnya, dan mengelola konfigurasi dasar.

### 7.3 Stakeholder Operasional

BPBD, PMI, atau organisasi kemanusiaan. Pada fase MVP role ini belum harus dipisah secara detail, tetapi desain role harus memungkinkan ekspansi ke `AGENCY_OPERATOR` atau `RESPONDER`.

## 8. Business Capability

| Capability | Deskripsi |
|---|---|
| Account Management | Pengguna dapat membuat dan mengakses akun personal. |
| Secure Authentication | Sistem mengautentikasi user dengan kredensial aman. |
| Password Recovery | User dapat melakukan reset password ketika lupa akses. |
| Location Baseline | Sistem menyimpan lokasi prioritas user untuk pengembangan fitur risiko. |
| Access Control | Sistem membedakan akses user dan admin. |
| Audit Readiness | Aktivitas penting dapat ditelusuri pada fase pengembangan berikutnya. |

## 9. Business Rules

| Kode | Rule |
|---|---|
| BR-01 | Email pengguna harus unik. |
| BR-02 | Password wajib di-hash sebelum disimpan ke database. |
| BR-03 | Password plain text tidak boleh ditulis ke log, database, cache, atau audit trail. |
| BR-04 | Token reset password hanya boleh digunakan satu kali. |
| BR-05 | Token reset password wajib memiliki waktu kedaluwarsa. |
| BR-06 | User yang belum login tidak boleh mengakses halaman authenticated. |
| BR-07 | Logout harus mengakhiri session aktif. |
| BR-08 | Role admin tidak boleh diberikan dari form registrasi publik. |
| BR-09 | Lokasi prioritas pengguna harus dapat diperbarui oleh pemilik akun. |
| BR-10 | Data lokasi dan identitas pengguna harus diperlakukan sebagai data sensitif. |

## 10. High-Level Functional Needs

| Kode | Kebutuhan |
|---|---|
| FN-01 | User dapat registrasi menggunakan nama, email, password, dan lokasi prioritas opsional. |
| FN-02 | User dapat login menggunakan email dan password. |
| FN-03 | User dapat logout dari sistem. |
| FN-04 | User dapat meminta link reset password melalui email. |
| FN-05 | User dapat mengganti password menggunakan token reset yang valid. |
| FN-06 | Sistem menolak token reset yang expired, invalid, atau sudah digunakan. |
| FN-07 | Sistem menampilkan halaman/dashboard sesuai status autentikasi. |
| FN-08 | Admin dapat memiliki akses terpisah dari user reguler. |

## 11. Non-Functional Business Needs

| Area | Requirement |
|---|---|
| Security | Password hash wajib memakai algoritma kuat seperti Argon2id atau bcrypt dengan cost memadai. |
| Privacy | Data lokasi dan identitas user dibatasi aksesnya berdasarkan ownership dan role. |
| Reliability | Flow auth utama harus tetap berjalan walaupun modul prediksi belum tersedia. |
| Scalability | Struktur user dan role harus siap untuk perluasan ke BPBD, PMI, responder, dan admin wilayah. |
| Maintainability | Implementasi harus modular dan strict typed dengan TypeScript. |
| Compliance Awareness | Desain harus memperhatikan prinsip perlindungan data pribadi di Indonesia. |

## 12. Success Metrics

| Metric | Target MVP |
|---|---|
| Registration success rate | >= 95% request valid berhasil membuat akun. |
| Login success reliability | >= 99% untuk kredensial valid pada kondisi normal. |
| Password storage | 100% password tersimpan sebagai hash, tanpa plain text. |
| Reset token security | 100% token reset memiliki expiry dan single-use behavior. |
| Unauthorized access prevention | 100% halaman protected menolak user unauthenticated. |
| Auth error clarity | Error user-facing jelas tanpa membocorkan detail sensitif. |

## 13. Assumptions

- Aplikasi akan dibangun sebagai Next.js App Router full-stack application.
- Backend API dan server actions berada di Next.js untuk fase awal.
- Database menggunakan PostgreSQL.
- ORM direkomendasikan Prisma untuk kecepatan delivery dan typed query.
- Email provider untuk forgot password akan dipilih pada fase Technical Design.
- Model prediksi LSTM tidak masuk MVP autentikasi, tetapi arsitektur data user tidak boleh menghambat integrasi model.

## 14. Risks

| Risk | Dampak | Mitigasi |
|---|---|---|
| Auth dibuat terlalu sederhana | Sulit diamankan saat aplikasi berkembang | Terapkan hashing kuat, session strategy jelas, token reset single-use. |
| Role tidak dipikirkan sejak awal | Refactor besar saat dashboard stakeholder dibuat | Mulai dengan enum role dan policy-based access sederhana. |
| Data lokasi disimpan tanpa kontrol | Risiko privasi tinggi | Batasi akses berdasarkan user ownership dan role. |
| Forgot password tidak aman | Potensi takeover akun | Token random, hash token di database, expiry pendek, invalidasi setelah digunakan. |
| Modul MVP terlalu melebar | Delivery lambat | Fase pertama fokus auth dan profil dasar. |

## 15. Recommended Delivery Phasing

| Fase | Fokus | Output |
|---|---|---|
| Phase 1 | Authentication Foundation | Register, login, logout, forgot/reset password, session, role dasar. |
| Phase 2 | User Profile & Location | Profil, lokasi prioritas, preference notifikasi. |
| Phase 3 | Weather & Risk Data Foundation | Struktur data cuaca, flood history, risk zone. |
| Phase 4 | Interactive Map & Risk Display | Peta, kategori risiko hijau/kuning/merah. |
| Phase 5 | Notification & Reporting | Smart notification, timeline laporan warga. |
| Phase 6 | AI Prediction Integration | Integrasi model LSTM dan pipeline evaluasi. |
| Phase 7 | Stakeholder Dashboard | Dashboard BPBD/PMI, validasi laporan, operational view. |

## 16. Approval Criteria untuk Lanjut ke PRD

Dokumen Business Requirement dianggap siap jika owner menyetujui:

- MVP pertama difokuskan pada autentikasi aman dan profil dasar.
- Modul prediksi, peta, notifikasi, laporan warga, dan SOS masuk roadmap setelah fondasi auth.
- Role awal cukup `USER` dan `ADMIN`, dengan desain yang bisa diperluas.
- PostgreSQL dan Prisma dapat digunakan sebagai baseline desain data.
- Forgot/reset password wajib masuk fase pertama.

