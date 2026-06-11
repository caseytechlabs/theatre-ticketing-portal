# Theatre Ticketing Portal

React + TypeScript frontend for the Theatre Ticketing System.

## Tech Stack

- **React 18** + TypeScript
- **Tailwind CSS**
- **Vite** (dev server proxies `/api` → `localhost:8080`)
- **Axios** with JWT interceptors
- **React Router v6**

## Prerequisites

- Node.js 18+
- Backend API running on `localhost:8080` (see `theatre-ticketing-api`)

## Running

```bash
npm install
npm run dev
```

App available at `http://localhost:5173`

## Roles

| Role   | Access |
|--------|--------|
| ADMIN  | Voucher management, booking management, user management |
| CLIENT | Browse assigned vouchers, claim and pay for bookings |

## Default Credentials

| Username | Password | Role   |
|----------|----------|--------|
| admin    | admin123 | ADMIN  |
| client1  | client123| CLIENT |
| client2  | client123| CLIENT |
