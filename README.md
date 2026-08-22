# DAYFLOW — The Human Operating System

> **Odoo × NMIT Hackathon 2026** | Team Submission

An intelligent, real-time Human Resource Management System that transforms workforce management from a reactive process into a proactive, AI-driven experience.

---

## 🚀 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + Vite + Framer Motion |
| Backend | Node.js + Express + Socket.IO |
| Database | PostgreSQL (Neon Cloud) |
| ORM | Drizzle ORM |
| AI Engine | Google Gemini 1.5 Flash (Tool-Calling) |
| Charts | Recharts |
| PDF | jsPDF |
| Email | Nodemailer (Gmail SMTP) |

---

## 🏃 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Git

### 1. Clone the repository
```bash
git clone https://github.com/Deepakuk17/dayflow.git
cd dayflow
```

### 2. Install dependencies
```bash
# Server
cd server
npm install

# Client
cd ../client
npm install
```

### 3. Configure environment
The `.env` files are pre-configured for development. For production, update:
- `server/.env` — Neon DB URL, Gemini API key, Gmail SMTP
- `client/.env` — API and Socket URLs

### 4. Push database schema
```bash
cd server
npm run db:push
```

### 5. Seed demo data
```bash
npm run seed
```

### 6. Start development servers
```bash
# From root - runs both servers concurrently
npm run dev

# Or separately:
npm run dev:server  # Port 5000
npm run dev:client  # Port 5173
```

---

## 🔑 Demo Credentials

| Role | Email | Password |
|---|---|---|
| HR Admin | `hr@dayflow.com` | `Hr@dayflow2026` |
| Employee (Deepak) | `deepak@dayflow.com` | `Emp@dayflow2026` |
| Employee (Aishwarya) | `aishwarya@dayflow.com` | `Emp@dayflow2026` |
| All other employees | `{name}@dayflow.com` | `Emp@dayflow2026` |

---

## ✨ Features

### 👤 Employee Portal
- **My Desk** — Personal dashboard with attendance status, leave balance, and notifications
- **Attendance** — Live clock, one-click check-in/out, 30-day calendar heatmap
- **Leave** — AI-assisted leave application (natural language → form fill), 3-step wizard
- **My Passport** — Flip-card employee identity card with professional info
- **Payroll** — Monthly salary breakdown + one-click PDF salary slip download

### 🏢 HR Command Center
- **Dayflow HQ** — Real-time KPI dashboard with live Socket.IO updates, quick AI queries
- **Employees** — Searchable employee grid with add employee modal
- **Attendance** — Daily attendance log + rule-based anomaly intelligence
- **Leave** — Kanban-style leave management with approve/reject workflow
- **Payroll** — Edit salary components with real-time net calculation
- **Intelligence** — Full AI Copilot chat with Gemini tool-calling (live HR data)
- **Reports** — Charts: attendance trend, leave distribution, dept absenteeism
- **Action Center** — Unified pending approvals + critical alerts
- **Activity Log** — Complete timestamped audit trail

### ⚡ Real-Time Features (Socket.IO)
- Live check-in/out notifications to HR
- Instant leave approval/rejection push to employee
- Dashboard auto-refresh on data changes
- Connection status indicator

### 🤖 AI Features (Gemini)
- **HR Copilot** — Natural language queries over live HR data via 10 controlled tools
- **Leave Assistant** — Parses natural language leave requests into structured form data
- **Proactive Insights** — Auto-generated alerts for anomalies and pending items

---

## 📁 Project Structure

```
dayflow/
├── AI Contents/              # Original hackathon documents (required in repo)
├── server/                   # Node.js + Express backend
│   ├── src/
│   │   ├── db/               # Schema, migrations, seed data
│   │   ├── middleware/       # Auth JWT + Audit logging
│   │   ├── routes/           # All API endpoints
│   │   └── services/         # Gemini AI + Email services
│   └── .env                  # Server config (not committed in prod)
├── client/                   # React + Vite frontend
│   └── src/
│       ├── context/          # AuthContext + SocketContext
│       ├── pages/            # All page components
│       ├── components/       # Shared components
│       ├── services/         # Axios API client
│       └── index.css         # Complete design system
└── package.json              # Root workspace config
```

---

## 👥 Team

| Member | GitHub |
|---|---|
| Deepak U K | [@Deepakuk17](https://github.com/Deepakuk17) |
| Aishwarya Muruganantham | [@Aishwarya-Muruganantham21](https://github.com/Aishwarya-Muruganantham21) |

---

## 📝 License

Built for Odoo × NMIT Hackathon 2026. All rights reserved.
