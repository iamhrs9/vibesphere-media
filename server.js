require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const cors = require('cors');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const mongoose = require('mongoose');
const UAParser = require('ua-parser-js');
const { OAuth2Client } = require('google-auth-library');
const GOOGLE_CLIENT_ID = "877277700036-mk598mhkp55jdqmtcdi3k8tks1dhi045.apps.googleusercontent.com";
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);
const nodemailer = require('nodemailer');
const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const fs = require('fs');
const bcrypt = require('bcryptjs'); // Using bcryptjs for compatibility
const multer = require('multer');
const cloudinary = require('cloudinary').v2;

// ==========================================
// ☁️ CLOUD UPLOAD CONFIG (ImgBB + Cloudinary)
// ==========================================
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB max

// Cloudinary Config (For PDFs)
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// ImgBB Upload Helper (For Images)
async function uploadToImgBB(base64Image) {
    const apiKey = process.env.IMGBB_API_KEY;
    if (!apiKey) throw new Error('IMGBB_API_KEY missing in .env');

    // Remove data:image/xxx;base64, prefix if present
    const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, '');

    const formData = new URLSearchParams();
    formData.append('key', apiKey);
    formData.append('image', cleanBase64);

    const response = await fetch('https://api.imgbb.com/1/upload', {
        method: 'POST',
        body: formData
    });
    const data = await response.json();

    if (data.success) return data.data.display_url;
    throw new Error('ImgBB upload failed: ' + JSON.stringify(data));
}

// Cloudinary Upload Helper (For PDFs)
async function uploadToCloudinary(fileBuffer, originalName) {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            { resource_type: 'raw', folder: 'vibesphere-chat', public_id: `${Date.now()}_${originalName}` },
            (error, result) => {
                if (error) reject(error);
                else resolve(result.secure_url);
            }
        );
        stream.end(fileBuffer);
    });
}
//const { default: makeWASocket, DisconnectReason, useMultiFileAuthState, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
//const pino = require('pino');
//const qrcode = require('qrcode');
const app = express();
const server = http.createServer(app);
// 🟢 FIX: Live Server ke liye Socket CORS open kar diya
const io = require('socket.io')(server, {
    cors: {
        origin: "*", // Yeh live server pe block hone se rokega
        methods: ["GET", "POST"],
        credentials: true
    },
    maxHttpBufferSize: 1e8 // 🟢 NAYA FIX: 100 MB tak ki photo allow karega!

});

// 🟢 THE SOCKET.IO ENGINE (Live Dashboard Bouncer)
io.on('connection', (socket) => {
    // Jab koi client dashboard kholega
    socket.on('join_room', (email) => {
        socket.join(email);
        console.log(`🟢 Client Live: ${email}`);
    });

    // 🟢 NAYA: CHAT MESSAGE ENGINE
    socket.on('send_message', async (data) => {
        try {
            const settings = await AppSettings.findOne();
            if (settings && settings.isChatBlocked && data.role !== 'Admin') {
                return socket.emit('chat_error', "Admin has blocked the team chat.");
            }

            if (data.role !== 'Admin') {
                const staff = await Staff.findOne({ email: data.senderEmail });
                if (staff && staff.isMuted) {
                    return socket.emit('chat_error', "You have been muted by Admin.");
                }
            }

            const newMessage = new Chat({
                senderName: data.senderName,
                senderEmail: data.senderEmail,
                role: data.role,
                message: data.message,
                fileUrl: data.fileUrl || '',
                fileType: data.fileType || '',
                fileName: data.fileName || '',
                profilePhoto: data.profilePhoto || ''
            });
            await newMessage.save();

            io.emit('receive_message', newMessage); // Sabko live message bhej do
        } catch (e) {
            console.error("Chat Socket Error:", e);
        }
    });
});
const PORT = process.env.PORT || 3000;
const rateLimit = require('express-rate-limit'); // 
app.use(cors({
    origin: true,
    credentials: true
}));
app.use(cookieParser());


// ==========================================
// 🎨 PREMIUM INVOICE DESIGN (BUG FREE)
// ==========================================
function buildProfessionalInvoice(doc, order) {
    const logoPath = path.join(__dirname, 'public', 'icon.png');
    const displayPrice = order.price ? order.price.replace('₹', 'INR ') : 'INR 0';

    // --- 1. HEADER ---
    try {
        if (fs.existsSync(logoPath)) {
            doc.image(logoPath, 50, 40, { width: 140 });
        }
    } catch (e) { }

    doc.font('Helvetica').fontSize(10).fillColor('#555555')
        .text('Digital Growth & Web Agency', 50, 95)
        .text('Tech Park, Jaipur, RJ 302001', 50, 110)
        .text('support@vibespheremedia.in', 50, 125)
        .text('www.vibespheremedia.in', 50, 140);

    doc.fillColor('#3b82f6').font('Helvetica-Bold').fontSize(28).text('INVOICE', 380, 45, { align: 'right', width: 160 });

    // --- 2. CLIENT & INVOICE DETAILS ---
    const detailY = 185;

    // Left Side
    doc.fillColor('#000000').font('Helvetica-Bold').fontSize(11).text('Client Details', 50, detailY);
    doc.font('Helvetica').fontSize(10).fillColor('#333333')
        .text(`Name: ${order.customerName || 'Client'}`, 50, detailY + 18)
        .text(`Email: ${order.email || 'N/A'}`, 50, detailY + 33)
        .text(`Phone: ${order.phone || 'N/A'}`, 50, detailY + 48);

    // Right Side (Fixed Bug - Strict Coordinates)
    const rightLabelX = 330;
    const rightValueX = 410;

    doc.font('Helvetica-Bold').fillColor('#000000').text('Date of Issue:', rightLabelX, detailY);
    doc.font('Helvetica').text(`${new Date(order.date).toLocaleDateString()}`, rightValueX, detailY);

    doc.font('Helvetica-Bold').text('Invoice Code:', rightLabelX, detailY + 15);
    doc.font('Helvetica').text(`${order.orderId}`, rightValueX, detailY + 15);

    doc.font('Helvetica-Bold').text('Payment ID:', rightLabelX, detailY + 30);
    doc.font('Helvetica').text(`${order.paymentId || 'N/A'}`, rightValueX, detailY + 30);

    doc.font('Helvetica-Bold').text('Status:', rightLabelX, detailY + 45);
    doc.font('Helvetica-Bold').fillColor('#16a34a').text('PAID', rightValueX, detailY + 45);

    // --- 3. TABLE HEADER ---
    const tableTop = 270;
    doc.rect(50, tableTop, 490, 25).fill('#3b82f6');

    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(10)
        .text('Description', 60, tableTop + 7)
        .text('Qty', 330, tableTop + 7)
        .text('Rate', 400, tableTop + 7)
        .text('Amount', 480, tableTop + 7);

    // --- 4. TABLE ROW ---
    doc.fillColor('#333333').font('Helvetica').fontSize(10)
        .text(`${order.package || 'VibeSphere Digital Service'}`, 60, tableTop + 35)
        .text('1', 330, tableTop + 35)
        .text(displayPrice, 400, tableTop + 35)
        .text(displayPrice, 480, tableTop + 35);

    doc.moveTo(50, tableTop + 60).lineTo(540, tableTop + 60).strokeColor('#e2e8f0').lineWidth(1).stroke();

    // --- 5. TOTAL CALCULATION ---
    const totalY = tableTop + 80;

    doc.font('Helvetica-Bold').fontSize(10).fillColor('#333333')
        .text('Subtotal', 400, totalY)
        .text('Tax (0%)', 400, totalY + 20);

    doc.font('Helvetica').fontSize(10)
        .text(displayPrice, 480, totalY)
        .text('INR 0.00', 480, totalY + 20);

    doc.rect(380, totalY + 40, 160, 25).fill('#f1f5f9');

    doc.fillColor('#000000').font('Helvetica-Bold').fontSize(11)
        .text('Total Paid', 390, totalY + 47)
        .text(displayPrice, 480, totalY + 47);


    // --- 6. TERMS & CONDITIONS (Legal Section) ---
    const termsY = totalY + 90;
    doc.fillColor('#000000').font('Helvetica-Bold').fontSize(10)
        .text('Terms & Conditions:', 50, termsY);

    doc.font('Helvetica').fontSize(9).fillColor('#64748b')
        .text('1. Full details regarding the deliverables of this package are available on our official website.', 50, termsY + 15)
        .text('2. All payments are strictly non-refundable once the project work has been initiated.', 50, termsY + 30)
        .text('3. For refund requests (valid only before work starts), contact support within 24 hours of payment.', 50, termsY + 45)
        .text('4. Any legal disputes arising from this transaction will be subject to the jurisdiction of Jaipur, India.', 50, termsY + 60)
        .text('5. This is a computer-generated invoice and does not require a physical signature.', 50, termsY + 75);
    // ==========================================
    //  Client Dashboard Tracker Note
    // ==========================================
    doc.rect(50, termsY + 100, 490, 25).fill('#f8fafc'); // Light gray SaaS box
    doc.fillColor('#475569').font('Helvetica-Bold').fontSize(9)
        .text(' Track Order History & Download Certificates at:', 60, termsY + 108);
    doc.fillColor('#3b82f6').font('Helvetica-Bold').fontSize(9)
        .text('vibespheremedia.in/dashboard', 330, termsY + 108);

    // --- 7. FOOTER ---
    doc.font('Helvetica-Bold').fontSize(10).fillColor('#383d46')
        .text('Thank you for choosing VibeSphere Media.', 50, 750, { align: 'center', width: 490 });

    doc.end();
}
// --- 1. Variables ---
let CURRENT_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "DEFAULT_SECRET_KEY";

app.use(cors());

// ✅ 10MB Limit for Photos
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
// ==========================================
// 🟢 GLOBAL EMAIL CASE-SENSITIVITY FIX (MASTER MIDDLEWARE)
// ==========================================
app.use((req, res, next) => {
    if (req.body) {
        // 1. Agar normal email field hai (Signup, Login, Forgot Pass, Staff Auth)
        if (typeof req.body.email === 'string') {
            req.body.email = req.body.email.toLowerCase().trim();
        }
        // 2. Agar Order Details ke andar email hai (Payment ke time)
        if (req.body.orderDetails && typeof req.body.orderDetails.email === 'string') {
            req.body.orderDetails.email = req.body.orderDetails.email.toLowerCase().trim();
        }
    }
    next();
});

// ==========================================
// 🛡️ ANTI-SPAM: OTP RATE LIMITER
// ==========================================
// Ek IP address se 15 minute mein sirf 3 baar OTP maang sakte hain
const otpLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 3, // Maximum 3 requests allowed per IP
    message: { success: false, message: "🚨 Too many OTP requests from this IP! Please wait 15 minutes to prevent spam." },
    standardHeaders: true,
    legacyHeaders: false,
});
// Frontend files serve
app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html', 'htm'] }));

// --- 2. Database Connection ---
const mongoURI = process.env.MONGO_URI;

if (mongoURI) {
    mongoose.connect(mongoURI)
        .then(() => console.log("✅ MongoDB Connected Successfully!"))
        .catch(err => console.error("❌ DB Connection Error:", err.message));
} else {
    console.warn("⚠️ WARNING: MongoDB URI missing in Environment Variables.");
}
// --- Client/User Schema (NEW) ---
const userSchema = new mongoose.Schema({
    name: String,
    email: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    phone: String,
    picture: String,
    googleId: String,
    resetOtp: String,
    resetOtpExpiry: Date,
    otpRequestCount: { type: Number, default: 0 },
    otpWindowStart: Date,
    isBanned: { type: Boolean, default: false }, // 🟢 NAYA LOCK: Default koi ban nahi hoga                       
    magicToken: String,
    magicTokenExpiry: Date,

    // 🛡️ SECURITY AUDIT (Device Tracking)
    activeSessions: [{
        token: String,
        device: String,
        browser: String,
        ip: String,
        lastActive: { type: Date, default: Date.now }
    }],

    // 🤖 AUTO-ONBOARDING DATA
    isOnboarded: { type: Boolean, default: false }, // Check karega ki form bhar diya ya nahi
    brandName: { type: String, default: "" },
    brandColors: { type: String, default: "" },
    referenceLinks: { type: String, default: "" },

    date: { type: Date, default: Date.now }
});
const User = mongoose.model('User', userSchema);
// ==========================================
// 💸 PAYOUT REQUEST SCHEMA (UPDATED)
// ==========================================
const payoutSchema = new mongoose.Schema({
    staffEmail: String,
    staffName: String,
    amount: Number,
    paymentMethod: String, // 'UPI' ya 'Bank'
    paymentDetails: Object, // Isme UPI ID ya Bank Details save hongi
    status: { type: String, default: 'Pending' },
    date: { type: Date, default: Date.now }
});
const Payout = mongoose.model('Payout', payoutSchema);

// ==========================================
// 💸 PAYOUT SYSTEM APIs
// ==========================================

// 1. Staff Request Karega (Advanced)
app.post('/api/staff/request-payout', async (req, res) => {
    try {
        const { email, amount, paymentMethod, paymentDetails } = req.body;
        const staff = await Staff.findOne({ email });

        if (!staff || staff.pendingPayout <= 0) {
            return res.json({ success: false, message: "Aapke paas koi pending balance nahi hai." });
        }

        // 🟢 NAYA LOCK: Check karo ki balance se zyada toh nahi maang raha
        if (amount <= 0 || amount > staff.pendingPayout) {
            return res.json({ success: false, message: "Invalid amount! Check your pending balance." });
        }

        // Anti-Spam Check
        const existingReq = await Payout.findOne({ staffEmail: email, status: 'Pending' });
        if (existingReq) {
            return res.json({ success: false, message: "Aapki ek request pehle se pending hai!" });
        }

        const newPayout = new Payout({
            staffEmail: staff.email,
            staffName: staff.name,
            amount: amount,
            paymentMethod: paymentMethod,
            paymentDetails: paymentDetails
        });
        await newPayout.save();

        // 🟢 REAL-TIME: Notify Admin
        io.to('Admin').emit('new_payout_request');

        res.json({ success: true, message: "Payout Request Sent to Admin Successfully! 🚀" });
    } catch (e) {
        res.status(500).json({ success: false, error: "Server Error" });
    }
});
// 4. Staff Apni Payout History Dekhega (Dashboard ke liye)
app.post('/api/staff/my-payouts', async (req, res) => {
    try {
        const { email } = req.body;
        // Staff ke email se saari requests uthao, naye wale pehle dikhao
        const payouts = await Payout.find({ staffEmail: email }).sort({ date: -1 });
        res.json({ success: true, payouts });
    } catch (e) {
        res.status(500).json({ success: false, error: "Server Error" });
    }
});
// (Baaki /api/admin/payout-requests aur /api/admin/approve-payout wahi rahenge jo tune pehle daale the)

// 🚀 THE GOD MODE BREEVO API WRAPPER (BYPASSES RENDER BLOCKS)


const transporter = {
    verify: function (callback) {
        if (process.env.BREVO_API_KEY) {
            console.log("✅ Brevo API Ready to fire on Port 443!");
            if (callback) callback(null, true);
        } else {
            console.log("❌ BREVO_API_KEY is missing in .env!");
        }
    },
    sendMail: async function (mailOptions) {
        const apiKey = process.env.BREVO_API_KEY;

        // 1. PDF Attachments ko Base64 mein convert karna (Brevo API ke liye)
        let formattedAttachments = [];
        if (mailOptions.attachments && mailOptions.attachments.length > 0) {
            formattedAttachments = mailOptions.attachments.map(att => ({
                content: att.content.toString('base64'), // Buffer to Base64
                name: att.filename
            }));
        }

        // 2. Data pack karna
        // 2. Data pack karna
        const payload = {
            // 🟢 NAYA FIX: Ab ye mailOptions se 'founder@' aur tera naam uthayega!
            sender: {
                email: mailOptions.from || process.env.EMAIL_USER,
                name: mailOptions.fromName || "VibeSphere Media"
            },
            to: [{ email: mailOptions.to }],
            subject: mailOptions.subject,
            textContent: mailOptions.text || "",
            htmlContent: mailOptions.html || "",
        };
        // 🟢 THE GOD MODE FIX:

        // 1. Set HTML Content
        if (mailOptions.html) {
            payload.htmlContent = mailOptions.html;
        } else if (mailOptions.text) {
            payload.htmlContent = `<p style="font-family: sans-serif; color: #333;">${mailOptions.text.replace(/\n/g, '<br>')}</p>`;
        } else {
            payload.htmlContent = "<p>Message from VibeSphere Media</p>";
        }

        // 2. Set Plain Text Content (Spam filter bypass karne ke liye)
        if (mailOptions.text) {
            payload.textContent = mailOptions.text;
        } else if (mailOptions.html) {
            // Agar sirf HTML aayi hai, toh tags (<p>, <div>) ko hata kar plain text bana do
            payload.textContent = mailOptions.html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        } else {
            payload.textContent = "Message from VibeSphere Media";
        }
        // 3. Render ke bahar API shoot karna!
        return fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'api-key': apiKey,
                'content-type': 'application/json'
            },
            body: JSON.stringify(payload)
        })
            .then(res => res.json())
            .then(data => {
                if (data.messageId) console.log('✅ Email Fired Successfully via API:', data.messageId);
                else console.log('⚠️ API Response:', data);
            })
            .catch(err => console.error('❌ Brevo API Error:', err));
    }
};

// Check if API key is loaded
transporter.verify();
// --- 🔐 CLIENT AUTH & DASHBOARD APIs ---

// --- 🔐 CLIENT AUTH & DASHBOARD APIs ---

// 1. Client Signup
// 1. Client Signup (WITH FOUNDER'S WELCOME EMAIL)
app.post('/api/auth/signup', async (req, res) => {
    try {
        const { name, email, password, phone } = req.body;
        const existingUser = await User.findOne({ email });
        if (existingUser) return res.json({ success: false, message: "Email already exists!" });

        // Hash password before saving
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ name, email, password: hashedPassword, phone });
        await newUser.save();

        // ==========================================
        // 🟢 THE "FOUNDER'S WELCOME" EMAIL MAGIC
        // ==========================================
        let mailOptions = {
            from: process.env.FOUNDER_EMAIL,// 👈 Yahan apna custom founder email daal de
            fromName: "Harsh Panwar",           // 👈 Seedha tere naam se mail jayega
            to: newUser.email,
            subject: "Welcome to VibeSphere! (Quick question for you)",
            // ⚠️ Dhyan rakhna: Isme hum jaan-boojh kar koi bhari design/colors nahi daal rahe. 
            // Plain text emails Gmail ke "Promotions" tab ko bypass karke direct "Primary Inbox" me girti hain!
            html: `
                <div style="font-family: Arial, sans-serif; font-size: 15px; color: #1e293b; line-height: 1.6; max-width: 600px;">
                    <p>Hi ${newUser.name},</p>
                    <p>I'm Harsh, the founder of VibeSphere Media. I noticed you just created an account, and I wanted to personally reach out and welcome you to our platform.</p>
                    <p>We built VibeSphere to help businesses scale with premium digital growth and web solutions. Whenever you are ready to take the next step, my team and I are here to make it happen.</p>
                    <p>If you have any questions, need a custom package, or just want to discuss your business goals, <strong>reply directly to this email</strong>. I check this inbox myself.</p>
                    <p>Excited to see what we build together!</p>
                    <br>
                    <p>Best regards,<br>
                    <strong>Harsh Panwar</strong><br>
                    Founder & Tech Head, VibeSphere<br>
                    <a href="https://vibespheremedia.in" style="color: #6c63ff;">vibespheremedia.in</a></p>
                </div>
            `
        };

        // Email background mein shoot kar do
        transporter.sendMail(mailOptions).catch(err => console.error('Welcome Email Error:', err));

        res.json({ success: true, message: "Account Created! Please Login." });
    } catch (e) { res.status(500).json({ success: false, error: "Signup Failed" }); }
});

// 2. Client Login
// 2. Client Login (WITH DEVICE & LOCATION SECURITY ALERT)
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });

        if (user && await bcrypt.compare(password, user.password)) {
            // Ban check
            if (user.isBanned) {
                return res.json({ success: false, message: "🚫 Your account has been restricted by Admin. Contact Support." });
            }
            // ==========================================
            // 🕵️‍♂️ SECURITY AUDIT: DEVICE & BROWSER TRACKING
            // ==========================================
            const parser = new UAParser(req.headers['user-agent']);
            const agentData = parser.getResult();

            const deviceName = agentData.device.vendor
                ? `${agentData.device.vendor} ${agentData.device.model}`
                : agentData.os.name || 'Unknown Device';

            const browserName = agentData.browser.name || 'Unknown Browser';
            const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

            // Create JWT Token for Client
            const token = jwt.sign({
                email: user.email,
                role: 'Client',
                name: user.name
            }, process.env.JWT_SECRET || "SECRET_VIBESPHERE_KEY_123", { expiresIn: '7d' });

            res.cookie('token', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'Strict',
                maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
            });

            user.activeSessions.push({
                token: token, // Store cookie signature for invalidation
                device: deviceName,
                browser: browserName,
                ip: ipAddress,
                lastActive: Date.now()
            });

            await user.save();
            console.log(`🛡️ New Login Alert: ${user.email} logged in from ${deviceName} using ${browserName}`);
            // ==========================================


            // Client ko turant login karwa do (Taaki wo wait na kare)
            res.json({ success: true, user: { name: user.name, email: user.email } });

            // ==========================================
            // 🟢 BACKGROUND SECURITY EMAIL PROCESS 
            // ==========================================
            try {
                // 1. Time (IST)
                const loginTime = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' });

                // 2. IP Address nikalna (Render/Live server ke liye)
                let ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'Unknown IP';
                if (ipAddress.includes(',')) ipAddress = ipAddress.split(',')[0]; // Agar multiple IP aayen

                // 3. Device & Browser (User-Agent se)
                const userAgent = req.headers['user-agent'] || 'Unknown Device';
                let deviceSpecs = "Desktop/Laptop";
                if (userAgent.includes('Windows')) deviceSpecs = "Windows PC";
                else if (userAgent.includes('Mac OS')) deviceSpecs = "Apple Mac";
                else if (userAgent.includes('Android')) deviceSpecs = "Android Mobile";
                else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) deviceSpecs = "Apple iOS Device";

                let browserSpecs = "Web Browser";
                if (userAgent.includes('Chrome')) browserSpecs = "Google Chrome";
                else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) browserSpecs = "Apple Safari";
                else if (userAgent.includes('Firefox')) browserSpecs = "Mozilla Firefox";

                const deviceInfo = `${deviceSpecs} (${browserSpecs})`;

                // 4. Location nikalna (Free IP API se)
                let location = "Unknown Location";
                if (ipAddress !== '::1' && ipAddress !== '127.0.0.1') {
                    // Agar live server par hai toh location layega
                    const geoRes = await fetch(`http://ip-api.com/json/${ipAddress}`);
                    const geoData = await geoRes.json();
                    if (geoData.status === 'success') {
                        location = `${geoData.city}, ${geoData.country}`;
                    }
                } else {
                    location = "Localhost (Testing)";
                }

                // 5. Email Design (Google Style)
                let mailOptions = {
                    from: process.env.EMAIL_USER,
                    to: user.email,
                    subject: "🚨 Security Alert: New Login from " + deviceSpecs,
                    html: `
                        <div style="font-family: 'Poppins', sans-serif; background-color: #f8fafc; padding: 40px 20px;">
                            <div style="max-width: 500px; margin: 0 auto; background-color: #ffffff; padding: 40px 30px; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.05); border-top: 5px solid #3b82f6;">
                                <h2 style="color: #1e293b; margin-top: 0; font-size: 24px;">VibeSphere<span style="color: #6c63ff;">.</span></h2>
                                <h3 style="color: #475569; font-size: 16px; margin-bottom: 20px; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px;">New Login Detected</h3>
                                
                                <p style="color: #334155; font-size: 15px;">Hi <strong>${user.name}</strong>,</p>
                                <p style="color: #475569; font-size: 15px; line-height: 1.6;">We noticed a new login to your VibeSphere Media account. Here are the details:</p>
                                
                                <div style="margin: 25px 0; padding: 20px; background: #f0f9ff; border-left: 4px solid #0284c7; border-radius: 4px;">
                                    <p style="margin: 0 0 8px 0; font-size: 14px; color: #0369a1;"><strong>⌚ Time:</strong> ${loginTime} (IST)</p>
                                    <p style="margin: 0 0 8px 0; font-size: 14px; color: #0369a1;"><strong>📱 Device:</strong> ${deviceInfo}</p>
                                    <p style="margin: 0 0 8px 0; font-size: 14px; color: #0369a1;"><strong>📍 Location:</strong> ${location}</p>
                                    <p style="margin: 0; font-size: 14px; color: #0369a1;"><strong>🌐 IP Address:</strong> ${ipAddress}</p>
                                </div>
                                
                                <p style="color: #475569; font-size: 14px;">If this was you, no further action is required.</p>
                                <p style="color: #ef4444; font-size: 13px; font-weight: 600; margin-top: 20px;">⚠️ If you don't recognize this activity, please reset your password immediately to secure your account.</p>
                                
                                <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 25px 0;">
                                <p style="color: #94a3b8; font-size: 12px; margin: 0; text-align: center;">&copy; ${new Date().getFullYear()} VibeSphere Media. Keeping your data safe.</p>
                            </div>
                        </div>
                    `
                };

                transporter.sendMail(mailOptions);
            } catch (bgError) {
                console.error('Background Email Error:', bgError);
            }

        } else {
            res.json({ success: false, message: "Invalid Email or Password" });
        }
    } catch (e) { res.status(500).json({ success: false, error: "Login Error" }); }
});

// ==========================================
// ✨ MAGIC LINK LOGIN SYSTEM
// ==========================================

// 1. Send Magic Link to Email
app.post('/api/auth/send-magic-link', async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });

        if (!user) return res.json({ success: false, message: "Account not found! Please signup first." });
        if (user.isBanned) return res.json({ success: false, message: "🚫 Account restricted by Admin." });

        // 1. Ek dum secure random token banao
        const rawToken = crypto.randomBytes(32).toString('hex');

        // 2. Database mein encrypt karke save karo (Bank-Level Security)
        user.magicToken = await bcrypt.hash(rawToken, 10);
        user.magicTokenExpiry = Date.now() + 15 * 60 * 1000; // 15 minute ke liye valid
        await user.save();

        // 3. Magic Link URL (Yeh frontend ka page hoga jo hum banayenge)
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const magicLink = `${baseUrl}/magic-login.html?email=${email}&token=${rawToken}`;

        // 4. Premium Slack-style Email Design
        let mailOptions = {
            from: process.env.EMAIL_USER,
            to: user.email,
            subject: "✨ Your VibeSphere Magic Login Link",
            html: `
                <div style="font-family: 'Poppins', sans-serif; background-color: #f8fafc; padding: 40px 20px;">
                    <div style="max-width: 500px; margin: 0 auto; background-color: #ffffff; padding: 40px 30px; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.05); text-align: center; border-top: 5px solid #6c63ff;">
                        <h2 style="color: #1e293b; margin-top: 0; font-size: 24px;">VibeSphere<span style="color: #6c63ff;">.</span></h2>
                        <h3 style="color: #475569; font-size: 18px; margin-bottom: 20px;">Secure One-Click Login</h3>
                        <p style="color: #334155; font-size: 15px;">Hi <strong>${user.name}</strong>,</p>
                        <p style="color: #475569; font-size: 15px; margin-bottom: 30px;">Click the button below to instantly sign in to your client dashboard. No password required.</p>
                        
                        <a href="${magicLink}" style="display: inline-block; background-color: #6c63ff; color: #ffffff; text-decoration: none; padding: 14px 35px; border-radius: 8px; font-weight: 600; font-size: 16px; letter-spacing: 0.5px; transition: 0.3s;">🚀 Sign In Automatically</a>
                        
                        <p style="color: #ef4444; font-size: 13px; font-weight: 600; margin-top: 30px;">⏳ This magic link will expire in 15 minutes.</p>
                        <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 25px 0;">
                        <p style="color: #94a3b8; font-size: 12px; margin: 0;">&copy; ${new Date().getFullYear()} VibeSphere Media. Secure Login Auth.</p>
                    </div>
                </div>
            `
        };

        transporter.sendMail(mailOptions);
        res.json({ success: true, message: "✨ Magic Link sent! Check your inbox." });
    } catch (e) { res.status(500).json({ success: false, error: "Failed to send link" }); }
});
// 2. Verify Magic Link & Login
app.post('/api/auth/verify-magic-link', async (req, res) => {
    try {
        const { email, token } = req.body;
        const user = await User.findOne({ email });

        // Check karo token hai ya expire ho gaya
        if (!user || !user.magicToken || user.magicTokenExpiry < Date.now()) {
            return res.json({ success: false, message: "Link expired or invalid. Please request a new one." });
        }

        // Token match karo
        if (await bcrypt.compare(token, user.magicToken)) {
            // Success! Kachra saaf karo taaki token dobara use na ho
            user.magicToken = undefined;
            user.magicTokenExpiry = undefined;
            await user.save();
            // ==========================================
            // 🕵️‍♂️ SECURITY AUDIT (MAGIC LINK LOGIN)
            // ==========================================
            const parser = new UAParser(req.headers['user-agent']);
            const agentData = parser.getResult();

            const deviceName = agentData.device.vendor
                ? `${agentData.device.vendor} ${agentData.device.model}`
                : agentData.os.name || 'Unknown Device';

            const browserName = agentData.browser.name || 'Unknown Browser';
            const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'Unknown IP';

            user.activeSessions.push({
                token: "CLIENT_LOGGED_IN",
                device: deviceName,
                browser: browserName,
                ip: ipAddress,
                lastActive: Date.now()
            });
            await user.save();
            console.log(`🛡️ Magic Login Alert: ${user.email} logged in from ${deviceName} using ${browserName}`);
            // ==========================================
            // Seedha login de do
            res.json({ success: true, user: { name: user.name, email: user.email }, token: "CLIENT_LOGGED_IN" });
        } else {
            res.json({ success: false, message: "Invalid Magic Link." });
        }
    } catch (e) { res.status(500).json({ success: false, error: "Verification Failed" }); }
});
// 2a. Client Forgot Password (Send OTP) - 24H ACCOUNT LIMIT SECURED
app.post('/api/auth/forgot-password', otpLimiter, async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            return res.json({ success: false, message: "No account found with that email." });
        }

        // 🟢 THE 24-HOUR LOGIC MAGIC
        const now = Date.now();
        const windowTime = 24 * 60 * 60 * 1000; // 24 Ghante milliseconds mein

        // Agar timer shuru nahi hua, ya 24 ghante poore ho gaye, toh khata zero kar do
        if (!user.otpWindowStart || (now - user.otpWindowStart.getTime() > windowTime)) {
            user.otpWindowStart = now;
            user.otpRequestCount = 0;
        }

        // Agar 24 ghante ke andar 3 baar OTP maang liya hai, toh sidha block
        if (user.otpRequestCount >= 3) {
            return res.json({ success: false, message: "🚨 Limit Reached! You can only request 3 OTPs per 24 hours for security." });
        }

        // Limit cross nahi hui, toh counter badhao
        user.otpRequestCount += 1;
        // 🟢 ---------------------------

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        user.resetOtp = await bcrypt.hash(otp, 10);
        user.resetOtpExpiry = new Date(now + 15 * 60 * 1000); // 15 mins
        await user.save();

        let mailOptions = {
            from: process.env.EMAIL_USER,
            to: user.email,
            subject: "🔒 Secure Password Reset - VibeSphere Media",
            html: `
                <div style="font-family: 'Poppins', Helvetica, Arial, sans-serif; background-color: #f8fafc; padding: 40px 20px;">
                    <div style="max-width: 500px; margin: 0 auto; background-color: #ffffff; padding: 40px 30px; border-radius: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.08); text-align: center; border-top: 5px solid #6c63ff;">
                        <h2 style="color: #1e293b; margin-top: 0; font-size: 26px; font-weight: 700;">VibeSphere<span style="color: #6c63ff;">.</span></h2>
                        <h3 style="color: #475569; font-size: 16px; font-weight: 500; margin-bottom: 25px; border-bottom: 1px solid #e2e8f0; padding-bottom: 15px;">Account Recovery</h3>
                        <p style="color: #334155; font-size: 16px; line-height: 1.6; text-align: left;">Hi <strong>${user.name}</strong>,</p>
                        <p style="color: #475569; font-size: 15px; line-height: 1.6; text-align: left;">We received a request to reset the password for your VibeSphere Media client account. Use the OTP below to securely change your password:</p>
                        <div style="margin: 30px 0; padding: 25px; background: linear-gradient(135deg, #f3e8ff, #e0e7ff); border-radius: 12px;">
                            <p style="margin: 0 0 8px 0; font-size: 13px; color: #4f46e5; text-transform: uppercase; font-weight: 700; letter-spacing: 1px;">Verification Code</p>
                            <h1 style="margin: 0; color: #1e293b; font-size: 28px; letter-spacing: 8px; font-weight: 700;">${otp}</h1>
                        </div>
                        <p style="color: #ef4444; font-size: 14px; font-weight: 600; display: inline-block; padding: 8px 15px; background: #fee2e2; border-radius: 50px;">⏳ Valid for 15 minutes</p>
                        <p style="color: #64748b; font-size: 13px; line-height: 1.6; text-align: left; margin-top: 30px;">If you didn't request this, you can safely ignore this email.</p>
                    </div>
                </div>
            `
        };

        transporter.sendMail(mailOptions).catch(err => console.error('Background Email Error:', err));
        res.json({ success: true, message: "OTP sent to your email!" });

    } catch (e) { res.status(500).json({ success: false, message: "Error processing forgot password request." }); }
});
// 2b. Client Reset Password (Verify OTP & Change)
app.post('/api/auth/reset-password', async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;
        const user = await User.findOne({ email });

        if (!user || !user.resetOtp || !user.resetOtpExpiry || user.resetOtpExpiry < Date.now()) {
            return res.json({ success: false, message: "Invalid or expired OTP." });
        }

        if (await bcrypt.compare(otp, user.resetOtp)) {
            user.password = await bcrypt.hash(newPassword, 10);
            user.resetOtp = undefined;
            user.resetOtpExpiry = undefined;
            await user.save();
            res.json({ success: true, message: "Password reset successful!" });
        } else {
            res.json({ success: false, message: "Incorrect OTP." });
        }
    } catch (e) { res.status(500).json({ success: false, message: "Error resetting password." }); }
});

// 2c. Client Change Password (Dashboard)
app.post('/api/auth/change-password', async (req, res) => {
    try {
        const { email, currentPassword, newPassword } = req.body;
        const user = await User.findOne({ email });

        if (user && await bcrypt.compare(currentPassword, user.password)) {
            user.password = await bcrypt.hash(newPassword, 10);
            await user.save();
            res.json({ success: true, message: "Password changed successfully!" });
        } else {
            res.json({ success: false, message: "Incorrect current password." });
        }
    } catch (e) { res.status(500).json({ success: false, message: "Error changing password." }); }
});

// 3. Get Client Orders (Dashboard)
app.post('/api/client/my-orders', async (req, res) => {
    try {
        const { email } = req.body; // Client ka email aayega
        // Us email se jude saare orders dhoondo
        const myOrders = await Order.find({ email: email }).sort({ _id: -1 });
        res.json({ success: true, orders: myOrders });
    } catch (e) { res.status(500).json({ success: false, error: "Fetch Error" }); }
});
// ==========================================
// 🛡️ CLIENT SECURITY & DEVICE MANAGEMENT APIs
// ==========================================

// 1. Get Login History
app.post('/api/client/security-data', async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });

        if (user) {
            // Latest login sabse upar dikhane ke liye reverse kar diya
            res.json({ success: true, sessions: user.activeSessions.reverse() });
        } else {
            res.json({ success: false, message: "User not found" });
        }
    } catch (e) { res.status(500).json({ success: false, error: "Server Error" }); }
});

// 2. Log Out of All Other Devices
app.post('/api/client/logout-other-devices', async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });

        if (user && user.activeSessions.length > 0) {
            // Sirf current (sabse recent) login ko bacha lo, baaki sab uda do
            const currentSession = user.activeSessions[0];
            user.activeSessions = [currentSession];
            await user.save();

            res.json({ success: true, message: "Successfully logged out of all other devices! 🛡️" });
        } else {
            res.json({ success: false });
        }
    } catch (e) { res.status(500).json({ success: false, error: "Server Error" }); }
});
// ==========================================
// 🤖 AUTO-ONBOARDING APIs
// ==========================================

// 1. Client Submit karega apna Onboarding Form
app.post('/api/client/submit-onboarding', async (req, res) => {
    try {
        const { email, brandName, brandColors, referenceLinks } = req.body;

        await User.findOneAndUpdate(
            { email: email },
            {
                brandName: brandName,
                brandColors: brandColors,
                referenceLinks: referenceLinks,
                isOnboarded: true // 🟢 Mark as completed!
            }
        );

        res.json({ success: true, message: "Brand details saved successfully! 🚀" });
    } catch (e) {
        res.status(500).json({ success: false, error: "Server Error" });
    }
});

// 2. Dashboard load hone par check karega ki client naya hai ya purana
app.post('/api/client/check-onboarding', async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });

        if (user) {
            res.json({ success: true, isOnboarded: user.isOnboarded });
        } else {
            res.json({ success: false });
        }
    } catch (e) {
        res.status(500).json({ success: false });
    }
});
// --- Order Schema ---
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
    status: { type: String, default: 'Pending' },

    // 🟢 NAYA: Commission Engine Fields
    assignedStaff: { type: String, default: '' }, // Staff ka email jisne pitch kiya tha
    commissionValue: { type: Number, default: 0 }, // 20% cut kitna bana
    payoutStatus: { type: String, default: 'Unpaid' } // Unpaid ya Paid
});
const Order = mongoose.model('Order', orderSchema);
// --- Blog Schema (UPDATED WITH SEO) ---
const blogSchema = new mongoose.Schema({
    slug: String,
    image: String,
    date: { type: Date, default: Date.now },

    // 🟢 Naye SEO & Filter Fields
    category: { type: String, default: 'General' },
    status: { type: String, default: 'Published' },
    tags: String,
    metaTitle: String,   // <-- SEO Title
    metaDesc: String,    // <-- SEO Description

    // 🇬🇧 English Data
    title: String,
    content: String,

    // 😎 Hinglish Data
    titleHinglish: String,
    contentHinglish: String,

    // 🇮🇳 Hindi Data
    titleHindi: String,
    contentHindi: String
});
const Blog = mongoose.model('Blog', blogSchema);
// --- Handover Certificate Schema ---
const handoverSchema = new mongoose.Schema({
    certId: { type: String, unique: true }, // VIBE-CERT-123456
    orderNumber: String,
    clientName: String,
    projectName: String,
    deliveryDate: Date,     // 🟢 Naya Add kiya
    supportDate: Date,      // 🟢 Naya Add kiya
    liveLink: String,       // 🟢 Naya Add kiya
    remarks: String,        // 🟢 Naya Add kiya
    dateGenerated: { type: Date, default: Date.now }
});
const Handover = mongoose.model('Handover', handoverSchema);

// ==========================================
// 🏖️ LEAVE SCHEMA (Add near other schemas)
// ==========================================
const leaveSchema = new mongoose.Schema({
    staffEmail: String,
    staffName: String,
    dateFrom: String,
    dateTo: String,
    reason: String,
    status: { type: String, default: 'Pending' }, // Pending, Approved, Rejected
    appliedOn: { type: Date, default: Date.now }
});
const Leave = mongoose.model('Leave', leaveSchema);

// ==========================================
// 🎧 HELPDESK TICKETING SCHEMA
// ==========================================
const ticketSchema = new mongoose.Schema({
    clientEmail: String,
    clientName: String,
    subject: String,
    issue: String,
    status: { type: String, default: 'Open' }, // Open, In Progress, Resolved
    replies: [{
        sender: String,
        message: String,
        date: { type: Date, default: Date.now }
    }],
    date: { type: Date, default: Date.now }
});
const Ticket = mongoose.model('Ticket', ticketSchema);

// ==========================================
// 💰 EXPENSE TRACKER SCHEMA (Admin Only)
// ==========================================
const expenseSchema = new mongoose.Schema({
    title: String,
    amount: Number,
    category: { type: String, default: 'General' }, // Ads, Server, Salaries, Tools, General
    date: { type: Date, default: Date.now }
});
const Expense = mongoose.model('Expense', expenseSchema);

// ==========================================
// 📚 RESOURCE HUB SCHEMA (Knowledge Base)
// ==========================================
const resourceSchema = new mongoose.Schema({
    title: String,
    type: { type: String, default: 'link' }, // link, text, pdf
    content: String, // URL for link/pdf, text content for text
    date: { type: Date, default: Date.now }
});
const Resource = mongoose.model('Resource', resourceSchema);

// ==========================================
// ==========================================
// 🎬 VIDEO MEETING SCHEMA (JaaS by 8x8)
// ==========================================
const meetingSchema = new mongoose.Schema({
    topic: String,
    roomName: String,      // JaaS format: vpaas-magic-cookie-APP_ID/RoomName
    scheduledTime: Date,
    status: { type: String, default: 'Scheduled' }, // Scheduled, Live, Ended
    createdBy: { type: String, default: 'Admin' },
    password: { type: String, default: '' }, // 🔒 NAYA: Optional Password
    date: { type: Date, default: Date.now }
});
const Meeting = mongoose.model('Meeting', meetingSchema);

// ==========================================
// 🚀 NEW APIs FOR SELF-LEAD & LEAVES
// ==========================================

// 🧠 AI LEAD SCORING FUNCTION (Gemini 1.5 Flash)
async function scoreLeadWithAI(taskId, taskData) {
    try {
        const API_KEY = process.env.GEMINI_API_KEY;
        if (!API_KEY) return;

        const prompt = `You are a lead scoring AI for a digital marketing agency. Analyze this lead and respond with ONLY one of these exact tags: 🔥 Hot, 🟡 Warm, ❄️ Cold

Lead Details:
- Client Name: ${taskData.clientName || 'Unknown'}
- Service Pitched: ${taskData.servicePitch || 'Not specified'}
- Client Type: ${taskData.clientType || 'Not specified'}
- Notes: ${taskData.notes || 'None'}
- Contact Number: ${taskData.contactNumber ? 'Provided' : 'Not provided'}

Rules:
- 🔥 Hot = Client shows strong intent, has budget, needs service urgently
- 🟡 Warm = Some interest, might convert with follow-up
- ❄️ Cold = Low interest, vague requirement, unlikely to convert soon

Respond with ONLY the tag (e.g. "🔥 Hot"). Nothing else.`;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemma-3-27b-it:generateContent?key=${API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ role: 'user', parts: [{ text: prompt }] }]
            }),
            signal: controller.signal
        });

        clearTimeout(timeoutId);
        const data = await response.json();
        let score = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';

        // Sanitize: only keep valid scores
        if (score.includes('Hot')) score = '🔥 Hot';
        else if (score.includes('Warm')) score = '🟡 Warm';
        else if (score.includes('Cold')) score = '❄️ Cold';
        else score = '🟡 Warm'; // Default to Warm if AI response is unclear

        await Task.findByIdAndUpdate(taskId, { aiScore: score });
        console.log(`🧠 AI scored lead "${taskData.clientName}" as: ${score}`);
    } catch (err) {
        console.log('⚠️ AI scoring failed (non-critical):', err.message);
    }
}

// 1. Staff khud ki Lead add karega
app.post('/api/staff/add-lead', async (req, res) => {
    try {
        const { clientName, contactNumber, servicePitch, email } = req.body;
        const newTask = new Task({
            clientName,
            contactNumber,
            servicePitch,
            assignedTo: email, // Staff ne khud ko assign kiya
            status: 'pending',
            notes: 'Self-Generated Lead' // 👈 Admin ko pata chal jayega ki ye khud laya hai
        });
        await newTask.save();

        // 🧠 AI Lead Scoring (Background - Non-blocking)
        scoreLeadWithAI(newTask._id, newTask);

        res.json({ success: true, message: "Lead added successfully! 🚀" });
    } catch (e) { res.status(500).json({ success: false, error: "Failed to add lead" }); }
});

// 2. Staff Leave Apply karega
app.post('/api/staff/apply-leave', async (req, res) => {
    try {
        const { email, name, dateFrom, dateTo, reason } = req.body;
        const newLeave = new Leave({ staffEmail: email, staffName: name, dateFrom, dateTo, reason });
        await newLeave.save();

        // 🟢 REAL-TIME: Notify Admin
        io.to('Admin').emit('new_leave_request');

        res.json({ success: true, message: "Leave application submitted! 🏖️" });
    } catch (e) { res.status(500).json({ success: false }); }
});

// 3. Staff apni Leaves dekhega
app.post('/api/staff/my-leaves', async (req, res) => {
    try {
        const leaves = await Leave.find({ staffEmail: req.body.email }).sort({ appliedOn: -1 });
        res.json({ success: true, leaves });
    } catch (e) { res.status(500).json({ success: false }); }
});

// 4. Admin saari Leaves dekhega
app.get('/api/admin/leaves', checkAuth, async (req, res) => {
    try {
        const leaves = await Leave.find().sort({ appliedOn: -1 });
        res.json({ success: true, leaves });
    } catch (e) { res.status(500).json({ success: false }); }
});

// 5. Admin Leave Approve/Reject karega
app.post('/api/admin/update-leave', checkAuth, async (req, res) => {
    try {
        const { leaveId, status } = req.body;
        const leave = await Leave.findByIdAndUpdate(leaveId, { status }, { new: true });

        // 🟢 REAL-TIME: Notify Staff
        io.to(leave.staffEmail).emit('leave_status_updated', { status });

        res.json({ success: true, message: `Leave ${status}! ✅` });
    } catch (e) { res.status(500).json({ success: false }); }
});
// ==========================================
// 🏢 STAFF CRM & TASK MANAGEMENT SCHEMAS
// ==========================================


// 1. Staff Schema (Staff Login Ke Liye)
const staffSchema = new mongoose.Schema({
    empId: { type: String, unique: true },
    name: String,
    email: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    role: { type: String, default: 'Sales Executive' },
    profilePhoto: { type: String, default: '' },
    resetOtp: String,
    resetOtpExpiry: Date,
    otpRequestCount: { type: Number, default: 0 },
    otpWindowStart: Date,

    totalEarnings: { type: Number, default: 0 },
    pendingPayout: { type: Number, default: 0 },
    monthlyTarget: { type: Number, default: 50000 }, // 🟢 NAYA: Default 50k target set kiya hai
    // 🟢 NAYA: Duty Status Tracker
    isOnline: { type: Boolean, default: false },
    isMuted: { type: Boolean, default: false },
    lastActive: { type: Date, default: Date.now },

    date: { type: Date, default: Date.now }
});
const Staff = mongoose.model('Staff', staffSchema);
// 2. Task/Lead Schema (Calling Data Ke Liye)
const taskSchema = new mongoose.Schema({
    clientName: String,
    clientType: String,      // e.g. "Instagram Page", "Local Shop"
    contactNumber: String,
    servicePitch: String,    // e.g. "Growth Package"
    status: { type: String, default: 'pending' }, // pending, interested, not-answering, call-back, rejected
    notes: { type: String, default: '' },         // Staff ka feedback
    assignedTo: String,      // Kis staff ko diya (Staff ka Email)
    dateAssigned: { type: Date, default: Date.now },
    aiScore: { type: String, default: '' } // 🧠 AI Lead Score: 🔥 Hot, 🟡 Warm, ❄️ Cold
});
const Task = mongoose.model('Task', taskSchema);

// ==========================================
// 💬 TEAM CHAT SCHEMAS
// ==========================================
const chatSchema = new mongoose.Schema({
    senderName: String,
    senderEmail: String,
    role: String, // 'Admin' ya 'Staff'
    message: String,
    profilePhoto: String,
    fileUrl: String,      // ☁️ Cloud URL (ImgBB for images, Cloudinary for PDFs)
    fileType: String,     // 'image' or 'pdf'
    fileName: String,     // Original filename (for PDF downloads)
    date: { type: Date, default: Date.now }
});
const Chat = mongoose.model('Chat', chatSchema);

// Global Settings (Chat on/off karne ke liye)
const settingsSchema = new mongoose.Schema({
    isChatBlocked: { type: Boolean, default: false }
});
const AppSettings = mongoose.model('AppSettings', settingsSchema);
// 3. Notice Board Schema
const noticeSchema = new mongoose.Schema({
    title: String,
    message: String,
    author: { type: String, default: 'Admin' },
    date: { type: Date, default: Date.now }
});
const Notice = mongoose.model('Notice', noticeSchema);
// 1. Job Schema (Database format)
const jobSchema = new mongoose.Schema({
    title: String,
    type: String, // Full-time, Internship, Freelance
    location: String, // Remote, Mumbai, etc.
    description: String,
    date: { type: Date, default: Date.now }
});
const Job = mongoose.model('Job', jobSchema);

// ==========================================
// 🚀 STAFF PORTAL APIs
// ==========================================

// API 1: Staff Login
app.post('/api/staff/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const staff = await Staff.findOne({ email });
        if (staff && await bcrypt.compare(password, staff.password)) {
            // Create JWT Token
            const token = jwt.sign({
                email: staff.email,
                role: 'Staff',
                empId: staff.empId,
                name: staff.name
            }, process.env.JWT_SECRET || "SECRET_VIBESPHERE_KEY_123", { expiresIn: '12h' });

            res.cookie('token', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'Strict',
                maxAge: 12 * 60 * 60 * 1000 // 12 hours
            });

            // 🟢 Naya code: empId bhi frontend ko bhejo
            res.json({ success: true, staff: { empId: staff.empId, name: staff.name, email: staff.email, role: staff.role, profilePhoto: staff.profilePhoto, isOnline: staff.isOnline } });
        } else {
            res.json({ success: false, message: "Invalid Staff ID or Password" });
        }
    } catch (e) { res.status(500).json({ success: false, error: "Login Error" }); }
});

// GET Current Staff Context via Cookie
app.get('/api/staff/me', (req, res) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ success: false, message: "No active session." });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || "SECRET_VIBESPHERE_KEY_123");
        if (decoded.role === 'Staff') {
            // Re-fetch robust UI context from DB if needed, or simply return decoded values
            Staff.findOne({ email: decoded.email }).then(staff => {
                if (!staff) return res.status(401).json({ success: false });
                res.json({ success: true, staff: { empId: staff.empId, name: staff.name, email: staff.email, role: staff.role, profilePhoto: staff.profilePhoto, isOnline: staff.isOnline } });
            });
        } else {
            res.status(401).json({ success: false, message: "Role mismatch." });
        }
    } catch (err) {
        res.status(401).json({ success: false, message: "Token invalid or expired." });
    }
});
// 🟢 STAFF DUTY STATUS API (Online/Offline)
app.post('/api/staff/toggle-status', async (req, res) => {
    try {
        const { email, isOnline } = req.body;

        // Staff ka status update karo aur time note kar lo
        const staff = await Staff.findOneAndUpdate(
            { email: email },
            { isOnline: isOnline, lastActive: Date.now() },
            { new: true } // Return updated document
        );

        if (staff) {
            res.json({ success: true, isOnline: staff.isOnline });
        } else {
            res.json({ success: false, message: "Staff not found" });
        }
    } catch (e) {
        res.status(500).json({ success: false, error: "Server Error" });
    }
});
// API 2: Get Staff Tasks (Dashbaord Load Hote Hi Chalegi)
app.post('/api/staff/tasks', async (req, res) => {
    try {
        const { email } = req.body; // Kis staff ne login kiya hai
        const tasks = await Task.find({ assignedTo: email }).sort({ dateAssigned: -1 });
        res.json({ success: true, tasks: tasks });
    } catch (e) { res.status(500).json({ success: false, error: "Fetch Error" }); }
});
// API 2B: Get Staff Live Earnings (Commission Engine Tracker)
// API 2B: Get Staff Live Earnings (Commission Engine Tracker)
app.post('/api/staff/stats', async (req, res) => {
    try {
        const { email } = req.body;
        const staff = await Staff.findOne({ email });

        if (!staff) return res.json({ success: false, message: "Staff not found" });

        res.json({
            success: true,
            totalEarnings: staff.totalEarnings || 0,
            pendingPayout: staff.pendingPayout || 0,
            monthlyTarget: staff.monthlyTarget || 50000 // 🟢 Target yahan se frontend jayega
        });
    } catch (e) {
        res.status(500).json({ success: false, error: "Fetch Error" });
    }
});
// ==========================================
// 💸 PAYOUT SYSTEM APIs
// ==========================================

// 1. Staff Request Karega (Staff Dashboard se)
app.post('/api/staff/request-payout', async (req, res) => {
    try {
        const { email } = req.body;
        const staff = await Staff.findOne({ email });

        if (!staff || staff.pendingPayout <= 0) {
            return res.json({ success: false, message: "You have no pending balance to request." });
        }

        // Check karo ki pehle se koi request pending toh nahi hai (Spam rokne ke liye)
        const existingReq = await Payout.findOne({ staffEmail: email, status: 'Pending' });
        if (existingReq) {
            return res.json({ success: false, message: "Aapki ek payout request pehle se pending hai Admin ke paas!" });
        }

        const newPayout = new Payout({
            staffEmail: staff.email,
            staffName: staff.name,
            amount: staff.pendingPayout // Jitna pending hai sabka request laga diya
        });
        await newPayout.save();

        res.json({ success: true, message: "Payout Request Sent to Admin! 💸" });
    } catch (e) {
        res.status(500).json({ success: false, error: "Server Error" });
    }
});

// 2. Admin Saari Requests Dekhega (Admin Panel se)
app.get('/api/admin/payout-requests', checkAuth, async (req, res) => {
    try {
        const requests = await Payout.find().sort({ date: -1 });
        res.json({ success: true, requests });
    } catch (e) {
        res.status(500).json({ success: false, error: "Fetch Error" });
    }
});

// 3. Admin Approve Karega (Admin Panel se)
app.post('/api/admin/approve-payout', checkAuth, async (req, res) => {
    try {
        const { id } = req.body;
        const payout = await Payout.findById(id);

        if (!payout || payout.status !== 'Pending') {
            return res.json({ success: false, message: "Invalid Request or Already Paid" });
        }

        // 🟢 MAGIC: Staff ke pending payout se amount kaat lo (Total Earnings wahi rahegi)
        await Staff.findOneAndUpdate(
            { email: payout.staffEmail },
            { $inc: { pendingPayout: -payout.amount } }
        );

        // Request ko Paid mark kar do
        payout.status = 'Paid';
        await payout.save();

        // 🟢 REAL-TIME: Notify Staff
        io.to(payout.staffEmail).emit('payout_approved');

        res.json({ success: true, message: "Payout Approved & Balance Updated! ✅" });
    } catch (e) {
        console.error("Payout Error:", e);
        res.status(500).json({ success: false, error: "Server Error" });
    }
});
// ==========================================
// 🏆 STAFF LEADERBOARD API
// ==========================================
app.get('/api/staff/leaderboard', async (req, res) => {
    try {
        // Sirf top 5 staff members ko lao jinki totalEarnings sabse zyada hai
        const leaderboard = await Staff.find({}, 'name profilePhoto totalEarnings')
            .sort({ totalEarnings: -1 })
            .limit(5);

        res.json({ success: true, leaderboard });
    } catch (err) {
        console.error("Leaderboard Error:", err);
        res.status(500).json({ success: false, error: "Failed to fetch leaderboard" });
    }
});
// API 3: Update Task (Jab Staff 'Save' button dabayega)
app.post('/api/staff/update-task', async (req, res) => {
    try {
        const { taskId, status, notes } = req.body;
        const updatedTask = await Task.findByIdAndUpdate(taskId, { status: status, notes: notes }, { new: true });

        // 🟢 REAL-TIME: Notify Admin for live performance updates
        io.emit('lead_status_updated', updatedTask);

        res.json({ success: true, message: "Lead Updated Successfully!" });
    } catch (e) { res.status(500).json({ success: false, error: "Update Error" }); }
});

// API 4: Get Notices
app.get('/api/staff/notices', async (req, res) => {
    try {
        const notices = await Notice.find().sort({ date: -1 }).limit(10);
        res.json({ success: true, notices: notices });
    } catch (e) { res.status(500).json({ success: false }); }
});
// ==========================================
// 💬 TEAM CHAT APIs & SOCKET LOGIC
// ==========================================

// 1. Get Global Settings (Chat chalu hai ya band?)
app.get('/api/chat/settings', async (req, res) => {
    try {
        let settings = await AppSettings.findOne();
        if (!settings) {
            settings = new AppSettings({ isChatBlocked: false });
            await settings.save();
        }
        res.json({ success: true, isChatBlocked: settings.isChatBlocked });
    } catch (e) { res.status(500).json({ success: false }); }
});

// 2. Fetch Chat History (Pichle 100 messages)
app.get('/api/chat/history', async (req, res) => {
    try {
        const messages = await Chat.find().sort({ date: 1 }).limit(100);
        res.json({ success: true, messages });
    } catch (e) { res.status(500).json({ success: false }); }
});

// ==========================================
// ☁️ CHAT FILE UPLOAD API (ImgBB + Cloudinary)
// ==========================================
app.post('/api/chat/upload', upload.single('file'), async (req, res) => {
    try {
        const file = req.file;
        if (!file) return res.status(400).json({ success: false, message: 'No file uploaded!' });

        const mimeType = file.mimetype;
        let fileUrl = '';
        let fileType = '';
        let fileName = file.originalname;

        if (mimeType.startsWith('image/')) {
            // 📸 Image → ImgBB
            fileType = 'image';
            const base64Image = file.buffer.toString('base64');
            fileUrl = await uploadToImgBB(base64Image);
            console.log('✅ Image uploaded to ImgBB:', fileUrl);
        } else if (mimeType === 'application/pdf') {
            // 📄 PDF → Cloudinary
            fileType = 'pdf';
            fileUrl = await uploadToCloudinary(file.buffer, fileName);
            console.log('✅ PDF uploaded to Cloudinary:', fileUrl);
        } else if (mimeType.startsWith('audio/')) {
            // 🎤 Audio (Voice Notes) → Cloudinary
            fileType = 'audio';
            fileUrl = await uploadToCloudinary(file.buffer, fileName);
            console.log('✅ Audio uploaded to Cloudinary:', fileUrl);
        } else {
            return res.status(400).json({ success: false, message: 'Only images, PDFs and audio files are allowed!' });
        }

        res.json({ success: true, fileUrl, fileType, fileName });
    } catch (e) {
        console.error('☁️ Upload Error:', e.message);
        res.status(500).json({ success: false, message: 'File upload failed: ' + e.message });
    }
});

// 3. Admin: Toggle Global Chat Block
app.post('/api/admin/toggle-chat', checkAuth, async (req, res) => {
    try {
        let settings = await AppSettings.findOne();
        settings.isChatBlocked = !settings.isChatBlocked;
        await settings.save();

        // Sabko live batao ki chat band/chalu ho gayi
        io.emit('chat_status_changed', { isChatBlocked: settings.isChatBlocked });
        res.json({ success: true, isChatBlocked: settings.isChatBlocked, message: settings.isChatBlocked ? "Chat Blocked! 🚫" : "Chat Unblocked! ✅" });
    } catch (e) { res.status(500).json({ success: false }); }
});

// 4. Admin: Mute/Unmute Staff
app.post('/api/admin/mute-staff', checkAuth, async (req, res) => {
    try {
        const { email, isMuted } = req.body;
        await Staff.findOneAndUpdate({ email }, { isMuted });
        res.json({ success: true, message: isMuted ? "Staff Muted! 🤐" : "Staff Unmuted! 🗣️" });
    } catch (e) { res.status(500).json({ success: false }); }
});

// 5. Admin: Delete Message
app.delete('/api/admin/delete-message/:id', checkAuth, async (req, res) => {
    try {
        await Chat.findByIdAndDelete(req.params.id);
        io.emit('message_deleted', req.params.id); // Live sabke screen se message hatao
        res.json({ success: true, message: "Message Deleted 🗑️" });
    } catch (e) { res.status(500).json({ success: false }); }
});
// 🟢 NAYA: Update Custom Staff Target API
app.post('/api/admin/update-target', checkAuth, async (req, res) => {
    try {
        const { email, newTarget } = req.body;
        if (!newTarget || newTarget <= 0) return res.json({ success: false, message: "Invalid target amount!" });

        const staff = await Staff.findOne({ email });
        if (!staff) return res.json({ success: false, message: "Staff nahi mila!" });

        staff.monthlyTarget = newTarget;
        await staff.save();

        // 🟢 REAL-TIME: Notify Admin/Global
        io.emit('staff_performance_updated');

        res.json({ success: true, message: "🎯 Target Updated Successfully!" });
    } catch (e) {
        res.status(500).json({ success: false, error: "Server Error" });
    }
});


// API 5: Change Password
app.post('/api/staff/update-password', async (req, res) => {
    try {
        const { email, currentPassword, newPassword } = req.body;
        const staff = await Staff.findOne({ email: email });

        if (staff && await bcrypt.compare(currentPassword, staff.password)) {
            staff.password = await bcrypt.hash(newPassword, 10);
            await staff.save();
            res.json({ success: true, message: "Password updated successfully!" });
        } else {
            res.json({ success: false, message: "Incorrect current password!" });
        }
    } catch (e) { res.status(500).json({ success: false, error: "Server Error" }); }
});

// API 6: Update Profile Photo (Base64 Format me)
app.post('/api/staff/update-photo', async (req, res) => {
    try {
        const { email, photoBase64 } = req.body;
        await Staff.findOneAndUpdate({ email: email }, { profilePhoto: photoBase64 });
        res.json({ success: true, message: "Photo updated!" });
    } catch (e) { res.status(500).json({ success: false }); }
});
// 🟢 STAFF FORGOT PASSWORD (SEND OTP) - 24H ACCOUNT LIMIT SECURED
app.post('/api/staff/forgot-password', otpLimiter, async (req, res) => {
    try {
        const { email } = req.body;
        const staff = await Staff.findOne({ email });

        if (!staff) return res.json({ success: false, message: "No staff account found with this email." });

        // 🟢 THE 24-HOUR LOGIC MAGIC (For Staff)
        const now = Date.now();
        const windowTime = 24 * 60 * 60 * 1000;

        if (!staff.otpWindowStart || (now - staff.otpWindowStart.getTime() > windowTime)) {
            staff.otpWindowStart = now;
            staff.otpRequestCount = 0;
        }

        if (staff.otpRequestCount >= 3) {
            return res.json({ success: false, message: "🚨 Limit Reached! Staff accounts can only request 3 OTPs per 24 hours." });
        }

        staff.otpRequestCount += 1;
        // 🟢 ---------------------------

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        staff.resetOtp = await bcrypt.hash(otp, 10);
        staff.resetOtpExpiry = new Date(now + 15 * 60 * 1000);
        await staff.save();

        let mailOptions = {
            from: process.env.EMAIL_USER,
            to: staff.email,
            subject: "🔒 Staff Password Reset - VibeSphere Media",
            html: `
                <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f7fe; padding: 40px 20px;">
                    <div style="max-width: 500px; margin: 0 auto; background-color: #ffffff; padding: 40px 30px; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.05); text-align: center;">
                        <h2 style="color: #1e293b; margin-top: 0; font-size: 28px; letter-spacing: -0.5px;">VibeSphere<span style="color: #6c63ff;">.</span></h2>
                        <h3 style="color: #334155; font-size: 18px; font-weight: 600; margin-bottom: 25px; border-bottom: 2px solid #f1f5f9; padding-bottom: 15px;">Password Reset Request</h3>
                        <p style="color: #475569; font-size: 16px; line-height: 1.6; text-align: left;">Hello <strong>${staff.name}</strong>,</p>
                        <p style="color: #475569; font-size: 16px; line-height: 1.6; text-align: left;">We received a request to reset the password for your staff portal. Please use the secure verification code below to proceed:</p>
                        <div style="margin: 35px 0; padding: 25px; background-color: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 10px;">
                            <p style="margin: 0 0 10px 0; font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: 600;">Your 6-Digit OTP</p>
                            <h1 style="margin: 0; color: #6c63ff; font-size: 28px; letter-spacing: 8px;">${otp}</h1>
                        </div>
                        <p style="color: #dc2626; font-size: 14px; font-weight: 600;">⏳ This OTP is valid for exactly 15 minutes.</p>
                        <p style="color: #64748b; font-size: 14px; line-height: 1.5; text-align: left; margin-top: 35px;">If you did not request this password reset, please ignore this email.</p>
                    </div>
                </div>
            `
        };

        transporter.sendMail(mailOptions);
        res.json({ success: true, message: "OTP sent to your email! Please check inbox/spam." });
    } catch (e) { res.status(500).json({ success: false, error: "Server Error" }); }
});

// 🟢 STAFF RESET PASSWORD (VERIFY OTP & UPDATE)
app.post('/api/staff/reset-password', async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;
        const staff = await Staff.findOne({ email });

        if (!staff || !staff.resetOtp || staff.resetOtpExpiry < Date.now())
            return res.json({ success: false, message: "Invalid or Expired OTP." });

        if (await bcrypt.compare(otp, staff.resetOtp)) {
            staff.password = await bcrypt.hash(newPassword, 10); // Naya password encrypt karo
            staff.resetOtp = undefined; // Kachra saaf
            staff.resetOtpExpiry = undefined;
            await staff.save();
            res.json({ success: true, message: "Password updated successfully! You can login now." });
        } else {
            res.json({ success: false, message: "Incorrect OTP." });
        }
    } catch (e) { res.status(500).json({ success: false, error: "Reset Failed" }); }
});

// --- 3. Razorpay Setup ---
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

// ==========================================
// 🌟 REVIEW SYSTEM
// ==========================================

const reviewSchema = new mongoose.Schema({
    name: String,
    instaId: String,
    message: String,
    rating: { type: Number, default: 5 },
    avatar: { type: String, default: "" },
    date: { type: Date, default: Date.now }
});
const Review = mongoose.model('Review', reviewSchema);

// 1. Get Reviews
app.get('/api/reviews', async (req, res) => {
    try {
        const reviews = await Review.find().sort({ date: -1 }).limit(50);

        const allReviews = await Review.find();
        let totalStars = 0;
        allReviews.forEach(r => totalStars += r.rating);

        const avgRating = allReviews.length > 0 ? (totalStars / allReviews.length).toFixed(1) : "4.9";
        const totalCount = (1200 + allReviews.length) + "+";

        res.json({
            reviews: reviews,
            stats: {
                average: avgRating,
                count: totalCount
            }
        });
    } catch (err) {
        console.error("Fetch Error:", err);
        res.status(500).json({ error: "Failed to fetch reviews" });
    }
});

// 2. Add Review
app.post('/api/add-review', async (req, res) => {
    try {
        const { name, instaId, message, rating, avatar } = req.body;

        const newReview = new Review({
            name,
            instaId,
            message,
            rating: rating || 5,
            avatar: avatar || ""
        });

        await newReview.save();
        res.json({ success: true, message: "Review Added!" });
    } catch (err) {
        res.status(500).json({ success: false, error: "Failed to add review" });
    }
});

// ==========================================
// 🧠 AI CHAT ROUTE (Upgraded to Flash)
// ==========================================
app.post('/api/chat', async (req, res) => {
    const userHistory = req.body.history || [];
    const userMessage = req.body.message || (userHistory.length > 0 ? userHistory[userHistory.length - 1].parts[0].text : "");
    const API_KEY = process.env.GEMINI_API_KEY;

    if (!API_KEY) return res.json({ reply: "API Key Missing" });


    const systemPrompt = `
You are 'VibeSphere AI', the lead strategy consultant and high-closing sales expert for VibeSphere Media.

--- YOUR IDENTITY & COMPANY KNOWLEDGE ---
- Created by: VibeSphere Media Tech Team.
- Leadership: Mr. Mukesh Prajapat (Founder & Payments Head) & Mr. Harsh Panwar (CEO & Head of Tech).
- Establishment: 2022. Headquarters: Jaipur, Rajasthan, India.
- Track Record: 1200+ happy clients, 4.9/5 average rating, 24/7 WhatsApp Support.
- Mission: Helping businesses grow through digital excellence.
- Language Protocol: Auto-Adapt. Reply in the exact language the user speaks (English -> English, Hindi -> Hindi, Hinglish -> Hinglish).

--- 🚨 CRITICAL RULES (NON-NEGOTIABLE) ---
1. NO INFO DUMPS: Keep messages extremely short (1-3 sentences max).
2. STEP-BY-STEP: Ask only ONE question at a time to keep the user engaged.
3. IDENTIFY INTENT FIRST:
   - If "Reach badhani hai" -> Ask: "Kis type ka page hai? (Personal/Business?)"
   - If "Website banwani hai" -> Ask: "Kis cheez ka business hai aapka?"
   - If "Mera business nahi chal raha" -> First pitch Marketing, then upsell a Website.
4. ALWAYS BE CLOSING: Your ultimate goal is to close the deal and get them to buy a package.

--- 📈 INSTAGRAM GROWTH PACKAGES ---
- SILVER: ₹399 (1k Followers | Beginner)
- GOLD: ₹669 (2k Followers | Small Boost)
- PLATINUM (🔥 Hot Seller): ₹1199 (5k Followers | 3 Posts | Serious Growth)
- INFLUENCER: ₹1889 (7k Followers | Face of Week)
- BUSINESS: ₹2699 (13k Followers | Full Branding)
- SPECIAL: ₹4690/Month (26k Followers | Full Management)

--- 💻 WEB DEVELOPMENT PACKAGES ---
- PORTFOLIO / LANDING: ₹4,999 (1-5 Pages | Mobile Ready | Free Hosting for 1 Yr). Pitch: "Apna Digital Visiting Card banwayein."
- BUSINESS / CORPORATE (🔥 Best Value): ₹14,999 (8-12 Pages | SEO Setup | Admin Panel | Pro Email). Pitch: "Google par rank karein aur trust jeetein."
- E-COMMERCE STORE: ₹24,999 (Online Store | Payment Gateway | 50 Products). Pitch: "Dukaan band hone ke baad bhi maal bechein (24/7 Sales)."

--- 🧠 PSYCHOLOGICAL SALES TACTICS (USE THESE AGGRESSIVELY) ---
1. FOMO (Fear of Missing Out): Emphasize what they lose. Example: "Sir, bina website ke aap 50% customers loose kar rahe hain jo Google par search kar rahe hain."
2. Authority & Trust: "Humari agency Jaipur based hai, 1200+ clients hain. Local freelancer bhag jayega, hum yahi hain."
3. Urgency: "Sir, Web Dev team ke paas sirf 2 slots bache hain iss week ke liye. Aaj lock karenge toh free Domain mil jayega."
4. Investment Frame: If they say it's expensive, reply: "Sir, ye kharcha nahi, Investment hai. Ek client bhi website se aaya toh pura paisa wapas!"

--- 📜 POLICIES & SCENARIOS ---
- Refund Policy: 100% Refund if cancelled within 24 Hours before work starts. NO Refunds once work starts. Support email: help@vibespheremedia.in.
- Scenario "Is this fake?": Reply "Sir, VibeSphere Media ek Registered Indian Agency hai. Razorpay secure gateway use karte hain. Scammers ₹100-200 mangte hain, hum brand banate hain. ✅"
- Scenario "Web Dev is expensive": Reply "Sir, Market mein yahi kaam ₹25,000+ ka hai. Hum ₹14,999 mein 'Business Package' de rahe hain with SEO. Quality chahiye toh thoda invest karna padega. 🚀"

--- 🛒 CLOSING THE DEAL ---
Always end your response with a Call to Action (CTA) or a closing question:
- "Kaunsa package final karein? Silver ya Gold? 😉"
- "Link bhejun payment ka?"
- "Start karein aaj se hi?"

    `;


    // Build clean chat history (trim to last 10, ensure alternating roles)
    let contents = [];
    if (Array.isArray(userHistory)) {
        const trimmedHistory = userHistory.length > 10 ? userHistory.slice(-10) : userHistory;
        let lastRole = null;
        trimmedHistory.forEach(msg => {
            if (msg.role && msg.parts && msg.parts[0] && msg.parts[0].text) {
                const role = msg.role === 'model' ? 'model' : 'user';
                if (role !== lastRole) {
                    contents.push({ role, parts: [{ text: msg.parts[0].text }] });
                    lastRole = role;
                }
            }
        });
    }

    // ── Helper: build messages array (instruction-injected, no 'system' role) ──
    // Converts Gemini-style history to OpenAI-style and injects system prompt
    // into the very first user message to avoid 400 errors on strict models.
    const buildMessages = () => {
        const historyMessages = contents.map(c => ({
            role: c.role === 'model' ? 'assistant' : 'user',
            content: c.parts[0].text
        }));

        if (historyMessages.length === 0) {
            return [{ role: 'user', content: `${systemPrompt}\n\n---\n\n${userMessage}` }];
        }
        const [firstMsg, ...restMsgs] = historyMessages;
        return [
            { role: 'user', content: `${systemPrompt}\n\n---\n\n${firstMsg.content}` },
            ...restMsgs,
            { role: 'user', content: userMessage }
        ];
    };

    const messages = buildMessages();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    let replyText = null;

    // ════════════════════════════════════════
    // 🥇 TIER 1: Groq API (Fastest)
    // ════════════════════════════════════════
    try {
        const GROQ_KEY = process.env.GROQ_API_KEY;
        if (!GROQ_KEY) throw new Error('No Groq key');

        const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${GROQ_KEY}`
            },
            body: JSON.stringify({
                model: 'llama-3.1-8b-instant',
                messages,
                temperature: 0.7,
                max_tokens: 1024
            }),
            signal: controller.signal
        });

        const groqData = await groqRes.json();

        if (!groqRes.ok || groqData.error) {
            console.error('❌ Groq Error:', JSON.stringify(groqData.error || groqData, null, 2));
            throw new Error('groq_failed');
        }

        replyText = groqData.choices?.[0]?.message?.content || null;
        if (!replyText) throw new Error('groq_empty');

        console.log('✅ VibeGenie replied via Groq');

    } catch (groqErr) {
        console.log(`🔄 Groq failed (${groqErr.message}). Trying OpenRouter...`);

        // ════════════════════════════════════════
        // 🥈 TIER 2: OpenRouter API
        // ════════════════════════════════════════
        try {
            const OR_KEY = process.env.OPENROUTER_API_KEY;
            if (!OR_KEY) throw new Error('No OpenRouter key');

            const orRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${OR_KEY}`,
                    'HTTP-Referer': 'https://vibespheremedia.in',
                    'X-Title': 'VibeSphere VibeGenie AI'
                },
                body: JSON.stringify({
                    model: 'stepfun/step-3.5-flash:free',
                    messages
                }),
                signal: controller.signal
            });

            const orData = await orRes.json();

            if (!orRes.ok || orData.error) {
                console.error('❌ OpenRouter Error:', JSON.stringify(orData.error || orData, null, 2));
                throw new Error('openrouter_failed');
            }

            replyText = orData.choices?.[0]?.message?.content || null;
            if (!replyText) throw new Error('openrouter_empty');

            console.log('✅ VibeGenie replied via OpenRouter');

        } catch (orErr) {
            console.log(`🔄 OpenRouter failed (${orErr.message}). Trying Google Gemma...`);

            // ════════════════════════════════════════
            // 🥉 TIER 3: Google Gemma (Final Fallback)
            // ════════════════════════════════════════
            try {
                const finalContents = [
                    { role: 'user', parts: [{ text: systemPrompt }] },
                    ...contents,
                    { role: 'user', parts: [{ text: userMessage }] }
                ];

                const gemmaRes = await fetch(
                    `https://generativelanguage.googleapis.com/v1beta/models/gemma-3-27b-it:generateContent?key=${API_KEY}`,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ contents: finalContents }),
                        signal: controller.signal
                    }
                );

                const gemmaData = await gemmaRes.json();

                if (gemmaData.error) {
                    console.error('❌ Gemma Error:', JSON.stringify(gemmaData.error, null, 2));
                    replyText = 'System busy. Please try again in a moment!';
                } else {
                    replyText = gemmaData.candidates?.[0]?.content?.parts?.[0]?.text || 'System busy.';
                    console.log('✅ VibeGenie replied via Google Gemma');
                }
            } catch (gemmaErr) {
                console.error('❌ All AI tiers failed:', gemmaErr.message);
                replyText = 'System is temporarily busy. Please try again shortly!';
            }
        }
    }

    clearTimeout(timeoutId);
    res.json({ reply: replyText });
});



// ==========================================
// 💳 PAYMENT & ADMIN ROUTES (UPDATED)
// ==========================================

// ✅ SMART PAYMENT CREATION (Isme MAGIC kiya hai)
app.post('/api/create-payment', async (req, res) => {
    try {
        let { amount, currency } = req.body;

        console.log(`📝 Payment Request: ${amount} ${currency}`);

        // 👇 YEH HAI MAGIC LINE:
        // Agar amount "$19" hai, toh "$" hata kar "19" bana dega.
        // Agar "₹399" hai, toh "399" bana dega.
        let cleanAmount = amount.toString().replace(/[^\d.]/g, '');

        // Currency validation
        let cleanCurrency = currency && currency.length === 3 ? currency : "INR";

        const options = {
            amount: Math.round(parseFloat(cleanAmount) * 100), // Paise conversion
            currency: cleanCurrency,
            receipt: "rcpt_" + Date.now()
        };

        const order = await razorpay.orders.create(options);
        res.json(order);
    } catch (error) {
        console.error("❌ Payment Error:", error);
        res.status(500).send(error);
    }
});

app.post('/api/verify-payment', async (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderDetails } = req.body;
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(body.toString()).digest('hex');

    if (expectedSignature === razorpay_signature) {
        const newOrder = new Order({
            orderId: "#ORD-" + Math.floor(100000 + Math.random() * 900000),
            paymentId: razorpay_payment_id,
            status: 'Done',
            ...orderDetails,
            date: new Date().toLocaleString()
        });

        try { if (mongoose.connection.readyState === 1) await newOrder.save(); } catch (e) { }

        // 🟢 MAGIC: Generate PDF in memory & Send Email
        try {
            const doc = new PDFDocument({ margin: 50 });
            let buffers = [];
            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', async () => {
                let pdfData = Buffer.concat(buffers);

                let mailOptions = {
                    from: process.env.EMAIL_USER,
                    to: newOrder.email, // Client ka email jo order form me bhara gaya
                    subject: `Order Confirmed! Your Invoice ${newOrder.orderId} - VibeSphere Media`,
                    text: `Hi ${newOrder.customerName},\n\nThank you for choosing VibeSphere Media! Your payment was successful and your order (${newOrder.orderId}) is now confirmed.\n\nPlease find your official invoice attached to this email.\n\nOur team will contact you shortly to start the work.\n\nRegards,\nTeam VibeSphere`,
                    attachments: [{ filename: `Invoice-${newOrder.orderId}.pdf`, content: pdfData }]
                };

                // Email send karo (Background me)
                transporter.sendMail(mailOptions).catch(err => console.error('Background Email Error:', err));

                // IMPORTANT: res.json MUST be here so it waits for PDF generating
                res.json({ success: true });
            });

            // Make the PDF content (Same as download logic)
            doc.fontSize(25).fillColor('#6c63ff').text('VibeSphere Media.', { align: 'center' });
            doc.moveDown();
            doc.fontSize(12).fillColor('#333').text(`Invoice Number: ${newOrder.orderId}`, { align: 'right' });
            doc.text(`Date: ${new Date(newOrder.date).toLocaleDateString()}`, { align: 'right' });
            doc.moveDown();
            doc.fontSize(16).fillColor('#000').text('Customer Details:');
            doc.fontSize(12).fillColor('#444').text(`Name: ${newOrder.customerName}`);
            doc.text(`Email: ${newOrder.email}`);
            doc.moveDown();
            doc.fontSize(16).fillColor('#000').text('Order Details:');
            doc.fontSize(12).fillColor('#444').text(`Package: ${newOrder.package}`);
            doc.text(`Amount Paid: ${newOrder.price}`);
            doc.end();

        } catch (emailErr) {
            console.log("Failed to process email", emailErr);
            res.json({ success: true }); // Fallback response if PDF generation completely fails
        }
    } else {
        res.json({ success: false });
    }
});

// Admin Auth
app.post('/api/login', (req, res) => {
    const { password } = req.body;
    if (password === CURRENT_ADMIN_PASSWORD) {
        const token = jwt.sign({ role: 'Admin' }, process.env.JWT_SECRET || "SECRET_VIBESPHERE_KEY_123", { expiresIn: '2h' });

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'Strict',
            maxAge: 2 * 60 * 60 * 1000 // 2 hours
        });

        res.json({ success: true });
    } else {
        res.json({ success: false });
    }
});

function checkAuth(req, res, next) {
    const token = req.cookies.token || req.headers['authorization'];
    if (!token) return res.status(401).json({ error: "Access Denied" });

    // Legacy Support mapping for standalone bypasses
    if (token === ADMIN_TOKEN || token === "SECRET_VIBESPHERE_KEY_123") return next();

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || "SECRET_VIBESPHERE_KEY_123");
        // We can attach the user to req objects (e.g. req.user = decoded) if needed later
        next();
    } catch (err) {
        res.status(401).json({ error: "Invalid or expired session" });
    }
}

// Global Cookie Logout
app.post('/api/logout', (req, res) => {
    res.clearCookie('token');
    res.json({ success: true, message: "Logged out completely." });
});

// GET Current Admin Context via Cookie
app.get('/api/admin/me', (req, res) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ success: false, message: "No active session." });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || "SECRET_VIBESPHERE_KEY_123");
        if (decoded.role === 'Admin') {
            res.json({ success: true, user: { role: 'Admin' } });
        } else {
            res.status(401).json({ success: false, message: "Role mismatch." });
        }
    } catch (err) {
        res.status(401).json({ success: false, message: "Token invalid or expired." });
    }
});

// GET Current Client Context via Cookie
app.get('/api/client/me', async (req, res) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ success: false, message: "No active session." });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || "SECRET_VIBESPHERE_KEY_123");
        if (decoded.role === 'Client') {
            const user = await User.findOne({ email: decoded.email });
            if (!user) {
                console.log(`❌ Client not found: ${decoded.email}`);
                return res.status(401).json({ success: false });
            }
            res.json({ success: true, user: { name: user.name, email: user.email } });
        } else {
            console.log(`⚠️ Role mismatch for ${decoded.email}: Expected Client, got ${decoded.role}`);
            res.status(401).json({ success: false, message: "Role mismatch." });
        }
    } catch (err) {
        console.error("🕵️ Auth Error:", err.message);
        res.status(401).json({ success: false, message: "Token invalid or expired." });
    }
});

app.post('/api/logout', (req, res) => {
    res.clearCookie('token');
    res.json({ success: true, message: "Logged out completely." });
});


app.get('/api/admin/orders', checkAuth, async (req, res) => {
    try {
        let orders = await Order.find().sort({ _id: -1 });
        res.json(orders);
    } catch (err) { res.status(500).json({ error: "Fetch Failed" }); }
});
// ==========================================
// 📥 INVOICE DOWNLOAD API
// ==========================================
// ==========================================
// 📥 INVOICE DOWNLOAD API (Updated)
// ==========================================
app.get('/api/download-invoice/:orderId', async (req, res) => {
    try {
        const order = await Order.findOne({ orderId: req.params.orderId });
        if (!order) return res.status(404).send("Order not found");

        // Margin 0 zaroori hai full-width header ke liye
        const doc = new PDFDocument({ margin: 0, size: 'A4' });

        res.setHeader('Content-disposition', `attachment; filename=VibeSphere_Invoice_${order.orderId}.pdf`);
        res.setHeader('Content-type', 'application/pdf');
        doc.pipe(res);

        // Naya Premium Design call karo
        buildProfessionalInvoice(doc, order);
    } catch (e) {
        console.error("PDF Error:", e);
        res.status(500).send("Error generating invoice");
    }
});
// 🟢 1. UPDATE STATUS API (SMART COMMISSION ENGINE)
app.post('/api/admin/update-status', checkAuth, async (req, res) => {
    const { id, status } = req.body;

    try {
        const order = await Order.findOne({ orderId: id });
        if (!order) return res.status(404).json({ success: false, message: "Order not found" });

        // 🟢 COMMISSION ENGINE LOGIC
        if (status === 'Done' && order.status !== 'Done' && order.assignedStaff) {
            // Price ko safely clean karo (Agar blank ho toh 0 maan lo)
            let rawPrice = order.price ? order.price.toString() : "0";
            let cleanPrice = parseFloat(rawPrice.replace(/[^\d.]/g, '')) || 0;
            let commission = cleanPrice * 0.20; // 20% cut

            if (commission > 0) {
                await Staff.findOneAndUpdate(
                    { email: order.assignedStaff },
                    { $inc: { totalEarnings: commission, pendingPayout: commission } }
                );
                order.commissionValue = commission;
            }
        }

        order.status = status;
        const updatedOrder = await order.save();

        // Client dashboard live signal
        if (updatedOrder && updatedOrder.email) {
            io.to(updatedOrder.email).emit('status_updated', {
                orderId: updatedOrder.orderId,
                status: updatedOrder.status,
                package: updatedOrder.package
            });
        }

        // 🟢 REAL-TIME SYNC
        io.emit('order_updated', updatedOrder);

        res.json({ success: true, message: "Status Updated!" });
    } catch (error) {
        console.error("Update Status Error:", error);
        res.status(500).json({ success: false });
    }
});

// 🟢 2. ASSIGN ORDER API (WITH TYPO CHECK & RETROACTIVE COMMISSION)
app.post('/api/admin/assign-order', checkAuth, async (req, res) => {
    try {
        const { orderId, staffEmail } = req.body;
        const order = await Order.findOne({ orderId });
        if (!order) return res.json({ success: false, message: "Order not found" });

        const cleanEmail = staffEmail.toLowerCase().trim();

        // 🛡️ NAYA FIX: Pehle check karo ki ye email exist bhi karta hai ya nahi?
        const staffExists = await Staff.findOne({ email: cleanEmail });
        if (!staffExists) {
            return res.json({ success: false, message: "Staff account not found! Email ki spelling check karo." });
        }

        order.assignedStaff = cleanEmail;

        // 🚀 SUPER FIX: Agar order pehle se 'Done' hai, toh assignment ke waqt hi commission de do!
        if (order.status === 'Done' && (!order.commissionValue || order.commissionValue === 0)) {
            let rawPrice = order.price ? order.price.toString() : "0";
            let cleanPrice = parseFloat(rawPrice.replace(/[^\d.]/g, '')) || 0;
            let commission = cleanPrice * 0.20;

            if (commission > 0) {
                await Staff.findOneAndUpdate(
                    { email: cleanEmail },
                    { $inc: { totalEarnings: commission, pendingPayout: commission } }
                );
                order.commissionValue = commission;
            }
        }

        const updatedOrder = await order.save();

        // 🟢 REAL-TIME SYNC
        io.emit('order_assigned', updatedOrder);

        res.json({ success: true, message: "Staff Assigned & Commission Logic Applied!" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: "Error assigning staff" });
    }
});
// --- BLOG API ROUTES ---

// ==========================================
// ✍️ BLOG MANAGEMENT APIs
// ==========================================

// 1. Save New Blog (Admin Only)
app.post('/api/add-blog', checkAuth, async (req, res) => {
    try {
        // Frontend se aane wale naye SEO fields ko bhi receive karo
        const {
            title, image, content, slug,
            category, status, tags, metaTitle, metaDesc
        } = req.body;

        const newBlog = new Blog({
            title, image, content, slug,
            category, status, tags, metaTitle, metaDesc
        });

        await newBlog.save();
        res.json({ success: true, message: "Blog Posted Successfully!" });
    } catch (error) {
        console.error("Error saving blog:", error);
        res.status(500).json({ success: false, error: "Error saving blog" });
    }
});

// 2. Edit (Update) Blog (Admin Only)
app.put('/api/edit-blog/:id', checkAuth, async (req, res) => {
    try {
        // req.body mein ab metaTitle aur metaDesc bhi aayenge jo direct update ho jayenge
        await Blog.findByIdAndUpdate(req.params.id, req.body);
        res.json({ success: true, message: "Blog Updated Successfully!" });
    } catch (error) {
        console.error("Error updating blog:", error);
        res.status(500).json({ success: false, error: "Update failed" });
    }
});
// 3. Delete Blog (Admin Only 🔒)
app.delete('/api/delete-blog/:id', checkAuth, async (req, res) => {
    try {
        await Blog.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: "Blog Deleted!" });
    } catch (error) {
        console.error("Error deleting blog:", error);
        res.status(500).json({ success: false, error: "Delete failed" });
    }
});

// 4. Get All Blogs (Public 🌍 - For Blog Page)
app.get('/api/blogs', async (req, res) => {
    try {
        const blogs = await Blog.find().sort({ date: -1 }); // Newest first
        res.json(blogs);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch blogs" });
    }
});

// 5. Get Single Blog (Public 🌍 - For Reading)
app.get('/api/blog/:slug', async (req, res) => {
    try {
        const blog = await Blog.findOne({ slug: req.params.slug });
        if (blog) {
            res.json(blog);
        } else {
            res.status(404).json({ error: "Blog not found" });
        }
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch blog" });
    }
});

// 6. Serve Single Blog Page (Frontend Route)
app.get('/blog/:slug', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'read-blog.html'));
});

// ==========================================
// ⭐ REVIEW & AUTH APIs
// ==========================================

// Delete Review API (Admin Only 🔒)
app.delete('/api/admin/delete-review/:id', checkAuth, async (req, res) => {
    try {
        await Review.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: "Review Deleted Successfully!" });
    } catch (err) {
        res.status(500).json({ success: false, error: "Failed to delete review" });
    }
});

// Google Login API (Public 🌍)
app.post('/api/auth/google', async (req, res) => {
    try {
        const { token } = req.body;

        // Google se verify karo ki token asli hai
        const ticket = await googleClient.verifyIdToken({
            idToken: token,
            audience: GOOGLE_CLIENT_ID,
        });
        const { name, email, picture, sub } = ticket.getPayload();

        // Check karo user pehle se hai kya?
        let user = await User.findOne({ email });

        if (!user) {
            // Naya user banao
            user = new User({ name, email, picture, googleId: sub });
            await user.save();
        }

        // Create JWT Token
        const jwtToken = jwt.sign({
            email: user.email,
            role: 'Client',
            name: user.name
        }, process.env.JWT_SECRET || "SECRET_VIBESPHERE_KEY_123", { expiresIn: '7d' });

        res.cookie('token', jwtToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'Strict',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        // Login Success
        res.json({ success: true, user: { name: user.name, email: user.email, picture: user.picture } });

    } catch (e) {
        console.error("Google Auth Error:", e);
        res.status(500).json({ success: false, error: "Google Auth Failed" });
    }
});
// ==========================================
// 👮‍♂️ ADMIN: STAFF MANAGEMENT APIs
// ==========================================

// 1. Get all staff list
app.get('/api/admin/staff', checkAuth, async (req, res) => {
    try {
        const staff = await Staff.find().sort({ date: -1 });
        res.json({ success: true, staff: staff });
    } catch (e) { res.status(500).json({ error: "Failed to fetch staff" }); }
});

// 2. Add new staff
app.post('/api/admin/add-staff', checkAuth, async (req, res) => {
    try {
        const { name, email, password, role } = req.body;

        const existingStaff = await Staff.findOne({ email });
        if (existingStaff) return res.status(400).json({ success: false, error: "Email already exists!" });

        // 🟢 Naya code: Ek unique EMP ID generate karo (e.g., VS-4821)
        let newEmpId;
        let isUnique = false;
        while (!isUnique) {
            newEmpId = 'VS-' + Math.floor(1000 + Math.random() * 9000);
            const checkId = await Staff.findOne({ empId: newEmpId });
            if (!checkId) isUnique = true; // Agar ID pehle se kisi ke paas nahi hai, toh confirm karo
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newStaff = new Staff({ empId: newEmpId, name, email, password: hashedPassword, role });
        await newStaff.save();
        res.json({ success: true, message: `Staff Added! ID is ${newEmpId}` });
    } catch (e) { res.status(500).json({ success: false, error: "Server error!" }); }
});
// 3. Delete a staff member
app.delete('/api/admin/delete-staff/:id', checkAuth, async (req, res) => {
    try {
        await Staff.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: "Staff Deleted!" });
    } catch (e) { res.status(500).json({ success: false, error: "Failed to delete" }); }
});

// 4. Get Staff Performance (Work Chart) - FIXED TO SHOW 0 LEADS
app.get('/api/admin/staff-performance', checkAuth, async (req, res) => {
    try {
        // 1. Pehle saare staff ko lao aur sabka khata 0 se shuru karo
        const allStaff = await Staff.find();
        const performance = {};

        allStaff.forEach(staff => {
            performance[staff.email] = { total: 0, completed: 0, pending: 0, details: [] };
        });

        // 2. Ab saari leads (tasks) lao aur jiske naam par hai usme jod do
        const tasks = await Task.find().sort({ dateAssigned: -1 });

        tasks.forEach(task => {
            const email = task.assignedTo;

            // Agar email assigned hai, tabhi aage badho
            if (email) {
                // Agar ye staff abhi bhi system me hai
                if (performance[email]) {
                    performance[email].total++;
                    if (task.status === 'interested' || task.status === 'rejected') {
                        performance[email].completed++;
                    } else {
                        performance[email].pending++;
                    }
                    performance[email].details.push(task);
                } else {
                    // (Edge Case) Agar staff delete ho chuka hai, par uski purani lead padi hai
                    performance[email] = { total: 1, completed: 0, pending: 1, details: [task] };
                    if (task.status === 'interested' || task.status === 'rejected') {
                        performance[email].completed = 1;
                        performance[email].pending = 0;
                    }
                }
            }
        });

        res.json({ success: true, performance: performance });
    } catch (e) { res.status(500).json({ error: "Failed to fetch performance" }); }
});
// 5. Assign New Lead (Task)
// 5. Assign New Lead (Task)
app.post('/api/admin/add-task', checkAuth, async (req, res) => {
    try {
        const { clientName, contactNumber, servicePitch, assignedTo } = req.body;

        const newTask = new Task({
            clientName,
            contactNumber,
            servicePitch,
            assignedTo,
            status: 'pending'
        });
        await newTask.save();

        // 🟢 REAL-TIME: Notify assigned staff and Admin
        io.to(assignedTo).emit('lead_assigned', { clientName, servicePitch });
        io.emit('staff_list_updated'); // Refresh Admin's staffView if needed

        // 🧠 AI Lead Scoring (Background - Non-blocking)
        scoreLeadWithAI(newTask._id, newTask);

        res.json({ success: true, message: "Lead Assigned Successfully!" });
    } catch (e) { res.status(500).json({ success: false, error: "Failed to assign lead" }); }
});

// 6. Post a Notice (Notification)
app.post('/api/admin/add-notice', checkAuth, async (req, res) => {
    try {
        const { title, message } = req.body;

        const newNotice = new Notice({ title, message, author: "Admin" });
        await newNotice.save();

        // 🟢 REAL-TIME: Notify all online staff
        io.emit('notice_posted');

        res.json({ success: true, message: "Notice Posted on Staff Board!" });
    } catch (e) { res.status(500).json({ success: false, error: "Failed to post notice" }); }
});

// 🟢 YAHAN PASTE KARNA HAI TERA NAYA CODE:
// 7. Delete a Assigned Lead (Task)
app.delete('/api/admin/delete-task/:id', checkAuth, async (req, res) => {
    try {
        await Task.findByIdAndDelete(req.params.id);

        // 🟢 REAL-TIME: Notify Admin and Staff
        io.emit('lead_deleted', req.params.id);

        res.json({ success: true, message: "Lead Deleted Successfully!" });
    } catch (e) {
        res.status(500).json({ success: false, error: "Failed to delete lead" });
    }
});

// ==========================================
// 🎧 HELPDESK TICKETING APIs
// ==========================================

// Client creates a ticket
app.post('/api/client/create-ticket', async (req, res) => {
    try {
        const { email, name, subject, issue } = req.body;
        if (!subject || !issue) return res.status(400).json({ success: false, message: 'Subject and issue are required' });
        const ticket = new Ticket({ clientEmail: email, clientName: name, subject, issue });
        await ticket.save();
        res.json({ success: true, message: 'Ticket created successfully! 🎫' });
    } catch (e) { res.status(500).json({ success: false, error: 'Failed to create ticket' }); }
});

// Client views own tickets
app.post('/api/client/my-tickets', async (req, res) => {
    try {
        const tickets = await Ticket.find({ clientEmail: req.body.email }).sort({ date: -1 });
        res.json({ success: true, tickets });
    } catch (e) { res.status(500).json({ success: false }); }
});

// Admin/Staff views all tickets
app.get('/api/admin/tickets', checkAuth, async (req, res) => {
    try {
        const tickets = await Ticket.find().sort({ date: -1 });
        res.json({ success: true, tickets });
    } catch (e) { res.status(500).json({ success: false }); }
});

// Admin/Staff updates ticket status + adds reply
app.post('/api/admin/update-ticket', checkAuth, async (req, res) => {
    try {
        const { ticketId, status, reply, sender } = req.body;
        const update = {};
        if (status) update.status = status;
        const ticket = await Ticket.findById(ticketId);
        if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });
        if (status) ticket.status = status;
        if (reply) ticket.replies.push({ sender: sender || 'Admin', message: reply });
        await ticket.save();
        res.json({ success: true, message: 'Ticket updated! ✅' });
    } catch (e) { res.status(500).json({ success: false, error: 'Failed to update ticket' }); }
});

// ==========================================
// 💰 EXPENSE TRACKER APIs (Admin Only)
// ==========================================

app.post('/api/admin/add-expense', checkAuth, async (req, res) => {
    try {
        const { title, amount, category } = req.body;
        if (!title || !amount) return res.status(400).json({ success: false, message: 'Title and amount required' });
        const expense = new Expense({ title, amount: Number(amount), category: category || 'General' });
        await expense.save();
        res.json({ success: true, message: 'Expense added! 💰' });
    } catch (e) { res.status(500).json({ success: false, error: 'Failed to add expense' }); }
});

app.get('/api/admin/expenses', checkAuth, async (req, res) => {
    try {
        const expenses = await Expense.find().sort({ date: -1 });
        res.json({ success: true, expenses });
    } catch (e) { res.status(500).json({ success: false }); }
});

app.delete('/api/admin/delete-expense/:id', checkAuth, async (req, res) => {
    try {
        await Expense.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Expense deleted! 🗑️' });
    } catch (e) { res.status(500).json({ success: false, error: 'Failed to delete expense' }); }
});

app.get('/api/admin/finance-summary', checkAuth, async (req, res) => {
    try {
        // Total Revenue from Orders
        const orders = await Order.find();
        let totalRevenue = 0;
        orders.forEach(o => {
            const price = parseFloat(String(o.price).replace(/[^0-9.]/g, ''));
            if (!isNaN(price)) totalRevenue += price;
        });

        // Total Expenses
        const expenses = await Expense.find();
        let totalExpenses = 0;
        expenses.forEach(e => { totalExpenses += (e.amount || 0); });

        const netProfit = totalRevenue - totalExpenses;

        res.json({ success: true, totalRevenue, totalExpenses, netProfit });
    } catch (e) { res.status(500).json({ success: false }); }
});

// ==========================================
// 📚 RESOURCE HUB APIs (Knowledge Base)
// ==========================================

app.post('/api/admin/add-resource', checkAuth, upload.single('file'), async (req, res) => {
    try {
        const { title, type, content } = req.body;
        if (!title) return res.status(400).json({ success: false, message: 'Title is required' });

        let resourceContent = content || '';

        // If PDF uploaded, upload to Cloudinary
        if (req.file && type === 'pdf') {
            resourceContent = await uploadToCloudinary(req.file.buffer, req.file.originalname);
        }

        const resource = new Resource({ title, type: type || 'link', content: resourceContent });
        await resource.save();
        res.json({ success: true, message: 'Resource added! 📚' });
    } catch (e) { res.status(500).json({ success: false, error: 'Failed to add resource' }); }
});

app.get('/api/resources', async (req, res) => {
    try {
        const resources = await Resource.find().sort({ date: -1 });
        res.json({ success: true, resources });
    } catch (e) { res.status(500).json({ success: false }); }
});

app.delete('/api/admin/delete-resource/:id', checkAuth, async (req, res) => {
    try {
        await Resource.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Resource deleted! 🗑️' });
    } catch (e) { res.status(500).json({ success: false, error: 'Failed to delete resource' }); }
});

// ==========================================
// ==========================================
// 🎬 VIDEO MEETING APIs (Jitsi)
// ==========================================

app.post('/api/admin/create-meeting', checkAuth, async (req, res) => {
    try {
        const { topic, scheduledTime, password } = req.body;
        if (!topic || !scheduledTime) return res.status(400).json({ success: false, message: 'Topic and time required' });

        const JAAS_APP_ID = process.env.JAAS_APP_ID;
        if (!JAAS_APP_ID || JAAS_APP_ID === 'YOUR_JAAS_APP_ID_HERE') return res.status(500).json({ success: false, message: 'JaaS App ID not configured in .env' });

        // Generate JaaS-formatted room name correctly (Lowercase for XMPP compatibility)
        const appId = JAAS_APP_ID.replace('vpaas-magic-cookie-', '');
        const roomName = `vpaas-magic-cookie-${appId}/vibesphere-meeting-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`.toLowerCase();

        const meeting = new Meeting({
            topic,
            roomName: roomName,
            scheduledTime: new Date(scheduledTime),
            createdBy: 'Admin',
            password: password || ''
        });
        await meeting.save();

        // 🟢 REAL-TIME: Notify all online staff and Admin
        io.emit('meeting_scheduled', { topic, scheduledTime, roomName: roomName });

        res.json({ success: true, message: 'Meeting scheduled! 🎬', meeting });
    } catch (e) {
        console.error('Meeting create error:', e.message);
        res.status(500).json({ success: false, error: 'Failed to create meeting' });
    }
});

// 🟢 NAYA: Meeting Info API (Public)
app.get('/api/meeting-info/:room', async (req, res) => {
    try {
        const roomName = req.params.room;
        // Search by roomName part since DB has full prefix
        const meeting = await Meeting.findOne({ roomName: { $regex: roomName, $options: 'i' } });
        if (!meeting) return res.status(404).json({ success: false, message: "Meeting not found" });

        res.json({
            success: true,
            topic: meeting.topic,
            scheduledTime: meeting.scheduledTime,
            status: meeting.status,
            hasPassword: !!(meeting.password && meeting.password.trim() !== '')
        });
    } catch (e) { res.status(500).json({ success: false }); }
});

// 🟢 NAYA: Verify Meeting Password
app.post('/api/meeting/verify-password', async (req, res) => {
    try {
        const { room, password } = req.body;
        const meeting = await Meeting.findOne({ roomName: { $regex: room, $options: 'i' } });
        if (!meeting) return res.status(404).json({ success: false, message: "Meeting not found" });

        if (meeting.password === password) {
            res.json({ success: true });
        } else {
            res.json({ success: false, message: "Incorrect Password! ❌" });
        }
    } catch (e) { res.status(500).json({ success: false }); }
});

// 🟢 NAYA: Update Meeting Time API
app.put('/api/admin/update-meeting-time', checkAuth, async (req, res) => {
    try {
        const { meetingId, newTime } = req.body;
        const meeting = await Meeting.findByIdAndUpdate(meetingId, { scheduledTime: new Date(newTime) }, { new: true });
        if (!meeting) return res.json({ success: false, message: "Meeting not found" });

        // 🟢 SOCKET: Notify Everyone
        io.emit('meeting_updated', { topic: meeting.topic, scheduledTime: meeting.scheduledTime });

        res.json({ success: true, message: "Meeting rescheduled successfully! ✏️" });
    } catch (e) { res.status(500).json({ success: false, error: "Failed to update time" }); }
});

app.get('/api/meetings', async (req, res) => {
    try {
        const meetings = await Meeting.find().sort({ scheduledTime: -1 });
        res.json({ success: true, meetings });
    } catch (e) { res.status(500).json({ success: false }); }
});

app.delete('/api/admin/delete-meeting/:id', checkAuth, async (req, res) => {
    try {
        await Meeting.findByIdAndDelete(req.params.id);

        // 🟢 REAL-TIME: Notify everyone
        io.emit('meeting_cancelled');

        res.json({ success: true, message: 'Meeting deleted! 🗑️' });
    } catch (e) { res.status(500).json({ success: false, error: 'Failed to delete meeting' }); }
});

app.post('/api/admin/update-meeting-status', checkAuth, async (req, res) => {
    try {
        const { meetingId, status } = req.body;
        await Meeting.findByIdAndUpdate(meetingId, { status });
        if (status === 'Live') io.emit('meeting_going_live', { meetingId });
        res.json({ success: true, message: 'Meeting status updated!' });
    } catch (e) { res.status(500).json({ success: false }); }
});
// ==========================================
// 📜 MANAGE HANDOVERS / CERTIFICATES (ADMIN)
// ==========================================

// 1. Fetch All Certificates
app.get('/api/admin/handovers', checkAuth, async (req, res) => {
    try {
        const certs = await Handover.find().sort({ dateGenerated: -1 });
        res.json({ success: true, certs: certs });
    } catch (e) {
        res.status(500).json({ error: "Failed to fetch certificates" });
    }
});

// 2. Delete Certificate
app.delete('/api/admin/delete-handover/:id', checkAuth, async (req, res) => {
    try {
        await Handover.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: "Certificate Deleted Successfully!" });
    } catch (e) {
        res.status(500).json({ success: false, error: "Failed to delete certificate" });
    }
});

// 3. 📥 RE-DOWNLOAD SAVED CERTIFICATE
app.get('/api/admin/download-saved-handover/:id', async (req, res) => {
    try {
        const cert = await Handover.findById(req.params.id);
        if (!cert) return res.status(404).send("Certificate Not Found");

        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const verifyLink = `${baseUrl}/verify.html?cert=${cert.certId}`;
        const qrImage = await QRCode.toDataURL(verifyLink);

        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        res.setHeader('Content-disposition', `attachment; filename=Handover_${cert.orderNumber}.pdf`);
        res.setHeader('Content-type', 'application/pdf');
        doc.pipe(res);

        generatePremiumHandoverLayout(doc, cert, qrImage); // Calling Helper Function
    } catch (e) { res.status(500).send("Error downloading PDF"); }
});


// ==========================================
// 🔍 PUBLIC: VERIFY STAFF ID API
// ==========================================
app.get('/api/verify-staff/:id', async (req, res) => {
    try {
        const checkId = req.params.id.toUpperCase().trim(); // Taki log lowercase me dale toh bhi chal jaye
        const staff = await Staff.findOne({ empId: checkId });

        if (staff) {
            res.json({
                success: true,
                staff: { name: staff.name, role: staff.role, profilePhoto: staff.profilePhoto, empId: staff.empId }
            });
        } else {
            res.json({ success: false, message: "🚨 FAKE ID DETECTED: No such person works at VibeSphere Media!" });
        }
    } catch (e) { res.status(500).json({ success: false, error: "Server Error" }); }
});
// 7. Get All Notices (Admin Panel ke liye)
app.get('/api/admin/notices', checkAuth, async (req, res) => {
    try {
        const notices = await Notice.find().sort({ date: -1 });
        res.json({ success: true, notices: notices });
    } catch (e) { res.status(500).json({ error: "Failed to fetch notices" }); }
});

// 8. Delete Notice (Admin Panel se delete karne ke liye)
app.delete('/api/admin/delete-notice/:id', checkAuth, async (req, res) => {
    try {
        await Notice.findByIdAndDelete(req.params.id);

        // 🟢 REAL-TIME: Sync across portals
        io.emit('notice_deleted');

        res.json({ success: true, message: "Notice Deleted Successfully!" });
    } catch (e) { res.status(500).json({ success: false, error: "Failed to delete notice" }); }
});

// 2. Get All Jobs (Public & Admin ke liye)
app.get('/api/jobs', async (req, res) => {
    try {
        const jobs = await Job.find().sort({ date: -1 });
        res.json({ success: true, jobs });
    } catch (e) { res.status(500).json({ error: "Failed to fetch jobs" }); }
});

// 3. Post a New Job (Sirf Admin ke liye)
app.post('/api/admin/add-job', checkAuth, async (req, res) => {
    try {
        const { title, type, location, description } = req.body;
        const newJob = new Job({ title, type, location, description });
        await newJob.save();
        res.json({ success: true, message: "Job Posted Successfully 🚀" });
    } catch (e) { res.status(500).json({ success: false, error: "Failed to post job" }); }
});

// 4. Delete a Job (Sirf Admin ke liye)
app.delete('/api/admin/delete-job/:id', checkAuth, async (req, res) => {
    try {
        await Job.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: "Job Deleted!" });
    } catch (e) { res.status(500).json({ success: false, error: "Failed to delete job" }); }
});

// ==========================================
// 🔍 PUBLIC VERIFICATION API
// ==========================================
app.get('/api/verify-certificate/:certId', async (req, res) => {
    try {
        const cert = await Handover.findOne({ certId: req.params.certId.trim() });
        if (cert) {
            res.json({ success: true, cert });
        } else {
            res.json({ success: false, message: "🚨 Fake/Invalid Certificate Detected!" });
        }
    } catch (e) { res.status(500).json({ success: false }); }
});
// ==========================================
// 📧 RESEND INVOICE API (ADMIN ONLY)
// ==========================================
app.post('/api/admin/resend-invoice', checkAuth, async (req, res) => {
    try {
        const { orderId } = req.body;
        const order = await Order.findOne({ orderId });

        if (!order) return res.json({ success: false, message: "Order not found!" });
        if (!order.email) return res.json({ success: false, message: "Client email not available!" });

        const doc = new PDFDocument({ margin: 0, size: 'A4' });
        let buffers = [];

        // 1. PDF data ko memory mein collect karo
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', async () => {
            let pdfData = Buffer.concat(buffers);

            // 2. Email bhejne ki taiyari
            let mailOptions = {
                from: process.env.EMAIL_USER,
                to: order.email,
                subject: `Invoice Resent: Order ${order.orderId} - VibeSphere Media`,
                text: `Hi ${order.customerName},\n\nAs requested, please find your official invoice attached for Order ${order.orderId}.\n\nThank you for choosing VibeSphere Media.\n\nRegards,\nTeam VibeSphere`,
                attachments: [{ filename: `Invoice-${order.orderId}.pdf`, content: pdfData }]
            };

            // 3. Email Send karo (Background)
            transporter.sendMail(mailOptions).catch(err => console.error('Background Email Error:', err));
            res.json({ success: true, message: `Invoice sent successfully to ${order.email}` });
        });

        // 4. Same premium design use karo jo humne PDF ke liye banayi thi
        if (typeof buildProfessionalInvoice === "function") {
            buildProfessionalInvoice(doc, order);
        } else {
            // Fallback agar function na mile
            doc.fontSize(20).text(`VibeSphere Invoice - ${order.orderId}`);
            doc.end();
        }
    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, message: "Server error" });
    }
});
// ==========================================
// 📄 1. GENERATE & DOWNLOAD NEW HANDOVER
// ==========================================
app.post('/api/admin/generate-handover', checkAuth, async (req, res) => {
    try {
        const { orderNumber, clientName, projectName, deliveryDate, supportDate, liveLink, remarks } = req.body;

        let cert = await Handover.findOne({ orderNumber: orderNumber });
        if (cert) {
            cert.clientName = clientName;
            cert.projectName = projectName;
            cert.deliveryDate = deliveryDate;
            cert.supportDate = supportDate;
            cert.liveLink = liveLink;
            cert.remarks = remarks;
            await cert.save();
        } else {
            const certId = "VIBE-CERT-" + Math.floor(100000 + Math.random() * 900000);
            cert = new Handover({ certId, orderNumber, clientName, projectName, deliveryDate, supportDate, liveLink, remarks });
            await cert.save();
        }

        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const qrImage = await QRCode.toDataURL(`${baseUrl}/verify.html?cert=${cert.certId}`);

        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        res.setHeader('Content-disposition', `attachment; filename=Handover_${orderNumber}.pdf`);
        res.setHeader('Content-type', 'application/pdf');
        doc.pipe(res);

        generatePremiumHandoverLayout(doc, cert, qrImage);
    } catch (e) { res.status(500).send("Error generating PDF"); }
});

// ==========================================
// 📧 2. EMAIL NEW HANDOVER DIRECTLY
// ==========================================
app.post('/api/admin/email-handover', checkAuth, async (req, res) => {
    try {
        const { orderNumber, clientName, projectName, deliveryDate, supportDate, liveLink, remarks } = req.body;

        const order = await Order.findOne({ orderId: orderNumber });
        if (!order || !order.email) return res.json({ success: false, message: "Email not found for this Order!" });

        let cert = await Handover.findOne({ orderNumber: orderNumber });
        if (cert) {
            cert.clientName = clientName;
            cert.projectName = projectName;
            cert.deliveryDate = deliveryDate;
            cert.supportDate = supportDate;
            cert.liveLink = liveLink;
            cert.remarks = remarks;
            await cert.save();
        } else {
            const certId = "VIBE-CERT-" + Math.floor(100000 + Math.random() * 900000);
            cert = new Handover({ certId, orderNumber, clientName, projectName, deliveryDate, supportDate, liveLink, remarks });
            await cert.save();
        }

        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const qrImage = await QRCode.toDataURL(`${baseUrl}/verify.html?cert=${cert.certId}`);

        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        let buffers = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', async () => {
            let pdfData = Buffer.concat(buffers);
            let mailOptions = {
                from: process.env.EMAIL_USER,
                to: order.email,
                subject: `Project Delivered! Your Handover Certificate - ${projectName}`,
                text: `Hi ${clientName},\n\nYour project "${projectName}" has been successfully delivered!\n\nPlease find your Official Project Handover Certificate attached to this email.\n\nLive Link: ${liveLink}\n\nThank you for trusting VibeSphere Media.\n\nRegards,\nTeam VibeSphere`,
                attachments: [{ filename: `VibeSphere-Handover-${orderNumber}.pdf`, content: pdfData }]
            };
            transporter.sendMail(mailOptions).catch(err => console.error('Background Email Error:', err));
            res.json({ success: true, message: `Handover Certificate sent to ${order.email}` });
        });

        generatePremiumHandoverLayout(doc, cert, qrImage);
    } catch (e) { res.status(500).json({ success: false, message: "Error" }); }
});

// ==========================================
// 📥 3. RE-DOWNLOAD SAVED CERTIFICATE
// ==========================================
app.get('/api/admin/download-saved-handover/:id', async (req, res) => {
    try {
        const cert = await Handover.findById(req.params.id);
        if (!cert) return res.status(404).send("Certificate Not Found");

        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const qrImage = await QRCode.toDataURL(`${baseUrl}/verify.html?cert=${cert.certId}`);

        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        res.setHeader('Content-disposition', `attachment; filename=Handover_${cert.orderNumber}.pdf`);
        res.setHeader('Content-type', 'application/pdf');
        doc.pipe(res);

        generatePremiumHandoverLayout(doc, cert, qrImage);
    } catch (e) { res.status(500).send("Error downloading PDF"); }
});

// ==========================================
// 📧 4. RE-EMAIL SAVED CERTIFICATE
// ==========================================
app.post('/api/admin/re-email-handover/:id', checkAuth, async (req, res) => {
    try {
        const cert = await Handover.findById(req.params.id);
        if (!cert) return res.json({ success: false, message: "Certificate not found!" });
        // Line ~1269 ke baad add karo (cert fetch hone ke baad):
        const { projectName, clientName, liveLink, orderNumber } = cert;

        const order = await Order.findOne({ orderId: cert.orderNumber });
        if (!order || !order.email) return res.json({ success: false, message: "Client email not found in Orders!" });

        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const qrImage = await QRCode.toDataURL(`${baseUrl}/verify.html?cert=${cert.certId}`);

        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        let buffers = [];
        doc.on('data', buffers.push.bind(buffers));

        doc.on('end', async () => {
            let pdfData = Buffer.concat(buffers);
            let mailOptions = {
                from: process.env.EMAIL_USER,
                to: order.email,
                subject: `Project Delivered! Your Handover Certificate - ${projectName}`,
                text: `Hi ${clientName},\n\nYour project "${projectName}" has been successfully delivered!\n\nPlease find your Official Project Handover Certificate attached to this email.\n\nLive Link: ${liveLink}\n\nThank you for trusting VibeSphere Media.\n\nRegards,\nTeam VibeSphere`,
                attachments: [{ filename: `VibeSphere-Handover-${orderNumber}.pdf`, content: pdfData }]
            };
            transporter.sendMail(mailOptions).catch(err => console.error('Background Email Error:', err));
            res.json({ success: true, message: `Certificate resent to ${order.email}` });
        });

        generatePremiumHandoverLayout(doc, cert, qrImage);
    } catch (e) { res.status(500).json({ success: false, message: "Server error" }); }
});

// ==========================================
// 🟢 HELPER FUNCTION FOR PDF DESIGN
// ==========================================
function generatePremiumHandoverLayout(doc, cert, qrImage) {
    const dDate = cert.deliveryDate ? new Date(cert.deliveryDate).toLocaleDateString() : new Date().toLocaleDateString();
    const sDate = cert.supportDate ? new Date(cert.supportDate).toLocaleDateString() : 'N/A';
    const lLink = cert.liveLink || 'N/A';
    const rMarks = cert.remarks || 'No additional remarks.';

    doc.font('Helvetica-Bold').fontSize(8).fillColor('#94a3b8').text('CONFIDENTIAL DOCUMENT  |  CLIENT COPY  |  VER 1.0.0', 50, 25);
    try { if (fs.existsSync(path.join(__dirname, 'public', 'icon.png'))) doc.image(path.join(__dirname, 'public', 'icon.png'), 50, 45, { width: 165 }); } catch (e) { }

    doc.font('Helvetica').fontSize(10).fillColor('#555555')

        .text('support@vibespheremedia.in', 50, 110)
        .text('www.vibespheremedia.in', 50, 125)
        .text('', 50, 140);


    doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(24).text('PROJECT', 300, 45, { align: 'right' });
    doc.text('HANDOVER', 300, 70, { align: 'right' });
    doc.fillColor('#64748b').font('Helvetica').fontSize(10).text('Official Delivery & Sign-off Document', 300, 98, { align: 'right' });

    doc.roundedRect(360, 115, 185, 22, 4).fill('#f8fafc');
    doc.fillColor('#10b981').font('Helvetica-Bold').fontSize(10).text(`CERT ID: ${cert.certId}`, 360, 122, { align: 'center', width: 185 });
    doc.moveTo(50, 150).lineTo(545, 150).strokeColor('#f1f5f9').lineWidth(2).stroke();

    doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(12).text('Project Details', 50, 170);
    doc.roundedRect(50, 190, 495, 110, 8).fillAndStroke('#ffffff', '#e2e8f0');

    let rowY = 210;
    doc.fillColor('#64748b').font('Helvetica').fontSize(10).text('Order Number:', 70, rowY);
    doc.fillColor('#0f172a').font('Helvetica-Bold').text(cert.orderNumber, 170, rowY);
    doc.fillColor('#64748b').font('Helvetica').text('Client Name:', 70, rowY + 20);
    doc.fillColor('#0f172a').font('Helvetica-Bold').text(cert.clientName, 170, rowY + 20);
    doc.fillColor('#64748b').font('Helvetica').text('Project Title:', 70, rowY + 40);
    doc.fillColor('#0f172a').font('Helvetica-Bold').text(cert.projectName, 170, rowY + 40);
    doc.fillColor('#64748b').font('Helvetica').text('Delivery Date:', 70, rowY + 60);
    doc.fillColor('#0f172a').font('Helvetica-Bold').text(dDate, 170, rowY + 60);
    doc.fillColor('#64748b').font('Helvetica').text('Support Valid Till:', 300, rowY + 60);
    doc.fillColor('#10b981').font('Helvetica-Bold').text(sDate, 400, rowY + 60);

    doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(12).text('Deliverables & Notes', 50, 320);
    doc.roundedRect(50, 340, 495, 75, 8).fillAndStroke('#ffffff', '#e2e8f0');
    doc.fillColor('#64748b').font('Helvetica').fontSize(10).text('Live Link :', 70, 360);
    doc.fillColor('#3b82f6').font('Helvetica-Bold').text(lLink, 170, 360);
    doc.fillColor('#64748b').font('Helvetica').text('Important Notes:', 70, 380);
    doc.fillColor('#0f172a').font('Helvetica').text(rMarks, 170, 380, { width: 350 });

    doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(11).text('Post-Delivery Support Terms', 50, 440);
    doc.font('Helvetica').fontSize(9).fillColor('#64748b')
        .text('1. Free technical support is valid strictly up to the date mentioned above.', 50, 460)
        .text('2. Support covers minor bug fixes. Major structural changes billed separately.', 50, 475)
        .text('3. Not responsible for third-party plugin issues or unauthorized code edits.', 50, 490);

    doc.roundedRect(50, 520, 495, 40, 6).fill('#ecfdf5');
    doc.fillColor('#047857').font('Helvetica-Bold').fontSize(9).text('Maintenance Recommendation:', 65, 530);
    doc.fillColor('#065f46').font('Helvetica').fontSize(8.5).text('We strongly recommend our monthly maintenance plan to ensure continuous security and peak performance.', 65, 542);
    // ==========================================
    // 🟢 NAYA ADD KIYA: Client Dashboard Tracker Note
    // ==========================================
    // ==========================================
    // 🟢 FIXED: Client Dashboard Tracker Note
    // ==========================================
    const trackerY = 565; // Fixed Y position for Handover PDF
    doc.rect(50, trackerY, 490, 25).fill('#f8fafc'); // Light gray SaaS box
    doc.fillColor('#475569').font('Helvetica-Bold').fontSize(9)
        .text(' Track Order History & Download Certificates at:', 60, trackerY + 8);
    doc.fillColor('#3b82f6').font('Helvetica-Bold').fontSize(9)
        .text('vibespheremedia.in/dashboard', 330, trackerY + 8);
    doc.image(qrImage, 50, 600, { width: 70 });
    doc.font('Helvetica-Bold').fontSize(10).fillColor('#0f172a').text('Scan to Verify', 50, 675, { width: 70, align: 'center' });
    doc.font('Helvetica').fontSize(8).fillColor('#3b82f6').text('vibespheremedia.in/verify', 50, 688, { width: 70, align: 'center' });

    const signX = 380;
    const signY = 590;

    try {
        doc.save();
        doc.translate(signX + 60, signY + 70); doc.rotate(-(6 + Math.random() * 5));
        const stampBlue = '#1d4ed8';
        doc.fillOpacity(0.85).strokeOpacity(0.85);
        doc.roundedRect(-75, -25, 150, 50, 4).lineWidth(2).strokeColor(stampBlue).stroke();
        doc.roundedRect(-71, -21, 142, 42, 2).lineWidth(1).strokeColor(stampBlue).stroke();
        doc.fillColor(stampBlue).font('Helvetica-Bold').fontSize(12).text('VIBESPHERE MEDIA', -75, -14, { width: 150, align: 'center' });
        doc.fillColor(stampBlue).font('Helvetica-Bold').fontSize(8).text('DELIVERED & VERIFIED', -75, 3, { width: 150, align: 'center' });
        doc.fillColor(stampBlue).font('Helvetica').fontSize(7).text(`Date: ${dDate}`, -75, 14, { width: 150, align: 'center' });
        doc.restore();
    } catch (e) { }

    doc.moveTo(50, 740).lineTo(545, 740).strokeColor('#e2e8f0').lineWidth(1).stroke();
    doc.font('Helvetica').fontSize(8).fillColor('#94a3b8').text('Thank you for trusting VibeSphere Media with your project!', 50, 750, { align: 'center', width: 495 });
    doc.end();
}
// ==========================================
// 📄 CLIENT DASHBOARD: DOWNLOAD APIS
// ==========================================

// 1. Download Invoice API
app.get('/api/download-invoice/:orderId', async (req, res) => {
    try {
        const order = await Order.findOne({ orderId: req.params.orderId });
        if (!order) return res.status(404).json({ error: "Order not found" });

        const doc = new PDFDocument({ margin: 0, size: 'A4' });
        res.setHeader('Content-disposition', `attachment; filename=Invoice_${order.orderId}.pdf`);
        res.setHeader('Content-type', 'application/pdf');
        doc.pipe(res);

        // Agar tumhara invoice function ka naam kuch aur hai toh yahan change kar lena
        if (typeof buildProfessionalInvoice === "function") {
            buildProfessionalInvoice(doc, order);
        } else {
            doc.fontSize(20).text(`VibeSphere Invoice - ${order.orderId}`, 50, 50);
            doc.end();
        }
    } catch (e) { res.status(500).json({ error: "Error generating invoice" }); }
});

// 2. Download Handover Certificate API
app.get('/api/download-handover/:orderId', async (req, res) => {
    try {
        const cert = await Handover.findOne({ orderNumber: req.params.orderId });

        if (!cert) {
            return res.status(404).json({ error: "Certificate not generated yet. Please contact support." });
        }

        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const qrImage = await QRCode.toDataURL(`${baseUrl}/verify.html?cert=${cert.certId}`);

        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        res.setHeader('Content-disposition', `attachment; filename=VibeSphere_Handover_${cert.orderNumber}.pdf`);
        res.setHeader('Content-type', 'application/pdf');
        doc.pipe(res);

        // Ye humara helper function hai jo premium design banata hai
        generatePremiumHandoverLayout(doc, cert, qrImage);
    } catch (e) {
        res.status(500).json({ error: "Error downloading Certificate" });
    }
});

// ==========================================
// 📩 PUBLIC: WEBSITE CONTACT FORM API
// ==========================================
app.post('/api/contact', async (req, res) => {
    try {
        const { name, email, phone, subject, message } = req.body;

        let mailOptions = {
            from: process.env.EMAIL_USER, // Tera verified system email (support@...)
            to: 'hello@vibespheremedia.in', // Leads is email par aayengi (Tu ise change bhi kar sakta hai)
            replyTo: email, // 🟢 PRO MOVE: Inbox me 'Reply' dabane par sidha client ko mail jayega!
            subject: `🔥 New Lead from Website: ${subject || name}`,
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                    <h2 style="color: #6c63ff;">New Website Contact Form Submission</h2>
                    <p><strong>Name:</strong> ${name}</p>
                    <p><strong>Email:</strong> ${email}</p>
                    <p><strong>Phone:</strong> ${phone || 'Not Provided'}</p>
                    <p><strong>Subject:</strong> ${subject || 'General Inquiry'}</p>
                    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 15px 0;">
                    <p><strong>Message:</strong></p>
                    <p style="background: #f8fafc; padding: 15px; border-radius: 5px;">${message}</p>
                </div>
            `
        };

        transporter.sendMail(mailOptions).catch(err => console.error('Background Email Error:', err));
        res.json({ success: true, message: "Thank you! Your message has been sent successfully." });
    } catch (error) {
        console.error("❌ Contact Form Error:", error);
        res.status(500).json({ success: false, message: "Oops! Something went wrong. Please try again." });
    }
});
// ==========================================
// 🧑‍💻 ADMIN: CLIENT MANAGEMENT APIs
// ==========================================

// 1. Get all registered clients (Users)
app.get('/api/admin/clients', checkAuth, async (req, res) => {
    try {
        console.log("Fetching clients from DB..."); // Terminal me check karne ke liye

        // Naya aur zyada safe database query
        const clients = await User.find().sort({ date: -1 }).select({ password: 0, resetOtp: 0 });

        console.log(`✅ Found ${clients.length} clients!`);
        res.json({ success: true, clients: clients });
    } catch (e) {
        console.error("❌ DB ERROR:", e);
        // Ab error direct frontend par dikhega
        res.json({ success: false, error: "Database Error: " + e.message });
    }
});
// 2. Admin Manually Resets Client Password (WITH EMAIL)
app.post('/api/admin/reset-client-password', checkAuth, async (req, res) => {
    try {
        const { userId, newPassword } = req.body;

        // Pehle user ko dhoondho taaki uska email aur naam mil sake
        const user = await User.findById(userId);
        if (!user) return res.json({ success: false, error: "User not found!" });

        // Naya temporary password encrypt karo aur save karo
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
        await user.save();

        // 📧 Client ko Email Bhejo
        let mailOptions = {
            from: process.env.EMAIL_USER,
            to: user.email,
            subject: "🔑 Your Account Password has been Reset - VibeSphere Media",
            html: `
                <div style="font-family: 'Poppins', sans-serif; background-color: #f8fafc; padding: 40px 20px;">
                    <div style="max-width: 500px; margin: 0 auto; background-color: #ffffff; padding: 40px 30px; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.05); text-align: center; border-top: 5px solid #f59e0b;">
                        <h2 style="color: #1e293b; margin-top: 0; font-size: 24px;">VibeSphere<span style="color: #6c63ff;">.</span></h2>
                        <h3 style="color: #475569; font-size: 16px; margin-bottom: 20px;">Security Update</h3>
                        <p style="color: #334155; font-size: 15px; text-align: left;">Hi <strong>${user.name}</strong>,</p>
                        <p style="color: #475569; font-size: 15px; text-align: left;">Your account password has been successfully reset by the VibeSphere Admin team.</p>
                        <div style="margin: 30px 0; padding: 20px; background: #fffbeb; border: 1px dashed #f59e0b; border-radius: 8px;">
                            <p style="margin: 0 0 5px 0; font-size: 13px; color: #d97706; text-transform: uppercase; font-weight: bold;">Your Temporary Password</p>
                            <h2 style="margin: 0; color: #b45309; font-size: 26px; letter-spacing: 2px;">${newPassword}</h2>
                        </div>
                        <p style="color: #dc2626; font-size: 13px; font-weight: bold;">⚠️ Please login and change this password immediately from your dashboard settings.</p>
                        <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 25px 0;">
                        <p style="color: #94a3b8; font-size: 12px; margin: 0;">&copy; ${new Date().getFullYear()} VibeSphere Media. Secure Alerts.</p>
                    </div>
                </div>
            `
        };
        transporter.sendMail(mailOptions).catch(err => console.error('Email Error:', err));

        res.json({ success: true, message: `Password updated & email sent to ${user.email}!` });
    } catch (e) {
        res.status(500).json({ success: false, error: "Failed to reset password" });
    }
});

// 3. Delete Client Permanently
app.delete('/api/admin/delete-client/:id', checkAuth, async (req, res) => {
    try {
        await User.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: "User deleted permanently." });
    } catch (e) { res.status(500).json({ success: false, error: "Delete failed" }); }
});


// 4. Ban or Unban Client (INBOX-FRIENDLY & SPAM SAFE)
app.post('/api/admin/toggle-ban-client', checkAuth, async (req, res) => {
    try {
        const { userId, isBanned } = req.body;

        // User ko dhoondho
        const user = await User.findById(userId);
        if (!user) return res.json({ success: false, error: "User not found!" });

        // Status update karo
        user.isBanned = isBanned;
        await user.save();

        // 🟢 NAYA FIX: Aggressive words ("Banned", "Suspended", "Violation") hata diye
        // 🟢 Laal (Red) rang ko hata kar Soft Orange (Alert) aur Green kar diya
        let subjectText = isBanned ? "Action Required: Account Status Update - VibeSphere" : "✅ Account Access Restored - VibeSphere";
        let topBorderColor = isBanned ? "#f59e0b" : "#10b981"; // Yellow/Orange instead of aggressive Red

        let messageBody = isBanned
            ? `<p style="color: #475569; font-size: 15px; text-align: left;">This is an automated notification regarding your VibeSphere Media account.</p>
               <div style="margin: 25px 0; padding: 15px; background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; color: #b45309; font-weight: bold; text-align: center;">Account Status: Access Restricted</div>
               <p style="color: #475569; font-size: 14px; text-align: left;">Your account access has been temporarily restricted following a system review. If you believe this is an error or need further assistance, please reply to this email to connect with our support team.</p>`

            : `<p style="color: #475569; font-size: 15px; text-align: left;">Good news! Your VibeSphere Media account access has been successfully <strong>Restored</strong>.</p>
               <div style="margin: 25px 0; padding: 15px; background: #d1fae5; border-radius: 8px; color: #059669; font-weight: bold; text-align: center;">Account Status: Active</div>
               <p style="color: #475569; font-size: 14px; text-align: left;">You can now log in to your dashboard and resume your activities. Welcome back!</p>`;

        let mailOptions = {
            from: process.env.EMAIL_USER,
            to: user.email,
            subject: subjectText,
            html: `
                <div style="font-family: 'Poppins', sans-serif; background-color: #f8fafc; padding: 40px 20px;">
                    <div style="max-width: 500px; margin: 0 auto; background-color: #ffffff; padding: 40px 30px; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.05); text-align: left; border-top: 5px solid ${topBorderColor};">
                        <h2 style="color: #1e293b; margin-top: 0; font-size: 24px;">VibeSphere<span style="color: #6c63ff;">.</span></h2>
                        <h3 style="color: #475569; font-size: 16px; margin-bottom: 20px;">Security Notice</h3>
                        <p style="color: #334155; font-size: 15px; text-align: left;">Hi <strong>${user.name}</strong>,</p>
                        ${messageBody}
                        <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 25px 0;">
                        <p style="color: #94a3b8; font-size: 12px; margin: 0; text-align: center;">&copy; ${new Date().getFullYear()} VibeSphere Media. Need help? Reply to this email.</p>
                    </div>
                </div>
            `
        };
        transporter.sendMail(mailOptions).catch(err => console.error('Email Error:', err));

        res.json({ success: true, message: isBanned ? "User Restricted & Notified 🚫" : "User Restored & Notified ✅" });
    } catch (e) { res.status(500).json({ success: false, error: "Status update failed" }); }
});

// ==========================================
// 🟢 THE WHATSAPP ENGINE (BAILEYS) - VERSION 405 FIX
// ==========================================
let waSocket = null;

async function connectToWhatsApp() {
    // 🟢 1. NAYA FIX: WhatsApp ka ekdum latest version fetch karo
    const { version, isLatest } = await fetchLatestBaileysVersion();
    console.log(`📡 Fetching Latest WhatsApp Version: v${version.join('.')} (Latest: ${isLatest})`);

    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');

    const sock = makeWASocket({
        version, // 🟢 2. NAYA FIX: Version attach kar diya
        logger: pino({ level: 'silent' }),
        auth: state,
        browser: ['VibeSphere Media', 'Chrome', '1.0.0'],
    });

    waSocket = sock;

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            qrcode.toString(qr, { type: 'terminal', small: true }, function (err, url) {
                if (err) console.log("QR Error:", err);
                console.log("\n📲 SCAN THIS QR CODE WITH YOUR WHATSAPP LINKED DEVICES:");
                console.log(url);
            });
        }

        if (connection === 'close') {
            const statusCode = lastDisconnect.error?.output?.statusCode;
            const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

            console.log(`⚠️ WhatsApp Connection closed. Reason: ${statusCode}`);

            if (shouldReconnect) {
                console.log("🔄 Reconnecting in 3 seconds...");
                setTimeout(connectToWhatsApp, 3000);
            } else {
                console.log('🚨 Logged out! Please delete "auth_info_baileys" folder and restart.');
            }
        } else if (connection === 'open') {
            console.log('✅ BOOM! WHATSAPP CONNECTED SUCCESSFULLY!');

            // 🟢 NAYA FIX: WhatsApp ko sync karne ke liye 5 second ka time do
            setTimeout(async () => {
                try {
                    console.log("📨 Sending Test Message...");
                    const myNumber = "918302485826@s.whatsapp.net"; // Tera number

                    await waSocket.sendMessage(myNumber, {
                        text: "🚀 VibeSphere WhatsApp API is LIVE!\n\nYeh message direct tere Node.js server se aaya hai. Tu sach mein ek Indie Hacker ban chuka hai! 😎"
                    });

                    console.log("✅ Test Message Delivered!");
                } catch (err) {
                    console.log("❌ Failed to send test message:", err.message);
                }
            }, 5000); // 5 seconds delay
        }

    });

    sock.ev.on('creds.update', saveCreds);
}


// connectToWhatsApp(); 
// --- 404 Handler (UPDATED) ---
app.use((req, res, next) => {
    // Agar API route nahi hai, toh 404 page dikhao
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
        res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
    } else {
        // Agar API route galat hai toh JSON error do
        res.status(404).json({ error: "API Route Not Found" });
    }
});


server.listen(PORT, () => {
    console.log(`🚀 Live Server Running on http://localhost:${PORT}`);

    // 🟢 Migration: Fix double-prefixed meetings (Background)
    (async () => {
        try {
            const Meeting = mongoose.model('Meeting');
            // Find meetings with double prefix OR uppercase letters in the room part
            const meetings = await Meeting.find({
                $or: [
                    { roomName: /vpaas-magic-cookie-vpaas-magic-cookie-/ },
                    { roomName: /[A-Z]/ } // Anything with uppercase
                ]
            });
            if (meetings.length > 0) {
                console.log(`🛠️ Fixing ${meetings.length} legacy broken meeting links...`);
                for (const m of meetings) {
                    // Fix double prefix AND ensure lowercase
                    let fixed = m.roomName.replace('vpaas-magic-cookie-vpaas-magic-cookie-', 'vpaas-magic-cookie-');
                    fixed = fixed.toLowerCase();

                    if (m.roomName !== fixed) {
                        m.roomName = fixed;
                        await m.save();
                    }
                }
                console.log("✅ Room names migration complete.");
            }
        } catch (e) {
            console.error('Migration error:', e.message);
        }
    })();
});
