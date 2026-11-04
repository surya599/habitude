# HABITUDE — Complete Premium Habit Tracking & Personal Growth Website

**Brand:** HABITUDE  
**Tagline:** *Build a better you, one day at a time.*  
**Hero:** *"Small actions. Remarkable transformation."*

HABITUDE is a full-stack web application combining precision habit tracking, behavioral analytics, verified Stoic philosophy, distraction-free journaling, milestone-driven goal management, daily intentions, and executive weekly/monthly reviews inside an Apple-inspired dual-theme interface.

---

## 1. Technology Stack

### Frontend (`frontend/`)
- **React 18** + **TypeScript** + **Vite**
- **Tailwind CSS** + **shadcn/ui** design primitives (`clsx`, `tailwind-merge`, `class-variance-authority`)
- **Framer Motion** (spring progress rings, page transitions, toast & achievement celebrations)
- **Recharts** (9 theme-aware charts and visualizations)
- **Lucide React** (minimalist iconography)
- **React Router v6** (complete 15-page public and authenticated navigation)

### Backend (`backend/`)
- **Python 3** + **Django** + **Django REST Framework**
- **PostgreSQL 18** (`psycopg[binary]`) for persistent relational storage
- **Django Service Layer** (`backend/core/services.py`) encapsulating all streak, schedule, consistency score, insight, achievement, and review calculations
- **Django Token & Session Authentication** with strict per-user authorization isolation

---

## 2. Dual-Theme Design System (Light, Dark & System)

- **Light Mode**: Warm ivory background (`#FAF9F6`), pure white cards (`#FFFFFF`), deep charcoal typography (`#1D1D1F`), refined blue accent (`#0066CC`), soft emerald success (`#248A3D`), and natural subtle shadows.
- **Dark Mode**: Multi-layered dark surface hierarchy with deep charcoal background (`#0E0F13`), dark graphite cards (`#16181F`), elevated charcoal surfaces (`#1F222B`), soft white text (`#F5F5F7`), and refined blue (`#2997FF`).
- **System Mode**: Automatically tracks `prefers-color-scheme` changes in real time.
- **Persistence**: Synced to `localStorage` for instant zero-flash page load and persisted to the authenticated user's Django `UserProfile.theme_preference`.

---

## 3. Running HABITUDE Locally

Or use the included `start-habitude.ps1` script:

```powershell
.\start-habitude.ps1
```

### Manual Startup
1. **PostgreSQL 18 Database**:
   ```powershell
   & "C:\Program Files\PostgreSQL\18\bin\pg_ctl.exe" -D ".\.postgres_data" -o "-p 5433 -h 127.0.0.1" start
   ```
2. **Django Backend (`http://127.0.0.1:8080`)**:
   ```powershell
   cd backend
   .\.venv\Scripts\python.exe manage.py migrate
   .\.venv\Scripts\python.exe manage.py seed_habitude
   .\.venv\Scripts\python.exe manage.py runserver 127.0.0.1:8080
   ```
3. **React + Vite Frontend (`http://localhost:5173`)**:
   ```powershell
   cd frontend
   npm run dev
   ```

### Pre-Seeded Demo Account
- **Email:** `alex@habitude.app`
- **Password:** `Habitude2026!`
- Or click **"Explore Populated Demo Account"** on the Landing or Sign In page.
