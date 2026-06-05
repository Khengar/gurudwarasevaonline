<div align="center">

# 🪯 GurSewa Online

**A modern, full-stack Gurudwara Management System built for Sikh institutions.**

Manage Seva Receipts, Payments, Yatri Nivas Bookings, Room Management, Ledger Reports and more — all from one clean, elegant dashboard.

[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=nextdotjs)](https://nextjs.org)
[![Prisma](https://img.shields.io/badge/Prisma-5.14-2D3748?logo=prisma)](https://prisma.io)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-3.4-06B6D4?logo=tailwindcss)](https://tailwindcss.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)](https://typescriptlang.org)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

</div>

---

## ✨ Features

| Module | Description |
|---|---|
| **📊 Dashboard** | Live stats — daily receipts, payments, bookings at a glance |
| **🧾 Receipts** | Issue Seva receipts with PDF generation, UPI/Cash/Cheque support |
| **💸 Payments** | Track Gurudwara expenses against category heads |
| **🏨 Yatri Nivas** | Full room booking system with calendar and check-in/out desk |
| **📋 Ledger Report** | Date-range filtered financial ledger with Excel export |
| **🗂️ Category Heads** | Manage receipt/payment categories and sub-heads |
| **👥 Users** | Role-based user management (SuperAdmin / Admin / User) |
| **🔔 Notifications** | Live bell notifications from latest receipts and bookings |
| **🏛️ Multi-Trust** | One license, multiple Gurudwara branches (Sub-Trusts) |
| **⚙️ Settings** | Trust profile, contact details printed on PDF receipts |

---

## 🛠️ Tech Stack

- **Framework** — [Next.js 14](https://nextjs.org) (App Router)
- **Database ORM** — [Prisma 5](https://prisma.io) with MySQL
- **Authentication** — [NextAuth.js v4](https://next-auth.js.org) (Credentials provider)
- **UI** — [Tailwind CSS](https://tailwindcss.com) + [Framer Motion](https://www.framer.com/motion/) + [Radix UI](https://radix-ui.com)
- **State Management** — [Zustand](https://zustand-demo.pmnd.rs/)
- **Data Fetching** — [TanStack React Query v5](https://tanstack.com/query/latest)
- **Tables** — [TanStack React Table v8](https://tanstack.com/table/latest)
- **Calendar** — [react-big-calendar](https://github.com/jquense/react-big-calendar)
- **PDF Generation** — [jsPDF](https://github.com/parallax/jsPDF) + jspdf-autotable
- **Excel Export** — [xlsx](https://github.com/SheetJS/sheetjs)
- **Package Manager** — [pnpm](https://pnpm.io)

---

## 🚀 Quick Setup

### Prerequisites

Make sure you have these installed before you begin:

| Tool | Version | Install |
|---|---|---|
| Node.js | ≥ 18.x | [nodejs.org](https://nodejs.org) |
| pnpm | ≥ 8.x | `npm install -g pnpm` |
| MySQL | ≥ 8.x | [mysql.com](https://mysql.com) or use [XAMPP](https://apachefriends.org) |

---

### Step 1 — Clone the Repository

```bash
git clone https://github.com/Khengar/gurudwarasevaonline.git
cd gurudwarasevaonline
```

### Step 2 — Install Dependencies

```bash
pnpm install
```

### Step 3 — Create the MySQL Database

Log into MySQL and create an empty database:

```sql
CREATE DATABASE gursewa CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### Step 4 — Configure Environment Variables

Create a `.env` file in the root of the project:

```bash
cp .env.example .env
```

> If `.env.example` doesn't exist, create `.env` manually:

```env
# ─── Database ──────────────────────────────────────────────────────
DATABASE_URL="mysql://root:your_password@localhost:3306/gursewa"

# ─── NextAuth ──────────────────────────────────────────────────────
# Generate a secure secret: openssl rand -base64 32
NEXTAUTH_SECRET="your-super-secret-key-here"
NEXTAUTH_URL="http://localhost:3000"
```

### Step 5 — Push Schema to Database

Sync the Prisma schema to your MySQL database:

```bash
npx prisma db push
```

### Step 6 — Seed the Database

Populate the database with realistic Indian/Sikh sample data (rooms, categories, users, receipts, bookings):

```bash
npx prisma db seed
```

This creates the following test accounts:

| Role | Email | Password |
|---|---|---|
| **Super Admin** | `admin@gurusewa.com` | `Admin@123` |
| **Trust Admin** | `gss@gurusewa.com` | `Admin@123` |
| **Sewadar (User)** | `sewadar@gurusewa.com` | `Admin@123` |

### Step 7 — Start the Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. 🎉

---

## 📁 Project Structure

```
gurudwarasevaonline/
├── app/
│   ├── (dashboard)/          # Protected dashboard routes
│   │   ├── bookings/         # Yatri Nivas booking desk
│   │   ├── check-in/         # Check-in / Check-out desk
│   │   ├── dashboard/        # Main stats dashboard
│   │   ├── payments/         # Payment vouchers
│   │   ├── receipts/         # Seva receipt management
│   │   ├── reports/          # Ledger & financial reports
│   │   ├── rooms/            # Room management
│   │   ├── settings/         # Trust settings & sub-trusts
│   │   └── users/            # User management
│   ├── api/                  # Next.js API routes (REST)
│   ├── login/                # Login page
│   └── globals.css           # Global styles
├── components/               # Reusable UI components
├── lib/
│   ├── auth.ts               # NextAuth configuration
│   ├── prisma.ts             # Prisma client singleton
│   ├── store/                # Zustand global state
│   ├── pdf/                  # PDF receipt generator
│   └── excel/                # Excel export utilities
├── prisma/
│   ├── schema.prisma         # Database schema
│   └── seed.ts               # Database seeder
└── middleware.ts             # Route protection middleware
```

---

## 🔐 User Roles

| Role | Access |
|---|---|
| **SUPERADMIN** | Full platform access — manage all Trusts, Licenses, Users |
| **ADMIN** | Full access within their assigned Gurudwara Trust |
| **USER** | Data entry only — receipts, payments, bookings |

---

## 📜 Available Scripts

```bash
pnpm dev          # Start development server (localhost:3000)
pnpm build        # Build production bundle
pnpm start        # Start production server

npx prisma db push    # Sync schema changes to DB
npx prisma db seed    # Re-seed the database with sample data
npx prisma studio     # Open Prisma GUI database browser
```

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch: `git checkout -b feat/your-feature`
3. Commit your changes: `git commit -m 'feat: add your feature'`
4. Push to the branch: `git push origin feat/your-feature`
5. Open a Pull Request

---

## 📄 License

This project is licensed under the **MIT License**. See [LICENSE](LICENSE) for details.

---

<div align="center">

Built with ❤️ for Sikh institutions worldwide.

**ਵਾਹਿਗੁਰੂ ਜੀ ਕਾ ਖਾਲਸਾ, ਵਾਹਿਗੁਰੂ ਜੀ ਕੀ ਫਤਹਿ**

</div>
