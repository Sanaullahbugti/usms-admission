# USMS Admission Management System

A deliberately simple, maintainable full-stack admission system for the University of Sufism and Modern Sciences.

## Stack
- React 19 + TypeScript + Vite
- Node.js + TypeScript + Express
- Prisma + PostgreSQL
- Docker Compose

Read `ARCHITECTURE.md` and `AGENTS.md` before architectural changes.

## Local development
1. Copy `.env.example` to `.env`.
2. Run `docker compose up -d db`.
3. Run `npm install`.
4. Run `npm run db:generate`.
5. Run `npm run db:migrate`.
6. Run `npm run dev`.

Frontend: http://localhost:5173
API: http://localhost:4000
Health: http://localhost:4000/api/health
