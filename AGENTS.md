# AGENTS.md

## Mission
Implement the USMS Admission Management System with simple, explicit code that junior developers can maintain.

## Rules
- Read ARCHITECTURE.md before substantial work.
- Frontend: React + TypeScript + Vite. Never Next.js.
- Backend: Node + TypeScript + Express + Prisma + MariaDB/MySQL.
- One React app for applicant and admin.
- REST, not GraphQL.
- Do not add Supabase/Firebase.
- Do not add Redux unless a demonstrated need exists.
- No microservices, CQRS, event sourcing, generic repository frameworks, Kafka, Redis, Elasticsearch or Kubernetes unless explicitly required later.
- Prefer direct typed code over abstractions.
- Do not use `any` to bypass type errors.
- Do not invent admission business rules.
- Keep application, payment and document statuses separate.
- Admins do not silently edit submitted applicant data; use change requests.
- Official PDFs are backend-generated from immutable submitted snapshots.
- Components never import mock JSON directly; use typed services.
- Make focused changes only.

## Verification
Before declaring a task complete, run relevant typecheck/lint/tests and builds. Do not claim success when checks fail.

## Scope
Implement requested iterations only. Mention useful out-of-scope improvements instead of silently adding them.
