# 🌐 FlowGrid – Local Services Booking Platform

FlowGrid is a full-stack web application that connects customers with local service providers such as salons and tutors.
It supports service discovery, slot-based booking, online payments, and role-based dashboards.

---

## 🚀 Features

### 👤 Multi-Role System
- **Customer** – browse services, book slots, pay, review
- **Salon Owner / Tutor (Provider)** – manage services, slots and bookings
- **Admin** – platform-level management

Each role has its own dashboard and permissions.

### 📅 Booking & Slots
- Browse and search services
- Slot-based availability (time slots generated per provider)
- Booking status management (provider side)
- Reviews and ratings

### 💳 Payments (Razorpay)
- Order-based payment flow with signature verification
- Card and UPI (Checkout) payments, QR code generation
- Webhook endpoint for payment events
- Per-user payment history

> ⚠️ Razorpay test-mode QR codes cannot be paid with real UPI apps (GPay/PhonePe). QR payments are simulated in test mode.

### 🔐 Authentication & Security
- JWT access tokens + refresh tokens (stored in the database)
- Email verification via [Resend](https://resend.com)
- Role-based access control (frontend + backend)
- Rate limiting on auth and general API routes

### ✨ Extras
- Real-time updates with Socket.io
- In-app chatbot
- Unsplash-powered service imagery

---

## 🛠️ Tech Stack

| Layer    | Technology |
|----------|------------|
| Frontend | React 18 (Create React App), Axios, socket.io-client |
| Backend  | Node.js, Express, Socket.io, JWT, bcryptjs, express-rate-limit |
| Database | PostgreSQL via Prisma ORM |
| Services | Razorpay (payments), Resend (email), Unsplash (images) |
| Deploy   | Vercel config included (`vercel.json`) |

---

## 📁 Project Structure

```
Flowgrid/
├── backend/
│   ├── prisma/          # schema.prisma, migrations, seed.js
│   ├── src/             # app.js, controllers, routes, services, middleware, config
│   ├── routes/          # legacy route modules (auth, bookings, payments, razorpay, ...)
│   ├── middleware/
│   ├── utils/
│   └── server.js        # entry point (HTTP + Socket.io)
├── frontend/
│   ├── public/
│   └── src/             # components, context, pages, services, styles
├── RAZORPAY_SETUP.md
├── QR_PAYMENT_GUIDE.md
├── UNSPLASH_SETUP.md
└── vercel.json
```

---

## ⚙️ Setup

### Prerequisites
- Node.js 18+
- A PostgreSQL database

### 1. Clone
```bash
git clone https://github.com/ArpitYadav77/Flowgrid.git
cd Flowgrid
```

### 2. Backend
```bash
cd backend
npm install
```

Create `backend/.env`:

```env
PORT=5000
NODE_ENV=development
DATABASE_URL=postgresql://user:password@localhost:5432/flowgrid
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_refresh_secret
FRONTEND_URL=http://localhost:3000

# Email (Resend)
RESEND_API_KEY=re_xxxxx

# Razorpay (test keys)
RAZORPAY_KEY_ID=rzp_test_xxxxx
RAZORPAY_KEY_SECRET=xxxxxxxx
RAZORPAY_WEBHOOK_SECRET=xxxxxxxx

# Unsplash
UNSPLASH_ACCESS_KEY=xxxxxxxx
```

Set up the database and start the server:

```bash
npm run db:push     # or: npm run db:migrate
npm run db:seed     # optional demo data
npm run dev         # http://localhost:5000  (health: /api/health)
```

### 3. Frontend
```bash
cd frontend
npm install
npm start           # http://localhost:3000
```

The frontend proxies API calls to `http://localhost:5000`, so **start the backend first** and make sure nothing else is using port 5000.

### Demo accounts (after `npm run db:seed`)
Password for all: `Demo@1234`

| Role     | Email |
|----------|-------|
| Admin    | admin@flowgrid.com |
| Customer | customer@flowgrid.com |
| Salon    | salon@flowgrid.com |
| Tutor    | tutor@flowgrid.com |

### Useful backend scripts
| Script | Purpose |
|--------|---------|
| `npm run dev` | Start with nodemon |
| `npm start` | Start with node |
| `npm run db:push` / `db:migrate` | Sync schema / run migrations |
| `npm run db:seed` | Seed demo data |
| `npm run db:studio` | Open Prisma Studio |
| `npm run db:reset` | Reset the database (destructive) |

---

## 💳 Razorpay Test Mode

```
Card Number: 4111 1111 1111 1111
Expiry:      any future date
CVV:         123
OTP:         123456
UPI (Checkout only): success@razorpay
```

See [RAZORPAY_SETUP.md](RAZORPAY_SETUP.md), [QR_PAYMENT_GUIDE.md](QR_PAYMENT_GUIDE.md) and [UNSPLASH_SETUP.md](UNSPLASH_SETUP.md) for details.

---

## 🧰 Troubleshooting

- **`EADDRINUSE: :::5000`** – another process holds port 5000. Stop it or change `PORT` (and the `proxy` in `frontend/package.json`).
- **Login returns 401/404 on `/api/...`** – the frontend is talking to a different backend on port 5000; confirm `http://localhost:5000/api/health` reports the FlowGrid API.
- **No emails received** – check `RESEND_API_KEY`.

---

## 📌 Future Enhancements
- Live-mode payments
- Push / in-app notifications
- Review moderation tools
- Expanded analytics

---

## 👨‍💻 Author
Arpit Yadav — B.Tech, Electrical & Computer Engineering. Interested in full-stack development and scalable systems.

## 📄 License
This project is for learning, demonstration, and portfolio purposes.
