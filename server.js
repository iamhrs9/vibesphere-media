require('dotenv').config(); // Local mein .env file padhne ke liye
const express = require('express');
const path = require('path');
const cors = require('cors');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 3000;

// --- 1. Variables (SECURE) ---
let localOrders = [];
// Password ab Environment Variable se aayega
let CURRENT_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123"; 

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html', 'htm'] }));

// --- 2. Database Connection (SECURE) ---
const mongoURI = process.env.MONGO_URI; 

if (mongoURI) {
    mongoose.connect(mongoURI)
        .then(() => console.log("✅ MongoDB Connected!"))
        .catch(err => console.log("❌ DB Error:", err.message));
} else {
    console.log("⚠️ MongoDB URI missing! Check Environment Variables.");
}

// --- Schema ---
const orderSchema = new mongoose.Schema({
    orderId: String,
    paymentId: String,
    customerName: String,
    email: String,
    phone: String,
    package: String,
    price: String,
    instaLink: String,
    date: String,
    status: { type: String, default: 'Pending' }
});
const Order = mongoose.model('Order', orderSchema);

// --- 3. Razorpay Setup (SECURE) ---
// Keys ab code mein nahi dikhengi
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID, 
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

// ==========================================
// 🧠 AI CHAT ROUTE (SECURE)
// ==========================================
app.post('/api/chat', async (req, res) => {
    const userHistory = req.body.history || [];
    const userMessage = req.body.message;
    // API Key ab hidden hai
    const API_KEY = process.env.GEMINI_API_KEY; 

    if (!API_KEY) return res.json({ reply: "Server Config Error: API Key Missing" });

    const systemPrompt = `
        You are 'VibeSphere AI', lead consultant for VibeSphere Media.
        GOAL: Sell Instagram Growth Packages.
        PACKAGES: Silver(399), Gold(669), Platinum(1199), Business(2699).
        RULES: Keep replies short. Start in English, adapt to Hindi if needed.
    `;

    try {
        let contents = userHistory;
        if (contents.length === 0 && userMessage) {
            contents = [{ role: "user", parts: [{ text: userMessage }] }];
        }
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                systemInstruction: { parts: [{ text: systemPrompt }] },
                contents: contents
            })
        });
        const data = await response.json();
        if (data.error) return res.json({ reply: "Technical update. Try in 30s. ⏳" });
        res.json({ reply: data.candidates[0].content.parts[0].text });
    } catch (error) {
        console.error("AI Error:", error);
        res.json({ reply: "Connection Failed." });
    }
});

// ==========================================
// 💳 PAYMENT ROUTES
// ==========================================
app.post('/api/create-payment', async (req, res) => {
    try {
        const { amount, currency } = req.body;
        const options = {
            amount: Math.round(amount * 100),
            currency: currency || "INR",
            receipt: "rcpt_" + Date.now()
        };
        const order = await razorpay.orders.create(options);
        res.json(order);
    } catch (error) {
        console.error("Razorpay Error:", error);
        res.status(500).send(error);
    }
});

app.post('/api/verify-payment', async (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderDetails } = req.body;
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    
    // Secret Key Environment se uthao
    const secret = process.env.RAZORPAY_KEY_SECRET;

    const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(body.toString())
        .digest('hex');

    if (expectedSignature === razorpay_signature) {
        const newOrder = new Order({
            orderId: "#ORD-" + Math.floor(100000 + Math.random() * 900000),
            paymentId: razorpay_payment_id,
            status: 'Done',
            ...orderDetails,
            date: new Date().toLocaleString()
        });

        localOrders.push(newOrder); // Backup

        try {
            if (mongoose.connection.readyState === 1) {
                await newOrder.save();
            }
            res.json({ success: true });
        } catch (err) {
            res.json({ success: true, message: "Saved Locally" });
        }
    } else {
        res.json({ success: false });
    }
});

// ==========================================
// 🔐 LOGIN & ADMIN
// ==========================================
app.post('/api/login', (req, res) => {
    const { password } = req.body;
    if (password === CURRENT_ADMIN_PASSWORD) {
        res.json({ success: true, token: "SECRET_VIBESPHERE_KEY_123" });
    } else {
        res.json({ success: false });
    }
});

const checkAuth = (req, res, next) => {
    const token = req.headers['authorization'];
    if (token === "SECRET_VIBESPHERE_KEY_123") next();
    else res.status(403).json({ error: "Access Denied" });
};

app.get('/api/admin/orders', checkAuth, async (req, res) => {
    try {
        let orders = [];
        if (mongoose.connection.readyState === 1) {
            orders = await Order.find().sort({ _id: -1 });
        }
        if (orders.length === 0) {
            orders = [...localOrders].reverse();
        }
        res.json(orders);
    } catch (err) {
        res.status(500).json({ error: "Fetch Failed" });
    }
});

app.post('/api/admin/update-status', checkAuth, async (req, res) => {
    const { id, status } = req.body;
    try {
        if (mongoose.connection.readyState === 1) {
            await Order.findOneAndUpdate({ orderId: id }, { status: status });
        }
        const localOrder = localOrders.find(o => o.orderId === id);
        if (localOrder) localOrder.status = status;
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false });
    }
});

app.post('/api/admin/change-password', checkAuth, (req, res) => {
    const { oldPassword, newPassword } = req.body;
    if (oldPassword === CURRENT_ADMIN_PASSWORD) {
        CURRENT_ADMIN_PASSWORD = newPassword;
        console.log("🔐 Password Updated Temporarily");
        res.json({ success: true });
    } else {
        res.json({ success: false, message: "Wrong old password" });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Server Running on http://localhost:${PORT}`);
});