# 🎮 Project JKLM Clone

A high-performance, real-time multiplayer word game. Built with speed, type-safety, and scalability in mind.

## 🛠 Tech Stack

* **Runtime:** [Bun](https://bun.sh/) (Fast JavaScript all-in-one toolkit)
* **Frontend:** [React](https://react.dev/) with [Vite](https://vitejs.dev/)
* **Styling:** [TailwindCSS](https://tailwindcss.com/)
* **Admin Panel:** [React Admin](https://marmelab.com/react-admin/)
* **Database:** [PostgreSQL](https://www.postgresql.org/) with [Prisma ORM](https://www.prisma.io/)
* **Infrastructure:** [Docker](https://www.docker.com/)
* **Database Tooling:** [DBeaver](https://dbeaver.io/) (Recommended for DB management)

---

## 📋 Development Rules & Guidelines

To ensure the best code quality and maintainability, every contributor must follow these rules:

### 1. Language Policy
* **Codebase:** Everything must be written in **English** (variables, functions, comments, commits, documentation).
* **UI/Interface:** Every text or label displayed to the final user on the screen must be in **French**.

### 2. Strict Type Safety (Zero Tolerance)
We aim for a "Bulletproof" type system. The following keywords are **strictly forbidden** in the entire project:
* ❌ No `any`
* ❌ No `unknown`
* ❌ No `undefined` (Use `null` for the intentional absence of a value or optional properties `?`).

### 3. Backend Architecture (The "Rule of 3")
The backend logic must be strictly separated into three distinct layers to avoid spaghetti code:
1.  **Controllers/API:** Handling incoming requests and responses.
2.  **Services:** Pure business logic and game mechanics.
3.  **Data Access (Prisma):** All direct interactions with the PostgreSQL database.

### 4. Maximum Reusability
* **Atomic Components:** UI elements should be small, independent, and reusable.
* **Shared Logic:** Use Custom Hooks for shared frontend logic and utility functions for backend logic.
* **Common Types:** Shared interfaces between Frontend and Backend should be centralized.

---

## 🚀 Getting Started

### Prerequisites
* [Bun](https://bun.sh/) installed.
* [Docker](https://www.docker.com/) & Docker Compose.

### Installation
1.  **Clone the repo:**
    ```bash
    git clone https://github.com/your-username/your-repo-name.git
    cd your-repo-name
    ```

2.  **Install dependencies:**
    ```bash
    bun install
    ```

3.  **Launch Environment (Database):**
    ```bash
    docker-compose up -d
    ```

4.  **Run Development Server:**
    ```bash
    bun run dev
    ```

---

## 📂 Project Structure

```text
├── apps/
│   ├── web/             # React + Vite + Tailwind (The Game)
│   ├── admin/           # React Admin (Management Dashboard)
│   └── api/             # Backend (Controllers > Services > Prisma)
├── packages/
│   ├── database/        # Prisma schema and migrations
│   └── shared/          # Shared types and constants (Strict TS)
├── docker-compose.yml
└── README.md
```