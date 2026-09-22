# Architecture

## Goal
Build a low-cost, auditable admission management system for roughly 2,000 applications per admission cycle. Optimize for correctness and maintainability, not distributed-system complexity.

## Shape
One repository, one React SPA, one Express API, one PostgreSQL database. Modular monolith.

```
Browser
  -> React + TypeScript + Vite
  -> REST /api
  -> Express + TypeScript
  -> Prisma
  -> PostgreSQL

Documents/PDFs -> private S3 or Azure Blob (later iteration)
```

## Frontend
React 19, TypeScript, Vite, React Router, TanStack Query, React Hook Form, Zod, Tailwind/shadcn when UI components are introduced. Applicant routes live under `/admission/*`; administration under `/admin/*`.

## Backend
Node.js + TypeScript + Express + Zod + Prisma. Keep controller/route -> service -> Prisma straightforward. No generic repository framework.

## Core domains
Authentication/RBAC; admission cycles; programs/program offerings; applications; applicant profile; program choices; education; family; documents; payments; reviews/change requests; application versions/status history; physical files; audit.

## Workflow
Application status is separate from payment/document status.

Application: DRAFT -> SUBMITTED -> UNDER_REVIEW -> CHANGE_REQUESTED -> RESUBMITTED -> UNDER_REVIEW -> DOCUMENTS_VERIFIED -> APPROVED. REJECTED is an explicit terminal review outcome.

Admins do not silently modify applicant-submitted information. Corrections use change requests and resubmission.

## Data history
Submission/resubmission creates an immutable application snapshot/version. Historical official PDFs must be generated from and tied to those versions.

## Documents
Never store uploaded files in PostgreSQL. Store metadata/object keys in PostgreSQL and bytes in private S3/Azure Blob. Use short-lived signed URLs.

## Physical workflow
Track physical file number, status, location, rack, shelf, receipt information and remarks. The digital application page should feel like opening the physical student file.

## Deployment
Initial deployment may use one Linux VM with Nginx, React static files, Express and PostgreSQL, plus external object storage and off-server backups. Remain cloud-neutral between AWS and Azure.

## Non-goals initially
No Next.js, microservices, Kubernetes, Kafka, Redis, Elasticsearch, GraphQL, CQRS, event sourcing, generalized workflow engine, or examination module.
