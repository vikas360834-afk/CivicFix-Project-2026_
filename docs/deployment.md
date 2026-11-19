# CivicFix — Production Deployment & Operations Guide

This guide details the deployment of CivicFix for both local production-grade evaluation and cloud hosting (Docker, Render, Vercel, PostgreSQL migration, and backup strategies).

---

## 1. Environment Configurations

### Backend Configuration (`backend/.env`)
```bash
# Server & Database
PORT=5000
DATABASE_URL="file:./dev.db"        # SQLite local; or postgresql://user:pass@host:5432/civicfix
JWT_SECRET="replace-with-a-64-char-secure-random-token"
JWT_EXPIRES_IN="7d"

# CORS & Security
CLIENT_ORIGIN="http://localhost:5173" # In production: https://civicfix.yourdomain.com
NODE_ENV="production"

# Optional LLM API Key (Fallback for open-ended queries)
OPENAI_API_KEY=""
OPENAI_MODEL="gpt-4o-mini"
```

### Frontend Configuration (`frontend/.env.production`)
```bash
# Base URL for API requests in production build
VITE_API_URL="https://api.civicfix.yourdomain.com/api"
```

---

## 2. Option A — Local Production Execution

Run this process to evaluate the compiled production builds locally:

```powershell
# 1. Build and Seed Backend
cd backend
npm.cmd install
npx.cmd prisma db push
node seed.js
npm.cmd start                     # Listening on http://localhost:5000

# 2. Build and Preview Frontend (in a separate terminal)
cd frontend
npm.cmd install
npm.cmd run build                 # Generates optimized static assets in dist/
npm.cmd run preview               # Serves production build at http://localhost:4173
```

---

## 3. Option B — Containerized Deployment (Docker & Docker Compose)

CivicFix can be packaged into standardized multi-stage Docker containers.

### `backend/Dockerfile`
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci
RUN npx prisma generate
COPY . .

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app ./
EXPOSE 5000
CMD ["npm", "start"]
```

### `frontend/Dockerfile`
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine AS runner
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### `docker-compose.yml` (Project Root)
```yaml
version: '3.8'

services:
  backend:
    build: ./backend
    ports:
      - "5000:5000"
    environment:
      - PORT=5000
      - DATABASE_URL=file:/app/data/civicfix.db
      - JWT_SECRET=production-secret-token-civicfix-2026
      - CLIENT_ORIGIN=http://localhost:80
      - NODE_ENV=production
    volumes:
      - civicfix_data:/app/data
      - civicfix_uploads:/app/uploads
    restart: always

  frontend:
    build: ./frontend
    ports:
      - "80:80"
    depends_on:
      - backend
    restart: always

volumes:
  civicfix_data:
  civicfix_uploads:
```

---

## 4. Option C — Cloud Deployment (Render / Railway & Vercel)

### Backend Deployment (Render or Railway)
1. Link your GitHub repository to Render.
2. Select **Web Service** with Root Directory: `backend`.
3. Set Build Command: `npm install && npx prisma db push && node seed.js`.
4. Set Start Command: `npm start`.
5. Add Environment Variables:
   - `DATABASE_URL`: `file:./dev.db` (or link a managed Postgres service and run `npx prisma migrate deploy`).
   - `JWT_SECRET`: Random 64-char string.
   - `CLIENT_ORIGIN`: `https://civicfix.vercel.app`.
   - `NODE_ENV`: `production`.

### Frontend Deployment (Vercel)
1. Import repository on Vercel with Root Directory: `frontend`.
2. Framework Preset: `Vite`.
3. Build Command: `npm run build`.
4. Output Directory: `dist`.
5. Environment Variable:
   - `VITE_API_URL`: `https://civicfix-backend.onrender.com/api`.
6. Deploy and map custom domain.

---

## 5. Database Migration to PostgreSQL

For high-concurrency production municipal usage (>10,000 requests/day), switch Prisma from SQLite to PostgreSQL:

1. Update `backend/prisma/schema.prisma`:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```
2. Run database migration:
   ```bash
   npx prisma migrate dev --name init_postgres
   ```
3. Re-run `node seed.js` to seed accounts and sample wards.

---

## 6. Backup & Recovery Operations

### SQLite File Backup
```powershell
# Create automated snapshot with timestamp
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
Copy-Item "backend/prisma/dev.db" "backups/dev-$timestamp.db"
```

### PostgreSQL Backup
```bash
# Automated daily dump
pg_dump -U postgres -d civicfix -F c -b -v -f "/backups/civicfix_$(date +%Y%m%d).dump"
```

### Photo Uploads Backup
Ensure the `backend/uploads/` directory is mounted on persistent network storage (e.g., AWS S3, Azure Blob Storage, or a persistent Docker volume) to preserve civic photo evidence across container redeployments.