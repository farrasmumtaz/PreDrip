# 🌊 PreDrip

PreDrip adalah platform pemantauan dan prediksi risiko banjir berbasis lokasi yang membantu masyarakat memperoleh informasi kondisi cuaca, risiko banjir, dan pemetaan wilayah terdampak secara real-time.

Platform ini menggabungkan data cuaca, lokasi pengguna, dan sistem penilaian risiko untuk memberikan peringatan dini terhadap potensi banjir.

---

## 📌 Features

### Authentication System

* User Registration
* User Login
* Session Management
* Password Reset

### Location Tracking

* Automatic browser geolocation
* Save user coordinates to database
* Home location management

### Weather Monitoring

* Weather data retrieval service
* Rainfall monitoring
* Humidity monitoring
* Temperature monitoring
* Weather history storage

### Flood Risk Analysis

* Flood Risk Engine
* Risk Scoring
* Risk Classification

  * Aman
  * Waspada
  * Bahaya

### Interactive Map

* OpenStreetMap integration
* Leaflet map visualization
* User location marker
* Risk zone visualization

### Database

* Prisma ORM
* SQLite Database
* Weather Snapshot History
* User Management
* Session Management

---

## 🏗️ System Architecture

```text
Browser
   │
   ▼
Next.js Dashboard
   │
   ├── Authentication Module
   │
   ├── Geolocation Module
   │
   ├── Weather Service
   │
   ├── Flood Risk Engine
   │
   └── Interactive Map
   │
   ▼
Prisma ORM
   │
   ▼
SQLite Database
```

---

## 🛠️ Technology Stack

### Frontend

* Next.js 15
* React 19
* TypeScript
* CSS

### Mapping

* Leaflet
* React Leaflet
* OpenStreetMap

### Backend

* Next.js Server Components
* API Routes
* Server Actions

### Database

* Prisma ORM
* SQLite

### Authentication

* Custom Session Authentication
* Secure Password Hashing

---

## 📂 Project Structure

```text
code/
│
├── app/
│   ├── (auth)/
│   ├── actions/
│   ├── api/
│   ├── components/
│   ├── dashboard/
│   └── map/
│
├── lib/
│   ├── auth/
│   ├── mail/
│   ├── services/
│   ├── prisma.ts
│   └── risk-engine.ts
│
├── prisma/
│   ├── migrations/
│   └── schema.prisma
│
└── public/
```

---

## 🗄️ Database Models

### User

Stores user information and home location.

### Session

Stores authentication sessions.

### PasswordResetToken

Stores password recovery tokens.

### WeatherSnapshot

Stores historical weather data.

### FloodRisk

Stores flood risk calculations.

### FloodHistory

Stores historical flood events.

### CitizenReport

Stores community flood reports.

---

## 🚀 Installation

Clone repository:

```bash
git clone https://github.com/your-username/predrip.git
```

Move into project directory:

```bash
cd PreDrip/code
```

Install dependencies:

```bash
npm install
```

Create environment file:

```bash
cp .env.example .env
```

Run database migration:

```bash
npx prisma migrate dev
```

Generate Prisma Client:

```bash
npx prisma generate
```

Start development server:

```bash
npm run dev
```

Application will be available at:

```text
http://localhost:3000
```

---

## 📈 Current Development Progress

### Completed

* Authentication System
* User Session Management
* Geolocation Tracking
* Weather Monitoring
* Risk Calculation Engine
* Weather History
* Interactive Mapping
* Database Integration

### In Progress

* Citizen Flood Reports
* Historical Flood Layer
* Email Notifications
* Risk Analytics Dashboard

### Planned

* Machine Learning Prediction
* Flood Heatmap
* Mobile Optimization
* BMKG Real-Time Integration
* Push Notifications

---

## 🎯 Project Goal

PreDrip aims to become an early flood warning platform that helps communities identify flood risks before they occur through weather monitoring, location intelligence, and predictive analysis.

---

## 👨‍💻 Authors

Muhammad Farras Mumtaz

Software Engineering

Telkom University
