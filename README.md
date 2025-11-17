## Parking Management (Next.js + MySQL)

Simple CRUD sample for managing parking slots and vehicle sessions. It uses the App Router, REST API routes, server-side MySQL queries (`mysql2/promise`), and client-side forms.

### 1. Requirements

- Node 18+
- MySQL 8 (or compatible)

### 2. Setup MySQL

Create the database and seed sample data:

```bash
mysql -u root -p < db/schema.sql
```

### 3. Configure environment

Copy `env.example` to `.env.local` and update the credentials:

```bash
cp env.example .env.local
```

```
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=secret
MYSQL_DATABASE=parking_management
PARKING_HOURLY_RATE=40
```

### 4. Install & run

```bash
npm install
npm run dev
```

Visit `http://localhost:3000` to use the UI:

- Add parking slots
- Check-in vehicles (creates sessions)
- Checkout sessions (calculates dues + frees slot)
- View dashboards and recent activity

### 5. Project structure

- `src/app/page.tsx` – single-page UI
- `src/app/api/*` – CRUD endpoints
- `src/lib/db.ts` – MySQL pool
- `src/lib/parking.ts` – business logic
- `db/schema.sql` – database + seed data

Feel free to extend with authentication, reports, or finer-grained permissions. This repo intentionally keeps everything lightweight for clarity.*** End Patch
