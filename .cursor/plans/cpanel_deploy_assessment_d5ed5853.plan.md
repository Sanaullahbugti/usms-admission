---
name: cPanel deploy assessment
overview: PostgreSQL cannot be installed on this shared server, so admissions uses a new MariaDB database. Outbound mail uses a cPanel mailbox over SMTP (not Resend). Applicant documents live in a private folder on this account’s disk, not in object storage.
todos: []
isProject: false
---

# cPanel deployment assessment

Nothing was created, changed, or deleted. The Node.js “create application” form was opened only to read the version and domain lists, then cancelled. Create stayed disabled.

## What this account is

Account `usmsedu` on server `chb20`, package **GES-50G**, cPanel 134, LiteSpeed in front, CloudLinux limits.

- Disk: 6.03 GB of 50 GB
- Bandwidth: 7.27 GB of 500 GB
- RAM for this account: **1 GB** (about 8 MB in use right now)
- Entry processes: 1 of 20
- Processes: 1 of 100
- Disk I/O: capped at **1 MB/s**
- Home: `/home/usmsedu`
- Shared IP: `49.12.144.217`

Other sites on the **same** account share that 1 GB and those process limits: `usms.edu.pk`, `faculty.usms.edu.pk`, `lms.usms.edu.pk` (PHP 8.2, currently returning 503), and `usmsmail.usms.edu.pk`.

## Subdomain

`admissions.usms.edu.pk` already exists.

- Document root: `/home/usmsedu/admissions.usms.edu.pk`
- Not redirected anywhere
- **Force HTTPS is off**, so `http://` still opens
- The folder is empty apart from `cgi-bin`. Both `http://` and `https://` show a LiteSpeed directory index of `/`

The Node.js selector can attach an app to this hostname. No Node app exists yet.

## SSL

HTTPS already works. A Let’s Encrypt certificate is installed on the live site:

- Names: `admissions.usms.edu.pk`, `www.admissions.usms.edu.pk`
- Issuer: Let’s Encrypt (YR1)
- Valid: 23 Sep 2026 through 22 Dec 2026

The primary domain `usms.edu.pk` has its own certificate through 31 Oct 2026 (`usms.edu.pk`, `www.usms.edu.pk`, `mail.usms.edu.pk`).

The Let’s Encrypt plugin page still lists `admissions.usms.edu.pk` under “Issue”, which does not match the live certificate. AutoSSL is the one actually serving it. Do not issue a second certificate until that mismatch is checked, or the working cert can be replaced by accident.

## Email (use cPanel mail, not Resend)

cPanel **Email Accounts** already has working university mailboxes. Do **not** use Resend or any external mail API for production on this host.

Existing accounts include: `admin@usms.edu.pk`, `developer@usms.edu.pk`, `hr@usms.edu.pk`, `vc@usms.edu.pk`, `test@usms.edu.pk`, plus faculty addresses. There is **no** `admissions@…` mailbox yet. Quota note: unlimited mailbox slots shown; 11 used.

**Create for admissions** (Email Accounts → Create):

- Preferred: `admissions@usms.edu.pk` (same pattern as `admin@` / `hr@`)
- Acceptable alternative: `admissions@admissions.usms.edu.pk` (Email Deliverability lists that subdomain)
- Set a strong password. Keep **Sending Outgoing Email** = Allow.
- Do not reuse passwords from other mailboxes.

**SMTP settings from cPanel “Connect Devices”** (verified for `admin@usms.edu.pk`; same host for any mailbox on this account):

- Outgoing server: `mail.usms.edu.pk`
- SMTP port: `465` (SSL/TLS, recommended)
- Auth: username = full email address, password = that mailbox’s password
- Alternate: SMTP `587` without SSL/TLS (not recommended)

From Node on the **same** server, `localhost:465` or `localhost:587` often works as well; prefer `mail.usms.edu.pk:465` if localhost auth fails under CloudLinux.

**App env shape** (replace Resend):

```
SMTP_HOST=mail.usms.edu.pk
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=admissions@usms.edu.pk
SMTP_PASS=...
MAIL_FROM=admissions@usms.edu.pk
```

Code change: [server/src/lib/mail.ts](server/src/lib/mail.ts) currently calls Resend. Switch it to SMTP (e.g. `nodemailer`) using those variables. Drop `RESEND_API_KEY`. If SMTP is unset locally, keep showing the temporary password once on the confirmation screen.

**Email Deliverability** is available for `usms.edu.pk`, `admissions.usms.edu.pk`, `faculty.usms.edu.pk`, `lms.usms.edu.pk`, and `usmsmail.usms.edu.pk`. Check SPF/DKIM for `usms.edu.pk` before relying on production delivery. Use **Track Delivery** to debug bounces.

## Document storage (no object storage here)

There is **no** S3, Azure Blob, or other object-storage product in this cPanel. Available file tools:

- **File Manager** — full `/home/usmsedu` tree
- **FTP Accounts** — scoped FTP users
- **Web Disk** — WebDAV mount
- **Disk Usage** / **Email Disk Usage** — monitoring
- **Backup** / **Backup Wizard** / **JetBackup 5** — account backups
- **Directory Privacy** — password-protect a public folder (not enough for applicant CNIC scans)

**Decision for admissions documents:** store files on this account’s disk in a **private directory outside every web root**, for example:

`/home/usmsedu/apps/usms-admission/storage/uploads`

Rules:

- Never put uploads under `/home/usmsedu/admissions.usms.edu.pk` or `public_html` (directory indexes are open today; even later they must not be URL-reachable).
- Express stores only object keys/paths in MariaDB; bytes stay on disk. Serve downloads only through authenticated, short-lived routes (same idea as signed URLs in ARCHITECTURE.md).
- Optional: a dedicated FTP account with home = that storage folder for ops, or Web Disk for staff review. JetBackup 5 covers backup of the folder with the account.
- Disk is shared with the rest of the university sites (50 GB package, ~6 GB used). Plan for growth; CNIC/HSC PDFs for ~2,000 applicants need monitoring.

No separate “document storage” product to buy on this panel. Local private storage is the fit until a later cloud iteration.

## Database

PostgreSQL is not installed on `chb20`, and this cPanel user cannot install it. The decision is to use the MariaDB that is already on the server, in a **new** database. The main website database stays untouched.

Server engine: **MariaDB 10.11.16**. Existing database: `usmsedu_main_website` (752 KB), user `usmsedu_uos`. Do not select that database, and do not grant the admissions user access to it.

### What you create in cPanel

In **Manage My Databases**:

- New database suffix: `admission`. cPanel will name it `usmsedu_admission`.
- New user suffix: `admission`. cPanel will name it `usmsedu_admission`. Set a new password. Do not reuse `usmsedu_uos` or `usmsedu_usms_adm`.
- Add that user only to `usmsedu_admission`, with all privileges on that database.
- Host in the connection string is `localhost`.

Connection string shape:

`mysql://usmsedu_admission:PASSWORD@localhost:3306/usmsedu_admission`

### What the app must change after that database exists

[server/prisma/schema.prisma](server/prisma/schema.prisma) is `provider = "postgresql"`. The SQL in [server/prisma/migrations](server/prisma/migrations) uses PostgreSQL types (`CREATE TYPE ... AS ENUM`, `TIMESTAMP(3)`). Those files cannot be applied to MariaDB. [server/prisma/migrations/migration_lock.toml](server/prisma/migrations/migration_lock.toml) is locked to `postgresql`.

Required code changes, after you have created the database:

- Set `provider = "mysql"` in the Prisma schema. Prisma’s MySQL provider works with this MariaDB.
- Replace the PostgreSQL migration history with one MySQL migration. There is no production admission data to convert.
- Remove `mode: "insensitive"` from the admin search in [server/src/modules/applications/applications.routes.ts](server/src/modules/applications/applications.routes.ts). Prisma allows that option only on PostgreSQL. On this MariaDB, use collation `utf8mb4_unicode_ci` so name and application-number search stays case-insensitive.
- Point `DATABASE_URL` at `usmsedu_admission` only.

Known limits that remain after the switch: datetimes have no time zone, and later snapshot or audit data will be stored in MySQL JSON rather than PostgreSQL. The current schema (users, roles, cycles, programs, applications, profiles, reviews) fits MariaDB. This account still shares 1 GB of RAM with the other university sites. The admission tables themselves stay in their own database.

## What cPanel can and cannot run

Can run here:

- The Vite React build, as static files or served by Express
- The Express API, through **Setup Node.js App** (CloudLinux). Versions available: 14.21.3, 16.20.2, 18.20.8, 19.9.0, **20.20.2 (recommended)**, 22.22.2, 24.15.0. No app is installed
- Let’s Encrypt / the certificate that is already on the subdomain
- SSH key management is present in the panel. A login was not tested
- Outbound applicant email via cPanel SMTP (`mail.usms.edu.pk:465`)
- Private document files on disk under `/home/usmsedu/apps/...`

PostgreSQL cannot be installed by this account. The app has to be switched to MySQL before it can use `usmsedu_admission`. There is no object storage product on this panel.

## Deploy on this cPanel

```mermaid
flowchart LR
  browser[Browser]
  subdomain[admissions.usms.edu.pk]
  nodeApp[Node_Express]
  react[React_build]
  admissionDb[usmsedu_admission]
  mainDb[usmsedu_main_website]
  smtp[mail.usms.edu.pk]
  uploads[Private_uploads_dir]

  browser --> subdomain --> nodeApp
  nodeApp --> react
  nodeApp --> admissionDb
  nodeApp --> smtp
  nodeApp --> uploads
```

- You create `usmsedu_admission` and its user. Leave `usmsedu_main_website` alone.
- You create `admissions@usms.edu.pk` (or `admissions@admissions.usms.edu.pk`) and put its SMTP credentials in the Node app env. Do not use Resend.
- Create `/home/usmsedu/apps/usms-admission/storage/uploads` outside the web root for documents.
- **Setup Node.js App** on `admissions.usms.edu.pk`, Node **22.22.2** (20.20.2 if 22 misbehaves).
- Application root outside the web root, for example `/home/usmsedu/apps/usms-admission`.
- Startup file: the compiled Express server. Express must serve `client/dist`, because [server/src/server.ts](server/src/server.ts) only listens today.
- `DATABASE_URL` uses the new database. `CLIENT_ORIGIN` is `https://admissions.usms.edu.pk`. `COOKIE_SECURE=true`.
- Turn **Force HTTPS** on only after the app responds on HTTPS.
- Turn **directory indexes off** before any application files are uploaded. The open index is public today.

## Do not do these

- Do not install WordPress, Laravel, or Softaculous as a stand-in. This app is not PHP.
- Do not put the API or uploaded documents in the subdomain folder while indexes are on.
- Do not reuse `usmsedu_main_website` or its user `usmsedu_uos`.
- Do not use Resend (or another external mail API) when cPanel mail on `mail.usms.edu.pk` is available.
- Do not store applicant documents under a public document root or rely on Directory Privacy alone.
