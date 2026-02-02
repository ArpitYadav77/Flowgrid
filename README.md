# 🌐 FlowGrid – Local Services Booking Platform

FlowGrid is a full-stack web application that connects customers with local service providers such as salons, tutors, and other professionals.  
It enables service discovery, booking management, and secure payments with role-based dashboards.

---

## 🚀 Features

### 👤 Multi-Role System
- Customer
- Salon Owner
- Tutor / Service Provider

Each role has a **dedicated dashboard and permissions**.

---

### ✂️ Salon Owner Dashboard
- Overview of revenue, bookings, and ratings
- Manage services (add / edit / delete)
- View bookings (upcoming & past)
- Track payments
- Analytics (basic trends)
- Settings & Help Center

---

### 📅 Booking Management
- Customers can browse services
- Book services with time & price
- Salon owners can manage booking status

---

### 💳 Payments Integration
- Razorpay **Test Mode** integration
- Supports:
  - Card payments
  - UPI (Checkout flow)
  - QR code generation
- Payment history stored and displayed per user

⚠️ **Note:**  
Razorpay test-mode QR codes cannot be paid using real UPI apps (GPay/PhonePe).  
QR payments are simulated in test mode as per Razorpay’s design.

---

### 🔐 Authentication & Security
- JWT-based authentication
- Role-based access control (RBAC)
- Protected routes (frontend + backend)

---

## 🛠️ Tech Stack

### Frontend
- React.js
- CSS / modern UI components
- lucide-react icons
- Axios

### Backend
- Node.js
- Express.js
- JWT Authentication
- Razorpay SDK

### Database
- MySQL

---

## 📁 Project Structure

FLOWGRID/
│
├── backend/
│ ├── data/
│ ├── middleware/
│ │ └── auth.js
│ ├── routes/
│ ├── utils/
│ ├── server.js
│ └── .env
│
├── frontend/
│ ├── public/
│ ├── src/
│ │ ├── components/
│ │ ├── context/
│ │ ├── pages/
│ │ ├── services/
│ │ │ └── api.js
│ │ ├── styles/
│ │ ├── App.js
│ │ └── index.js
│
└── README.md

yaml
Copy code

---

## ⚙️ Setup Instructions

### 1️⃣ Clone the repository
```bash
git clone https://github.com/your-username/flowgrid.git
cd flowgrid
2️⃣ Backend Setup
bash
Copy code
cd backend
npm install
Create .env file:

env
Copy code
PORT=5000
JWT_SECRET=your_jwt_secret
RAZORPAY_KEY_ID=rzp_test_xxxxx
RAZORPAY_KEY_SECRET=xxxxxxxx
Start backend:

bash
Copy code
npm run dev
3️⃣ Frontend Setup
bash
Copy code
cd frontend
npm install
npm start
Frontend runs on:

arduino
Copy code
http://localhost:3000
💳 Razorpay Test Mode Details
Test Card
yaml
Copy code
Card Number: 4111 1111 1111 1111
Expiry: Any future date
CVV: 123
OTP: 123456
Test UPI (Checkout only)
yaml
Copy code
UPI ID: success@razorpay
OTP: 123456
❌ Real UPI apps do not work in test mode QR payments.

🧠 Design Decisions
Backend started before frontend to avoid API failures

Razorpay order-based payment flow

Simulated QR verification in test mode

Clean, role-focused dashboards

Minimal but scalable architecture

📌 Future Enhancements
Razorpay webhooks for real payment verification

Live mode payment enablement

Notifications (email / in-app)

Admin dashboard

Reviews & ratings moderation

Slot-based availability management

👨‍💻 Author
Arpit Yadav
B.Tech – Electrical & Computer Engineering
Interested in Full-Stack Development & Scalable Systems

📄 License
This project is for learning, demonstration, and portfolio purposes.
