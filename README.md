# FUNDSROOM — 3D Smart ERP Operations Portal

A premium, futuristic 3D Mini ERP + CRM Operations Portal designed for a wholesale electronics distribution company.

## 🚀 Key Features

### 3D Operations Intelligence
Powered by **React Three Fiber (R3F)** and **Three.js**:
- **Immersive Login**: A dynamic 3D WebGL ambient background with procedural geometry.
- **Operations Core (Dashboard)**: Real-time interactive 3D command center visualization.
- **Product Visualizer**: Procedurally generated 3D meshes for inventory assets (Headsets, Keyboards, Monitors, Mice) that you can drag and inspect.

### Premium UI/UX (Glassmorphism)
Built on a cutting-edge **Tailwind CSS v4** design system:
- **Glassmorphism Theme**: Translucent sidebars, glowing neon accents, and frosted glass cards (`var(--color-surface-glass)`).
- **Command Palette (`Ctrl+K`)**: Global search for instant navigation across customers, products, and sales orders.
- **Interactive Stepper Wizard**: A sleek 3-step shopping cart flow to generate sales orders efficiently.

### Robust Backend Foundation
A production-ready **Node.js + Express** API backed by **PostgreSQL**:
- **Transactional Integrity**: Sales orders (Challans) are processed within ACID transactions utilizing `FOR UPDATE` row-level locks to prevent race conditions during high-volume stock deductions.
- **Audit Logging**: A transparent chronological ledger of all user actions.
- **Role-Based Access Control (RBAC)**: Distinct permissions for Admin, Sales, Warehouse, and Accounts personnel.
- **Seed Data**: Fully seeded with 15 wholesale electronic assets and simulated B2B clients.

---

## 🛠️ Technology Stack

**Frontend:**
- React 18
- TypeScript
- Vite
- React Three Fiber & Drei (3D Engine)
- Tailwind CSS (v4 Styling)
- Framer Motion (Micro-animations)
- Lucide React (Icons)

**Backend:**
- Node.js (Express)
- TypeScript
- PostgreSQL (pg pool)
- JWT (Authentication)
- bcryptjs (Security)

---

## ⚙️ Quick Start (Docker)

The easiest way to run the entire stack (Database, API, Frontend) is via Docker Compose.

```bash
# Clone the repository
git clone <repo-url>
cd fundsroom-erp

# Start the cluster
docker-compose up --build -d
```

- **Frontend Application**: `http://localhost:8080`
- **Backend API**: `http://localhost:3000`

### Default Credentials
Upon initialization, the database seeds the following roles. Use any to log in:

- **Admin**: `admin@fundsroom.com` (Password: `password123`)
- **Sales**: `sales@fundsroom.com` (Password: `password123`)
- **Warehouse**: `warehouse@fundsroom.com` (Password: `password123`)
- **Accounts**: `accounts@fundsroom.com` (Password: `password123`)

---

## 🔧 Manual Development Setup

If you prefer to run the services locally outside of Docker:

### 1. Database Setup
Ensure PostgreSQL is running locally, and create a database named `fundsroom_erp`. The backend will automatically create tables and seed data upon initialization.

### 2. Backend API
```bash
cd backend
npm install

# Copy env template and modify as needed
cp .env.example .env

# Start dev server
npm run dev
```

### 3. Frontend App
```bash
cd frontend
npm install

# Start Vite dev server
npm run dev
```
Navigate to `http://localhost:5173`.

---

## 📂 Project Structure

```
fundsroom/
├── backend/                  # Express API
│   ├── src/
│   │   ├── db/              # Postgres Pool & Schema (init.ts)
│   │   ├── middleware/      # Auth, RBAC, Validation, Audit
│   │   ├── routes/          # API Endpoints
│   │   └── index.ts         # Server Entry
├── frontend/                 # React SPA
│   ├── src/
│   │   ├── components/      # Layout & Command Palette
│   │   ├── context/         # Auth & Toast Contexts
│   │   ├── pages/           # 3D Dashboard, Login, Inventory, Challans
│   │   └── App.tsx          # Routing
└── docker-compose.yml        # Orchestration
```
