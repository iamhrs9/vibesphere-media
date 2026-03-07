# 🚀 VibeSphere Media - Enterprise Agency 

![VibeSphere Banner](https://via.placeholder.com/1200x300/0f172a/6c63ff?text=VibeSphere+Media+-+Digital+Excellence)

**VibeSphere Media** is a hyper-aware, zero-friction Client Portal and Agency Management System designed to scale digital growth and web development services. Built with a focus on premium UI/UX, real-time tracking, and automated workflows.

## ✨ Premium Features

### 🛡️ 1. Enterprise-Grade Security
* **Magic Link Login:** Passwordless, 1-click secure login using encrypted JWTs.
* **Device Security Audit:** Google-style real-time tracking of active sessions (Device, Browser, IP).
* **Remote Logout:** Clients can instantly revoke access from all other active devices.
* **OTP Rate Limiting:** 24-hour smart locks to prevent spam and abuse.

### 🍕 2. Real-Time Client Experience
* **Swiggy-Style Live Tracker:** Visual 4-step progress bar (Order Placed ➔ In Progress ➔ Client Review ➔ Delivered).
* **Live 'Ting' Notifications:** Powered by `Socket.io` for zero-refresh, real-time dashboard updates.
* **Auto-Onboarding:** Smart popup forms to capture brand details (colors, reference links) for new clients automatically.

### 💰 3. Automated Billing & Handover
* **Premium PDF Invoices:** Auto-generated, mathematically accurate invoices via `PDFKit`.
* **Digital Handover Certificates:** Features QR code verification for authenticity.
* **Razorpay Integration:** Seamless payment gateway with smart currency parsing.

### 🤖 4. AI & Automations
* **Gemini AI Sales Bot:** Integrated chat assistant trained to pitch packages and close deals using psychological sales tactics.
* **God-Mode Email Engine:** Custom Brevo API wrapper to bypass standard server port blocks, ensuring 100% inbox delivery.
* **WhatsApp Engine (Beta):** Integrated Baileys library for automated WhatsApp updates.

### 🏢 5. Internal Staff CRM
* Dedicated staff portal for calling data, lead tracking, and task management.
* Performance analytics (Total vs. Completed leads) with live dashboards.
* Admin controls for secure staff ID generation and Notice Board updates.

---

## 🛠️ Tech Stack

* **Backend:** Node.js, Express.js
* **Database:** MongoDB (Mongoose)
* **Real-time Engine:** Socket.io
* **Security:** bcryptjs, crypto, ua-parser-js, express-rate-limit
* **Utilities:** PDFKit, QRCode, Razorpay, Nodemailer, Google Auth Library
* **Frontend:** HTML5, CSS3, Vanilla JS (No heavy frameworks for max speed)

---

## ⚙️ Environment Variables (`.env`)

To run this project locally, create a `.env` file in the root directory:



## 🚀 Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/iamhrs9/vibesphere-media.git
   cd vibesphere-media
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Run the server:**
   ```bash
   npm start
   # or for development:
   node server.js
   ```

4. **Access the app:**
   Open the app in your browser at `http://localhost:3000`



👨‍💻 Founder & Architect
Harsh Panwar CEO & Tech Head, VibeSphere Media www.vibespheremedia.in | Contact Support

"Building software that feels like magic." ✨

© 2026 VibeSphere Media. All rights reserved.