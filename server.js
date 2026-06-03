try {
    require('dotenv').config();
} catch (e) {
    console.warn("⚠️ dotenv module not found. Falling back to system environment variables.");
}

if (!process.env.JWT_SECRET) {
    throw new Error("FATAL ERROR: JWT_SECRET is not defined in environment variables.");
}

if (!process.env.ADMIN_PASSWORD) {
    throw new Error("FATAL ERROR: ADMIN_PASSWORD is not defined in environment variables.");
}

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
let puppeteerLib = null;
try {
    puppeteerLib = require('puppeteer');
} catch (e) {
    try {
        puppeteerLib = require('puppeteer-core');
    } catch (innerError) {
        puppeteerLib = null;
    }
}

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

// Cloudinary Upload Helper (For PDFs and Platform Logos)
async function uploadToCloudinary(fileBuffer, originalName, mimeType) {
    return new Promise((resolve, reject) => {
        const isImage = (mimeType && mimeType.startsWith('image/')) || /\.(png|jpg|jpeg|gif|svg|webp)$/i.test(originalName);

        let options = {
            folder: 'vibesphere-chat',
            public_id: `${Date.now()}_${originalName.replace(/\.[^/.]+$/, "")}`
        };

        if (isImage) {
            options.resource_type = 'image';
            options.format = 'png';
            options.allowed_formats = ['png', 'svg', 'webp'];
            options.allowedFormats = ['png', 'svg', 'webp'];
            options.transformation = [
                { background: 'transparent' }
            ];
        } else {
            options.resource_type = 'raw';
        }

        const stream = cloudinary.uploader.upload_stream(
            options,
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
    socket.on('join_room', async (email) => {
        socket.join(email);
        let role = 'Client';
        if (email === 'Admin') {
            role = 'Admin';
        } else {
            try {
                const isStaff = await mongoose.model('Staff').findOne({ email }).select('_id').lean();
                if (isStaff) role = 'Staff';
            } catch (err) {
                // Fallback to Client
            }
        }
        console.log(`🟢 ${role} Live: ${email}`);
    });

    // 🟢 TEAM CHAT ROOM JOIN HANDLER
    socket.on('join_team_room', () => {
        socket.join('admin_team_room');
        console.log(`🟢 Socket joined admin_team_room: ${socket.id}`);
    });

    socket.on('join_admin_room', () => {
        socket.join('admin_room');
        console.log(`🟢 Socket joined admin_room: ${socket.id}`);
    });

    // 🎧 LIVE SUPPORT CHAT SOCKET HANDLERS
    socket.on('join_support_room', async ({ ticketId, email, name, role }) => {
        socket.join(`support_ticket_${ticketId}`);
        try {
            const ticket = await Ticket.findById(ticketId);
            if (role === 'Admin' || !email) {
                if (ticket && ticket.isLiveChat) {
                    io.to(`support_ticket_${ticketId}`).emit('support_agent_joined', { agentName: 'Admin Support', agentEmail: 'admin@vibesphere.in' });
                }
                console.log(`💬 Agent joined chat via join_support_room: support_ticket_${ticketId}`);
            } else {
                io.to('Admin').emit('support_client_waiting', { ticketId, email, name });
                console.log(`💬 Client ${name} (${email}) waiting/joining live chat: support_ticket_${ticketId}`);
            }
        } catch (err) {
            console.error("Error in join_support_room socket handler:", err);
        }
    });

    socket.on('support_agent_join', async ({ ticketId, agentEmail, agentName }) => {
        socket.join(`support_ticket_${ticketId}`);
        try {
            const ticket = await Ticket.findById(ticketId);
            if (ticket && ticket.isLiveChat) {
                io.to(`support_ticket_${ticketId}`).emit('support_agent_joined', { agentName, agentEmail });
            }
            console.log(`💬 Agent ${agentName} joined chat: support_ticket_${ticketId}`);
        } catch (err) {
            console.error("Error in support_agent_join socket handler:", err);
        }
    });

    socket.on('support_send_msg', async ({ ticketId, text, sender }) => {
        try {
            const ticket = await Ticket.findById(ticketId);
            const createdAt = new Date();
            if (ticket) {
                ticket.replies.push({ sender, text, message: text, createdAt, date: createdAt });
                ticket.status = 'Pending';
                await ticket.save();
            }
            socket.broadcast.to(`support_ticket_${ticketId}`).emit('support_receive_msg', { sender, text, ticketId: String(ticketId), createdAt });
        } catch (err) {
            console.error("Error saving support chat message:", err);
        }
    });

    socket.on('support_close_chat', async ({ ticketId, userType }) => {
        try {
            const ticket = await Ticket.findById(ticketId);
            if (ticket) {
                ticket.chatActive = false;
                if (ticket.isLiveChat) {
                    const msg = `*Live chat session ended. Ticket remains open for processing.*`;
                    ticket.replies.push({
                        sender: 'System',
                        text: msg,
                        message: msg,
                        createdAt: new Date(),
                        date: new Date()
                    });
                }
                await ticket.save();
            }
            if (ticket && ticket.isLiveChat) {
                io.to(`support_ticket_${ticketId}`).emit('support_chat_terminated', { ticketId, userType: userType || 'System' });
                io.to(`support_ticket_${ticketId}`).emit('support_chat_closed');
            }
        } catch (err) {
            console.error("Error in support_close_chat:", err);
        }
    });

    // 🟢 CHAT MESSAGE ENGINE (TEAM CHAT)
    socket.on('team_send_msg', async (data) => {
        try {
            const settings = await AppSettings.findOne();
            if (settings && settings.isChatBlocked && data.role !== 'Admin') {
                return socket.emit('team_chat_error', "Admin has blocked the team chat.");
            }

            if (data.role !== 'Admin') {
                const staff = await Staff.findOne({ email: data.senderEmail });
                if (staff && staff.isMuted) {
                    return socket.emit('team_chat_error', "You have been muted by Admin.");
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
                profilePhoto: data.profilePhoto || '',
                replyTo: data.replyTo ? {
                    messageId: data.replyTo.messageId || null,
                    senderName: data.replyTo.senderName || '',
                    previewText: data.replyTo.previewText || ''
                } : undefined
            });
            await newMessage.save();

            io.to('admin_team_room').emit('team_receive_msg', newMessage); // Restrict to admin_team_room
        } catch (e) {
            console.error("Chat Socket Error:", e);
        }
    });
});
const PORT = process.env.PORT || 3000;
const rateLimit = require('express-rate-limit'); // 
const corsOptions = {
    origin: function (origin, callback) {
        // Allow any origin (same-origin, mobile apps, cross-origin browsers).
        // Must be a function (not `true`) when credentials: true is set,
        // otherwise browsers reject the preflight.
        callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    optionsSuccessStatus: 200 // Avoid 204 which some browsers mishandle
};
// Apply CORS globally (handles all regular requests)
app.use(cors(corsOptions));
// Explicitly handle OPTIONS preflight for EVERY route using the SAME config
// This is required so browsers get Access-Control-Allow-Credentials: true on preflight
app.options('*', cors(corsOptions));
app.use(cookieParser());


// ==========================================
// 🛡️ AUTHENTICATION MIDDLEWARE
// ==========================================
async function checkAuth(req, res, next) {
    const token = req.cookies?.token;
    if (!token) return res.status(401).json({ error: "Access Denied. Please login." });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // If the token belongs to an Admin, pass through immediately (they don't exist in the User DB)
        if (['Admin', 'SuperAdmin', 'SubAdmin'].includes(decoded.role)) {
            req.user = { 
                role: decoded.role,
                adminId: decoded.adminId,
                name: decoded.name,
                email: decoded.email,
                permissions: decoded.permissions || {}
            };
            return next();
        }

        // Find user and attach to request for regular clients
        const user = await User.findOne({ email: decoded.email }).select('-password');
        if (!user) return res.status(401).json({ error: "User session not found." });

        if (user.isBanned) return res.status(403).json({ error: "Account restricted." });

        req.user = user;
        next();
    } catch (err) {
        res.status(401).json({ error: "Invalid or expired session" });
    }
}

async function checkAdmin(req, res, next) {
    if (!req.user || !['Admin', 'SuperAdmin', 'SubAdmin'].includes(req.user.role)) {
        return res.status(403).json({ success: false, message: 'Access Denied: Admins only.' });
    }
    next();
}

async function checkSuperAdmin(req, res, next) {
    // Treat legacy 'Admin' as 'SuperAdmin' until tokens expire
    if (!req.user || !['Admin', 'SuperAdmin'].includes(req.user.role)) {
        return res.status(403).json({ success: false, message: 'Access Denied: Super Admin only.' });
    }
    next();
}

function requirePermission(perm) {
    return (req, res, next) => {
        if (!req.user) return res.status(403).json({ success: false, message: 'Access Denied.' });
        if (req.user.role === 'SuperAdmin' || req.user.role === 'Admin') return next();
        if (req.user.role === 'SubAdmin' && req.user.permissions && req.user.permissions[perm]) return next();
        return res.status(403).json({ success: false, message: `Access Denied: Requires '${perm}' permission.` });
    };
}

app.use('/api/admin/*', checkAuth, checkAdmin);

// ==========================================
// 🛡️ API-LEVEL RBAC PERMISSION GATES
// ==========================================
app.use('/api/admin/staff*', requirePermission('staff'));
app.use('/api/admin/leaves*', requirePermission('staff'));
app.use('/api/admin/attendance*', requirePermission('staff'));
app.use('/api/admin/payout-requests*', requirePermission('staff'));
app.use('/api/admin/document-approvals*', requirePermission('staff'));
app.use('/api/admin/bounty-tasks*', requirePermission('staff'));
app.use('/api/admin/notices*', requirePermission('staff'));
app.use('/api/admin/finance*', requirePermission('finance'));
app.use('/api/admin/gateways*', requirePermission('finance'));
app.use('/api/admin/expenses*', requirePermission('finance'));
app.use('/api/admin/orders*', requirePermission('orders'));
app.use('/api/admin/packages*', requirePermission('commerce'));
app.use('/api/admin/services*', requirePermission('commerce'));
app.use('/api/admin/coupons*', requirePermission('commerce'));
app.use('/api/admin/smm*', requirePermission('smm'));
app.use('/api/admin/refills*', requirePermission('smm'));
app.use('/api/admin/reviews*', requirePermission('content'));
app.use('/api/admin/blogs*', requirePermission('content'));
app.use('/api/admin/resources*', requirePermission('content'));
app.use('/api/admin/handovers*', requirePermission('content'));
app.use('/api/admin/clients*', requirePermission('clients'));
app.use('/api/admin/tickets*', requirePermission('helpdesk'));
app.use('/api/admin/staff-tickets*', requirePermission('helpdesk'));
app.use('/api/admin/meetings*', requirePermission('clients'));

async function optionalAuth(req, _res, next) {
    const token = req.cookies?.token;
    req.user = null;

    if (!token) return next();

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Keep admin payload lightweight for optional context use.
        if (['Admin', 'SuperAdmin', 'SubAdmin'].includes(decoded.role)) {
            req.user = { 
                role: decoded.role,
                adminId: decoded.adminId,
                name: decoded.name,
                permissions: decoded.permissions || {}
            };
            return next();
        }

        const user = await User.findOne({ email: decoded.email }).select('-password').lean();
        if (user && !user.isBanned) {
            req.user = user;
        }
    } catch (_err) {
        // For optional auth flows, ignore invalid/expired tokens and continue as guest.
        req.user = null;
    }

    next();
}

async function checkStaffSession(req, res, next) {
    const authHeader = String(req.headers.authorization || '');
    const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    const token = bearerToken || req.cookies?.token;

    if (!token) {
        return res.status(401).json({ success: false, message: 'No active staff session.' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (decoded.role !== 'Staff') {
            return res.status(403).json({ success: false, message: 'Staff access required.' });
        }

        const staff = await Staff.findOne({ email: decoded.email }).select('-password');

        if (!staff) {
            return res.status(401).json({ success: false, message: 'Staff session not found.' });
        }

        req.staff = staff;
        next();
    } catch (err) {
        res.status(401).json({ success: false, message: 'Invalid or expired staff session.' });
    }
}

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function formatINR(value) {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 2
    }).format(Number(value || 0));
}

function formatHoursMinutesFromMs(ms) {
    const safeMs = Math.max(0, Number(ms || 0));
    const totalMinutes = Math.floor(safeMs / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}h ${minutes}m`;
}

function resolveMonthYear(monthInput, yearInput) {
    const nowIST = getISTNow();
    const month = Math.min(12, Math.max(1, Number(monthInput) || (nowIST.getMonth() + 1)));
    const year = Number(yearInput) || nowIST.getFullYear();
    return { month, year };
}

function buildMonthRegex(month, year) {
    const prefix = `${year}-${String(month).padStart(2, '0')}`;
    return new RegExp(`^${prefix}`);
}

function getMonthLabel(month, year) {
    return new Date(year, month - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

async function launchHtmlPdfBrowser() {
    if (!puppeteerLib) {
        throw new Error('Puppeteer not installed. Add "puppeteer" (or "puppeteer-core") to dependencies.');
    }

    const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH
        || process.env.CHROME_BIN
        || process.env.GOOGLE_CHROME_BIN;

    const launchOptions = {
        headless: process.env.PUPPETEER_HEADLESS === 'false' ? false : true,
        ignoreHTTPSErrors: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--no-zygote',
            '--single-process'
        ]
    };

    if (executablePath) {
        launchOptions.executablePath = executablePath;
    }

    return puppeteerLib.launch(launchOptions);
}

async function renderHtmlToPdfBuffer(html, pdfOptions = {}) {
    let browser;
    try {
        browser = await launchHtmlPdfBrowser();
        const page = await browser.newPage();
        await page.setViewport({ width: 1240, height: 1754, deviceScaleFactor: 1 });
        await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await page.evaluate(async () => {
            if (document.fonts?.ready) {
                try {
                    await document.fonts.ready;
                } catch (_) { }
            }
        });
        await page.emulateMediaType('screen');

        return await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: { top: '16mm', right: '14mm', bottom: '16mm', left: '14mm' },
            ...pdfOptions
        });
    } finally {
        if (browser) {
            try {
                await browser.close();
            } catch (closeErr) {
                console.error('Failed to close Puppeteer browser:', closeErr.message);
            }
        }
    }
}

function parseTokenFromRequest(req) {
    const token = req.cookies?.token;
    if (!token) return null;
    try {
        return jwt.verify(token, process.env.JWT_SECRET);
    } catch (e) {
        return null;
    }
}

function calculateMonthAttendanceSummary(attendanceList) {
    let presentDays = 0;
    let absentDays = 0;
    let leaveDays = 0;
    let totalWorkingMs = 0;
    let totalBreakMs = 0;

    for (const rec of attendanceList) {
        const status = rec.status || 'Present';
        if (status === 'Absent') absentDays += 1;
        else if (status === 'Leave') leaveDays += 1;
        else presentDays += 1;

        const metrics = calculateAttendanceMetrics(rec, new Date());
        totalWorkingMs += rec.checkOutTime ? Number(rec.totalWorkingMs || 0) : metrics.netWorkingMs;
        totalBreakMs += metrics.totalBreakMs;
    }

    return { presentDays, absentDays, leaveDays, totalWorkingMs, totalBreakMs };
}

async function getMonthlyAttendanceRecords(staffEmail, month, year) {
    const monthRegex = buildMonthRegex(month, year);
    return Attendance.find({
        staffEmail,
        dateString: { $regex: monthRegex }
    }).sort({ dateString: 1 }).lean();
}

function toAttendanceReportRows(records) {
    return records.map((rec) => {
        const metrics = calculateAttendanceMetrics(rec, new Date());
        const netMs = rec.checkOutTime ? Number(rec.totalWorkingMs || 0) : metrics.netWorkingMs;

        return {
            date: rec.dateString || '-',
            checkIn: rec.checkInTime ? new Date(rec.checkInTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '-',
            checkOut: rec.checkOutTime ? new Date(rec.checkOutTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '-',
            breakTime: formatHoursMinutesFromMs(metrics.totalBreakMs),
            workTime: formatHoursMinutesFromMs(netMs),
            status: rec.status || 'Present'
        };
    });
}

const DOC_TYPE_MAP = {
    attendance: 'AttendanceReport',
    attendancereport: 'AttendanceReport',
    payslip: 'Payslip'
};

const BRAND_LOGO_PATH = path.join(__dirname, 'logo.png');
const BRAND_SIGNATURE_PATH = path.join(__dirname, 'signature.png');

function normalizeDocumentType(input) {
    const key = String(input || '').toLowerCase().replace(/[^a-z]/g, '');
    return DOC_TYPE_MAP[key] || null;
}

function monthRegexString(month, year) {
    return `^${year}-${String(month).padStart(2, '0')}`;
}

function escapeRegex(value = '') {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function parsePositiveInt(value, fallback) {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function normalizeStaffRoleInput(value) {
    const rawRoles = Array.isArray(value) ? value : String(value || '').split(',');
    const uniqueRoles = [];

    rawRoles.forEach((role) => {
        const cleaned = String(role || '').trim().replace(/\s+/g, ' ');
        if (!cleaned) return;
        if (uniqueRoles.some((existing) => existing.toLowerCase() === cleaned.toLowerCase())) return;
        uniqueRoles.push(cleaned);
    });

    return uniqueRoles.join(', ') || 'Staff';
}

function parseOrderDateValue(value) {
    if (!value) return null;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed;
}

async function getMonthlyApprovedCommissionSummary(staffEmail, month, year) {
    const normalizedEmail = String(staffEmail || '').trim().toLowerCase();
    const [orders, bountyTasks] = await Promise.all([
        Order.find({
            assignedStaff: normalizedEmail,
            workStatus: 'Completed',
            commissionValue: { $gt: 0 }
        })
            .select('orderId customerName package date commissionValue')
            .lean(),
        StaffBountyTask.find({
            assignedStaffEmail: normalizedEmail,
            status: 'Approved',
            bountyAmount: { $gt: 0 }
        })
            .select('_id title approvedAt updatedAt createdAt bountyAmount')
            .lean()
    ]);

    const orderRows = orders.map((order) => {
        const orderDate = parseOrderDateValue(order.date);
        if (!orderDate) return null;
        if (orderDate.getMonth() + 1 !== month || orderDate.getFullYear() !== year) return null;

        return {
            orderId: order.orderId || 'NA',
            clientName: order.customerName || 'Client',
            packageName: order.package || 'Task',
            date: orderDate,
            commission: Number(order.commissionValue || 0)
        };
    }).filter(Boolean);

    const bountyRows = bountyTasks.map((task) => {
        const approvedDate = parseOrderDateValue(task.approvedAt || task.updatedAt || task.createdAt);
        if (!approvedDate) return null;
        if (approvedDate.getMonth() + 1 !== month || approvedDate.getFullYear() !== year) return null;

        return {
            orderId: `BT-${String(task._id || '').slice(-6).toUpperCase() || 'TASK'}`,
            clientName: 'Internal Task Bounty',
            packageName: task.title || 'Bounty Task',
            date: approvedDate,
            commission: Number(task.bountyAmount || 0)
        };
    }).filter(Boolean);

    const rows = [...orderRows, ...bountyRows].sort((a, b) => a.date - b.date);

    return {
        rows: rows.map((row) => ({
            ...row,
            dateLabel: row.date.toLocaleDateString('en-IN')
        })),
        approvedTaskCount: rows.length,
        totalCommission: rows.reduce((sum, row) => sum + Number(row.commission || 0), 0)
    };
}

async function getDocumentApprovalStatus(staffEmail, documentType, month, year) {
    const doc = await DocumentApproval.findOne({ staffEmail, documentType, month, year }).lean();
    return doc?.approvalStatus || 'Unverified';
}

async function createAttendanceReportPdf(staff, month, year, approvalStatusOverride) {
    const records = await getMonthlyAttendanceRecords(staff.email, month, year);
    const summary = calculateMonthAttendanceSummary(records);
    const rows = toAttendanceReportRows(records);
    const monthLabel = getMonthLabel(month, year);
    const approvalStatus = approvalStatusOverride ?? await getDocumentApprovalStatus(staff.email, 'AttendanceReport', month, year);
    const generatedAt = new Date().toLocaleString('en-IN');
    const html = buildAttendanceReportHtml({ staff, monthLabel, summary, rows, generatedAt, approvalStatus });
    const pdfBuffer = await renderHtmlToPdfBuffer(html);

    return {
        pdfBuffer,
        fileName: `Attendance_Report_${staff.empId || 'STAFF'}_${year}-${String(month).padStart(2, '0')}.pdf`
    };
}

async function createPayslipPdf(staff, month, year, options = {}) {
    const [records, payoutData] = await Promise.all([
        getMonthlyAttendanceRecords(staff.email, month, year),
        getMonthlyApprovedCommissionSummary(staff.email, month, year)
    ]);
    const summary = calculateMonthAttendanceSummary(records);

    const monthLabel = getMonthLabel(month, year);
    const approvalStatus = options.approvalStatus ?? await getDocumentApprovalStatus(staff.email, 'Payslip', month, year);
    const generatedAt = new Date().toLocaleString('en-IN');
    const html = buildPayslipHtml({ staff, monthLabel, summary, payoutData, generatedAt, approvalStatus });
    const pdfBuffer = await renderHtmlToPdfBuffer(html);

    return {
        pdfBuffer,
        fileName: `Payslip_${staff.empId || 'STAFF'}_${year}-${String(month).padStart(2, '0')}.pdf`
    };
}

function safeDrawImage(doc, imagePath, x, y, options = {}) {
    try {
        if (fs.existsSync(imagePath)) {
            doc.image(imagePath, x, y, options);
            return true;
        }
    } catch (e) {
        console.error(`Image draw failed (${imagePath}):`, e.message);
    }
    return false;
}

function drawDocumentHeader(doc, title, monthLabel, staff) {
    doc.rect(0, 0, 595, 120).fill('#f8fafc');
    const hasLogo = safeDrawImage(doc, BRAND_LOGO_PATH, 40, 26, { width: 140 });

    if (!hasLogo) {
        doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(20).text('VibeSphere Media', 40, 40);
    }

    doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(20).text(title, 320, 28, { width: 235, align: 'right' });
    doc.fillColor('#475569').font('Helvetica').fontSize(10)
        .text(`Period: ${monthLabel}`, 320, 58, { width: 235, align: 'right' })
        .text(`Generated: ${new Date().toLocaleString('en-IN')}`, 320, 72, { width: 235, align: 'right' });

    doc.moveTo(40, 118).lineTo(555, 118).lineWidth(1).strokeColor('#e2e8f0').stroke();

    doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(11)
        .text(`Name: ${staff.name || '-'}`, 40, 132)
        .text(`Employee ID: ${staff.empId || '-'}`, 40, 148)
        .text(`Email: ${staff.email || '-'}`, 40, 164);
}

function drawApprovalSignatureBlock(doc, approvalStatus) {
    const y = 730;
    const approved = approvalStatus === 'Approved';

    if (approved) {
        doc.roundedRect(40, y - 22, 115, 22, 6).fill('#dcfce7');
        doc.fillColor('#166534').font('Helvetica-Bold').fontSize(10).text('VERIFIED ✓', 52, y - 16);
    } else {
        doc.roundedRect(40, y - 22, 130, 22, 6).fill('#fee2e2');
        doc.fillColor('#b91c1c').font('Helvetica-Bold').fontSize(10).text('NOT VERIFIED', 52, y - 16);
    }

    if (approved) {
        const drawn = safeDrawImage(doc, BRAND_SIGNATURE_PATH, 400, y - 45, { width: 130 });
        if (!drawn) {
            doc.fillColor('#166534').font('Helvetica-Bold').fontSize(11).text('Harsh Panwar', 410, y - 12);
        }
    }

    doc.strokeColor('#94a3b8').moveTo(380, y).lineTo(540, y).lineWidth(1).stroke();
    doc.fillColor('#334155').font('Helvetica').fontSize(9)
        .text('Authorized Signatory', 380, y + 5, { width: 160, align: 'center' })
        .text('VibeSphere Media', 380, y + 18, { width: 160, align: 'center' });
}

function streamAttendanceReportPdf(res, payload) {
    const { staff, monthLabel, summary, rows, fileName, approvalStatus } = payload;
    const doc = new PDFDocument({ margin: 40, size: 'A4' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
    doc.pipe(res);

    drawDocumentHeader(doc, 'Attendance Report', monthLabel, staff);

    doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(11);
    doc.text(`Present Days: ${summary.presentDays}`, 40, 194);
    doc.text(`Absent Days: ${summary.absentDays}`, 180, 194);
    doc.text(`Leave Days: ${summary.leaveDays}`, 320, 194);
    doc.text(`Net Work: ${formatHoursMinutesFromMs(summary.totalWorkingMs)}`, 430, 194, { width: 125, align: 'right' });

    const startY = 225;
    const cols = [40, 125, 195, 265, 335, 410, 485];
    doc.rect(40, startY, 515, 22).fill('#0f172a');
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(9)
        .text('Date', cols[0] + 6, startY + 7)
        .text('Check-In', cols[1] + 6, startY + 7)
        .text('Check-Out', cols[2] + 6, startY + 7)
        .text('Break', cols[3] + 6, startY + 7)
        .text('Net Work', cols[4] + 6, startY + 7)
        .text('Status', cols[5] + 6, startY + 7);

    let y = startY + 22;
    const lines = rows.length ? rows : [{ date: '-', checkIn: '-', checkOut: '-', breakTime: '-', workTime: '-', status: 'No Data' }];
    lines.forEach((row, idx) => {
        if (y > 680) return;
        if (idx % 2 === 0) doc.rect(40, y, 515, 21).fill('#f8fafc');
        doc.fillColor('#0f172a').font('Helvetica').fontSize(9)
            .text(row.date, cols[0] + 6, y + 6)
            .text(row.checkIn, cols[1] + 6, y + 6)
            .text(row.checkOut, cols[2] + 6, y + 6)
            .text(row.breakTime, cols[3] + 6, y + 6)
            .text(row.workTime, cols[4] + 6, y + 6)
            .text(row.status, cols[5] + 6, y + 6);
        y += 21;
    });

    drawApprovalSignatureBlock(doc, approvalStatus);
    doc.end();
}

function streamPayslipPdf(res, payload) {
    const { staff, monthLabel, summary, payoutData, fileName, approvalStatus } = payload;
    const doc = new PDFDocument({ margin: 40, size: 'A4' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
    doc.pipe(res);

    drawDocumentHeader(doc, 'Task Payout Slip', monthLabel, staff);

    doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(11)
        .text(`Present: ${summary.presentDays}`, 40, 194)
        .text(`Absent: ${summary.absentDays}`, 160, 194)
        .text(`Leave: ${summary.leaveDays}`, 260, 194)
        .text(`Net Work: ${formatHoursMinutesFromMs(summary.totalWorkingMs)}`, 380, 194, { width: 175, align: 'right' });

    doc.rect(40, 225, 515, 22).fill('#0f172a');
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(10)
        .text('Date', 48, 232)
        .text('Ref ID', 128, 232)
        .text('Context', 220, 232)
        .text('Task', 360, 232)
        .text('Payout', 470, 232, { width: 75, align: 'right' });

    const lines = payoutData.rows.length ? payoutData.rows : [{
        dateLabel: '-',
        orderId: '-',
        clientName: 'No approved task payouts for this month',
        packageName: '-',
        commission: 0
    }];

    let y = 247;
    lines.forEach((item, idx) => {
        if (y > 640) return;
        if (idx % 2 === 0) doc.rect(40, y, 515, 22).fill('#f8fafc');
        doc.fillColor('#0f172a').font('Helvetica').fontSize(9)
            .text(item.dateLabel, 48, y + 7, { width: 70 })
            .text(item.orderId, 128, y + 7, { width: 82 })
            .text(item.clientName, 220, y + 7, { width: 130 })
            .text(item.packageName, 360, y + 7, { width: 95 })
            .text(formatINR(item.commission), 470, y + 7, { width: 75, align: 'right' });
        y += 22;
    });

    doc.roundedRect(40, 670, 245, 58, 8).fill('#eef2ff');
    doc.roundedRect(310, 670, 245, 58, 8).fill('#dcfce7');
    doc.fillColor('#3730a3').font('Helvetica-Bold').fontSize(10).text('Approved Items', 52, 686)
        .fontSize(16).text(String(payoutData.approvedTaskCount || 0), 52, 702);
    doc.fillColor('#166534').font('Helvetica-Bold').fontSize(10).text('Total Approved Payout', 322, 686)
        .fontSize(16).text(formatINR(payoutData.totalCommission || 0), 322, 702);

    drawApprovalSignatureBlock(doc, approvalStatus);
    doc.end();
}

function buildPdfShellStyles() {
    return `
        <style>
            :root {
                --ink: #0f172a;
                --muted: #475569;
                --line: #dbe3ee;
                --sheet: #ffffff;
                --brand: #0f766e;
                --brand-soft: #ecfeff;
                --accent: #0369a1;
                --danger: #b91c1c;
                --ok: #166534;
            }
            * { box-sizing: border-box; }
            body {
                margin: 0;
                font-family: "Segoe UI", "Avenir Next", "Helvetica Neue", Arial, sans-serif;
                color: var(--ink);
                background: radial-gradient(circle at top right, #d1fae5, #f8fafc 35%, #f1f5f9);
            }
            .page {
                background: var(--sheet);
                border: 1px solid var(--line);
                border-radius: 14px;
                overflow: hidden;
                position: relative;
            }
            .watermark {
                position: absolute;
                right: -20px;
                top: 42%;
                transform: rotate(-90deg);
                font-size: 36px;
                letter-spacing: 6px;
                color: rgba(15, 23, 42, 0.06);
                font-weight: 700;
            }
            .head {
                padding: 20px 24px;
                background: linear-gradient(120deg, #0f172a, #0f766e);
                color: #fff;
                display: flex;
                justify-content: space-between;
                gap: 12px;
                align-items: flex-start;
            }
            .company {
                max-width: 62%;
            }
            .company h1 {
                margin: 0;
                font-size: 22px;
                letter-spacing: 0.3px;
            }
            .company p, .meta p {
                margin: 4px 0;
                font-size: 12px;
                opacity: 0.95;
                line-height: 1.45;
            }
            .meta {
                text-align: right;
            }
            .title {
                padding: 16px 24px 10px;
            }
            .title h2 {
                margin: 0;
                color: var(--ink);
                font-size: 20px;
                letter-spacing: 0.2px;
            }
            .title .subtitle {
                margin-top: 5px;
                font-size: 12px;
                color: var(--muted);
            }
            .grid {
                display: grid;
                grid-template-columns: repeat(4, minmax(0, 1fr));
                gap: 10px;
                padding: 0 24px 14px;
            }
            .card {
                border: 1px solid var(--line);
                border-radius: 10px;
                background: #fff;
                padding: 10px 12px;
            }
            .card .label {
                color: var(--muted);
                font-size: 11px;
                margin-bottom: 5px;
            }
            .card .value {
                font-size: 16px;
                font-weight: 700;
            }
            .section {
                padding: 0 24px 16px;
            }
            table {
                width: 100%;
                border-collapse: collapse;
                font-size: 11px;
                border: 1px solid var(--line);
                border-radius: 10px;
                overflow: hidden;
            }
            thead th {
                text-align: left;
                padding: 10px;
                font-weight: 700;
                color: #fff;
                background: linear-gradient(120deg, #0f172a, #155e75);
            }
            tbody td {
                padding: 8px 10px;
                border-top: 1px solid #edf2f7;
            }
            tbody tr:nth-child(even) { background: #f8fafc; }
            .pill {
                display: inline-block;
                border-radius: 999px;
                padding: 3px 8px;
                font-weight: 700;
                font-size: 10px;
            }
            .p-present { background: #dcfce7; color: var(--ok); }
            .p-absent { background: #fee2e2; color: var(--danger); }
            .p-leave { background: #e0e7ff; color: #3730a3; }
            .foot {
                margin: 10px 24px 20px;
                border-top: 1px dashed var(--line);
                padding-top: 10px;
                display: flex;
                justify-content: space-between;
                align-items: flex-end;
                gap: 10px;
            }
            .foot .note {
                color: var(--muted);
                font-size: 11px;
                line-height: 1.45;
                max-width: 68%;
            }
            .sign {
                text-align: right;
                min-width: 180px;
            }
            .sign .line {
                margin-top: 28px;
                border-top: 1px solid #94a3b8;
                width: 180px;
                margin-left: auto;
                padding-top: 5px;
                font-size: 10px;
                color: #334155;
            }
        </style>
    `;
}

function getHtmlImageSrc(localFileName, envUrlKey) {
    try {
        const localPath = path.join(__dirname, localFileName);
        if (fs.existsSync(localPath)) {
            const base64 = fs.readFileSync(localPath).toString('base64');
            const extension = path.extname(localPath).toLowerCase();
            const mimeType = extension === '.jpg' || extension === '.jpeg'
                ? 'image/jpeg'
                : extension === '.webp'
                    ? 'image/webp'
                    : extension === '.svg'
                        ? 'image/svg+xml'
                        : extension === '.gif'
                            ? 'image/gif'
                            : 'image/png';
            return `data:${mimeType};base64,${base64}`;
        }
    } catch (e) {
        console.error(`Asset read failed for ${localFileName}:`, e.message);
    }
    return process.env[envUrlKey] || '';
}

function getStaffVerificationUrl(empId, req) {
    if (!empId) {
        return '';
    }

    const requestBaseUrl = req
        ? `${req.headers['x-forwarded-proto'] || req.protocol || 'https'}://${req.get('host') || 'vibespheremedia.in'}`
        : '';

    const configuredBaseUrl =
        process.env.PUBLIC_BASE_URL ||
        process.env.SITE_URL ||
        process.env.APP_URL ||
        process.env.CLIENT_URL ||
        process.env.SERVER_URL ||
        requestBaseUrl ||
        'https://vibespheremedia.in';

    const normalizedBaseUrl = String(configuredBaseUrl)
        .replace(/\/api\/?$/, '')
        .replace(/\/$/, '');

    return `${normalizedBaseUrl}/verify-staff?id=${encodeURIComponent(String(empId).trim().toUpperCase())}`;
}

function getOnboardingIconSvg(iconName) {
    const iconMap = {
        dashboard: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="4.5" width="17" height="15" rx="3"></rect><path d="M9 4.5v15"></path><path d="M3.5 10.5H9"></path><path d="M13 9h4"></path><path d="M13 13h4"></path><path d="M13 17h3"></path></svg>',
        tasks: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M9 4h6"></path><path d="M10 2.5h4a1.5 1.5 0 0 1 1.5 1.5v1H8.5V4A1.5 1.5 0 0 1 10 2.5Z"></path><path d="M7 5h10a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z"></path><path d="m8.5 13 2.2 2.2L15.8 10"></path></svg>',
        attendance: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8"></circle><path d="M12 7.5v5l3 1.8"></path><path d="M9 2.8h6"></path></svg>',
        wallet: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H18a2 2 0 0 1 2 2v2.5H4v-2Z"></path><path d="M4 9.5h16v7A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5v-7Z"></path><path d="M16 13.5h2.5"></path></svg>',
        leave: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="5" width="16" height="15" rx="3"></rect><path d="M8 3.5v3"></path><path d="M16 3.5v3"></path><path d="M4 9.5h16"></path><path d="m9 14 1.8 1.8L15.5 11"></path></svg>',
        chat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M5 16.5V6.8A2.8 2.8 0 0 1 7.8 4h8.4A2.8 2.8 0 0 1 19 6.8v5.4A2.8 2.8 0 0 1 16.2 15H9.7L5 19v-2.5Z"></path><path d="M8.5 8.5h7"></path><path d="M8.5 11.5h4.5"></path></svg>',
        support: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13a7 7 0 1 1 14 0"></path><path d="M5 13v3.2A1.8 1.8 0 0 0 6.8 18H8v-6H6.8A1.8 1.8 0 0 0 5 13Z"></path><path d="M19 13v3.2a1.8 1.8 0 0 1-1.8 1.8H16v-6h1.2A1.8 1.8 0 0 1 19 13Z"></path><path d="M12 20h2"></path></svg>',
        knowledge: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 5.5A2.5 2.5 0 0 1 7 3h11v15.5a2.5 2.5 0 0 0-2.5-2.5H4.5Z"></path><path d="M7 3v13a2.5 2.5 0 0 0-2.5 2.5"></path><path d="M10 7h5"></path><path d="M10 10.5h5"></path></svg>',
        briefcase: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="6.5" width="17" height="12" rx="3"></rect><path d="M9 6V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1"></path><path d="M3.5 11.5h17"></path></svg>',
        shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3.5 18.5 6v5.6c0 4.2-2.7 7.8-6.5 8.9-3.8-1.1-6.5-4.7-6.5-8.9V6L12 3.5Z"></path><path d="m9.3 12.2 1.8 1.8 3.8-4.1"></path></svg>'
    };

    return iconMap[iconName] || iconMap.dashboard;
}

function buildOnboardingDocumentStyles() {
    return `
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Lato:wght@400;700;900&family=Montserrat:wght@500;600;700;800&display=swap" rel="stylesheet">
        <style>
            @page { margin: 0; }
            :root {
                --navy: #16233B;
                --accent: #4E7BFF;
                --accent-soft: #EDF3FF;
                --paper: #FFFFFF;
                --paper-soft: #F8FBFF;
                --line: #DDE6F2;
                --text: #142033;
                --muted: #6D7788;
                --muted-deep: #425466;
            }
            * { box-sizing: border-box; }
            body {
                margin: 0;
                font-family: 'Lato', Arial, sans-serif;
                color: var(--text);
                background: linear-gradient(180deg, #E9F2FF 0%, #F5F9FF 34%, #FFFFFF 100%);
            }
            .doc-shell { padding: 22px; }
            .doc-card {
                position: relative;
                overflow: hidden;
                background: rgba(255, 255, 255, 0.96);
                border: 1px solid rgba(148, 163, 184, 0.18);
                border-radius: 30px;
                box-shadow: 0 24px 60px rgba(15, 23, 42, 0.12);
            }
            .doc-card::before {
                content: '';
                position: absolute;
                top: -70px;
                left: -70px;
                width: 230px;
                height: 230px;
                border-radius: 50%;
                background: radial-gradient(circle, rgba(78, 123, 255, 0.16) 0%, transparent 72%);
            }
            .doc-card::after {
                content: '';
                position: absolute;
                top: -80px;
                right: -70px;
                width: 230px;
                height: 230px;
                border-radius: 50%;
                background: radial-gradient(circle, rgba(22, 35, 59, 0.09) 0%, transparent 72%);
            }
            .doc-inner {
                position: relative;
                padding: 34px 36px 32px;
            }
            .doc-header {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                gap: 24px;
                padding-bottom: 26px;
                border-bottom: 1px solid var(--line);
            }
            .brand-block {
                display: flex;
                align-items: center;
                gap: 16px;
                max-width: 64%;
            }
            .logo-frame {
                width: 72px;
                height: 72px;
                border-radius: 22px;
                background: linear-gradient(135deg, #16233B 0%, #4E7BFF 100%);
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.18);
                overflow: hidden;
                flex-shrink: 0;
            }
            .logo-frame img {
                width: 100%;
                height: 100%;
                object-fit: contain;
                padding: 10px;
            }
            .logo-fallback {
                color: #FFFFFF;
                font-family: 'Montserrat', Arial, sans-serif;
                font-size: 26px;
                font-weight: 800;
                letter-spacing: -1px;
            }
            .brand-title {
                margin: 0;
                font-family: 'Montserrat', Arial, sans-serif;
                font-size: 28px;
                font-weight: 800;
                color: var(--navy);
                letter-spacing: -0.03em;
            }
            .brand-subtitle {
                margin: 6px 0 0;
                font-size: 12px;
                font-weight: 700;
                letter-spacing: 0.18em;
                text-transform: uppercase;
                color: var(--muted);
            }
            .brand-meta {
                margin: 8px 0 0;
                font-size: 13px;
                line-height: 1.55;
                color: #64748B;
            }
            .doc-header-meta {
                min-width: 200px;
                text-align: right;
            }
            .doc-chip {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                border: 1px solid rgba(78, 123, 255, 0.18);
                border-radius: 999px;
                padding: 8px 14px;
                font-size: 12px;
                font-weight: 700;
                color: var(--accent);
                background: var(--accent-soft);
            }
            .doc-header-label {
                margin-top: 14px;
                font-size: 12px;
                color: #64748B;
            }
            .doc-header-value {
                margin-top: 4px;
                font-size: 14px;
                font-weight: 700;
                color: var(--navy);
            }
            .doc-header-hint {
                margin-top: 6px;
                font-size: 12px;
                line-height: 1.55;
                color: #64748B;
            }
            .doc-title {
                margin: 28px 0 10px;
                font-family: 'Montserrat', Arial, sans-serif;
                font-size: 30px;
                line-height: 1.08;
                color: var(--navy);
                letter-spacing: -0.04em;
            }
            .doc-subtitle {
                margin: 0 0 24px;
                font-size: 14px;
                line-height: 1.72;
                color: #526071;
            }
            .doc-grid { display: grid; gap: 18px; }
            .two-col { grid-template-columns: 1.15fr 0.85fr; align-items: start; }
            .section-card {
                background: linear-gradient(180deg, #FFFFFF 0%, #F9FBFF 100%);
                border: 1px solid var(--line);
                border-radius: 24px;
                padding: 22px 24px;
                box-shadow: 0 10px 24px rgba(15, 23, 42, 0.05);
                break-inside: avoid;
            }
            .section-card h2 {
                margin: 0 0 12px;
                font-family: 'Montserrat', Arial, sans-serif;
                font-size: 18px;
                color: var(--navy);
                letter-spacing: -0.02em;
            }
            .section-card h3 {
                margin: 0 0 8px;
                font-family: 'Montserrat', Arial, sans-serif;
                font-size: 15px;
                color: var(--navy);
            }
            .section-card p {
                margin: 0 0 12px;
                font-size: 14px;
                line-height: 1.75;
                color: #334155;
            }
            .section-card ul {
                margin: 0;
                padding-left: 18px;
                color: #334155;
            }
            .section-card li {
                margin: 0 0 9px;
                font-size: 13px;
                line-height: 1.6;
            }
            .meta-grid {
                display: grid;
                grid-template-columns: repeat(2, minmax(0, 1fr));
                gap: 12px;
            }
            .meta-card {
                padding: 14px 16px;
                border-radius: 18px;
                background: #F8FAFC;
                border: 1px solid var(--line);
            }
            .meta-card .label {
                margin-bottom: 6px;
                font-size: 11px;
                font-weight: 700;
                letter-spacing: 0.12em;
                text-transform: uppercase;
                color: var(--muted);
            }
            .meta-card .value {
                font-size: 14px;
                font-weight: 700;
                line-height: 1.5;
                color: var(--navy);
                word-break: break-word;
            }
            .note-band {
                display: flex;
                align-items: flex-start;
                gap: 14px;
                padding: 18px 20px;
                margin: 0 0 20px;
                border-radius: 20px;
                background: linear-gradient(135deg, #EFF6FF 0%, #F8FAFC 100%);
                border: 1px solid #D7E6FF;
            }
            .note-band .icon-wrap {
                width: 42px;
                height: 42px;
                border-radius: 14px;
                display: flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
                background: #FFFFFF;
                color: var(--accent);
                box-shadow: 0 10px 18px rgba(78, 123, 255, 0.12);
            }
            .note-band .icon-wrap svg,
            .guide-icon svg { width: 22px; height: 22px; }
            .note-band strong {
                display: block;
                margin-bottom: 4px;
                font-family: 'Montserrat', Arial, sans-serif;
                font-size: 15px;
                color: var(--navy);
            }
            .note-band span {
                display: block;
                font-size: 13px;
                line-height: 1.65;
                color: #4B5563;
            }
            .id-card-showcase {
                position: relative;
                min-height: 292px;
                padding: 24px;
                border-radius: 28px;
                background: linear-gradient(145deg, #16233B 0%, #203759 42%, #4E7BFF 100%);
                color: #FFFFFF;
                overflow: hidden;
                box-shadow: 0 20px 38px rgba(15, 23, 42, 0.18);
                break-inside: avoid;
            }
            .id-card-showcase::before {
                content: '';
                position: absolute;
                right: -28px;
                bottom: -60px;
                width: 230px;
                height: 230px;
                border-radius: 50%;
                background: radial-gradient(circle, rgba(255, 255, 255, 0.16) 0%, transparent 72%);
            }
            .id-card-top {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                gap: 12px;
                margin-bottom: 24px;
            }
            .id-brand {
                display: flex;
                align-items: center;
                gap: 12px;
            }
            .id-brand-mark {
                width: 44px;
                height: 44px;
                border-radius: 16px;
                display: flex;
                align-items: center;
                justify-content: center;
                background: rgba(255, 255, 255, 0.12);
                border: 1px solid rgba(255, 255, 255, 0.18);
                font-family: 'Montserrat', Arial, sans-serif;
                font-size: 16px;
                font-weight: 800;
            }
            .id-brand-copy .title {
                margin: 0;
                font-family: 'Montserrat', Arial, sans-serif;
                font-size: 18px;
                font-weight: 800;
                letter-spacing: -0.03em;
            }
            .id-brand-copy .sub {
                margin: 4px 0 0;
                font-size: 11px;
                letter-spacing: 0.18em;
                text-transform: uppercase;
                color: rgba(255, 255, 255, 0.72);
            }
            .id-pill {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                padding: 8px 12px;
                border-radius: 999px;
                background: rgba(255, 255, 255, 0.12);
                border: 1px solid rgba(255, 255, 255, 0.16);
                font-size: 11px;
                font-weight: 700;
            }
            .id-card-main {
                display: flex;
                align-items: center;
                gap: 18px;
            }
            .id-avatar {
                width: 96px;
                height: 96px;
                border-radius: 50%;
                background: rgba(255, 255, 255, 0.12);
                border: 3px solid rgba(255, 255, 255, 0.18);
                display: flex;
                align-items: center;
                justify-content: center;
                overflow: hidden;
                flex-shrink: 0;
            }
            .id-avatar img {
                width: 100%;
                height: 100%;
                object-fit: cover;
            }
            .id-avatar span {
                font-family: 'Montserrat', Arial, sans-serif;
                font-size: 28px;
                font-weight: 800;
                letter-spacing: -1px;
            }
            .id-identity h3 {
                margin: 0 0 4px;
                font-family: 'Montserrat', Arial, sans-serif;
                font-size: 24px;
                line-height: 1.1;
            }
            .id-identity p {
                margin: 0 0 14px;
                font-size: 14px;
                color: rgba(255, 255, 255, 0.78);
            }
            .id-chip-row {
                display: flex;
                flex-wrap: wrap;
                gap: 10px;
            }
            .id-chip {
                display: inline-flex;
                align-items: center;
                gap: 8px;
                padding: 9px 12px;
                border-radius: 999px;
                background: rgba(255, 255, 255, 0.11);
                border: 1px solid rgba(255, 255, 255, 0.16);
                font-size: 12px;
                font-weight: 700;
            }
            .id-footer {
                display: flex;
                justify-content: space-between;
                align-items: flex-end;
                gap: 16px;
                margin-top: 24px;
                padding-top: 18px;
                border-top: 1px solid rgba(255, 255, 255, 0.16);
            }
            .id-footer small {
                display: block;
                margin-bottom: 6px;
                font-size: 10px;
                letter-spacing: 0.16em;
                text-transform: uppercase;
                color: rgba(255, 255, 255, 0.62);
            }
            .id-footer strong {
                font-size: 13px;
                line-height: 1.5;
            }
            .id-qr {
                width: 72px;
                height: 72px;
                border-radius: 20px;
                background: rgba(255, 255, 255, 0.96);
                color: var(--navy);
                display: grid;
                place-items: center;
                font-family: 'Montserrat', Arial, sans-serif;
                font-size: 10px;
                font-weight: 800;
                letter-spacing: 0.18em;
            }
            .guide-grid {
                display: grid;
                grid-template-columns: repeat(2, minmax(0, 1fr));
                gap: 16px;
            }
            .guide-card {
                break-inside: avoid;
                background: linear-gradient(180deg, #FFFFFF 0%, #F8FBFF 100%);
                border: 1px solid var(--line);
                border-radius: 22px;
                padding: 18px;
                box-shadow: 0 10px 22px rgba(15, 23, 42, 0.05);
            }
            .guide-head {
                display: flex;
                gap: 12px;
                align-items: flex-start;
                margin-bottom: 10px;
            }
            .guide-icon {
                width: 42px;
                height: 42px;
                border-radius: 14px;
                display: flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
                background: linear-gradient(135deg, #EDF3FF 0%, #FFFFFF 100%);
                border: 1px solid #D5E2F7;
                color: var(--accent);
            }
            .guide-card h3 {
                margin: 2px 0 4px;
                font-family: 'Montserrat', Arial, sans-serif;
                font-size: 16px;
                color: var(--navy);
            }
            .guide-card p {
                margin: 0 0 12px;
                font-size: 13px;
                line-height: 1.7;
                color: var(--muted-deep);
            }
            .guide-card ul {
                margin: 0;
                padding-left: 18px;
            }
            .guide-card li {
                margin: 0 0 7px;
                font-size: 12px;
                line-height: 1.6;
                color: var(--muted-deep);
            }
            .credentials-strip {
                display: grid;
                grid-template-columns: repeat(3, minmax(0, 1fr));
                gap: 12px;
                margin: 18px 0 24px;
            }
            .credentials-box {
                padding: 14px 16px;
                border-radius: 18px;
                background: linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%);
                border: 1px solid var(--line);
            }
            .credentials-box .label {
                margin-bottom: 6px;
                font-size: 11px;
                font-weight: 700;
                letter-spacing: 0.1em;
                text-transform: uppercase;
                color: var(--muted);
            }
            .credentials-box .value {
                font-size: 13px;
                font-weight: 700;
                line-height: 1.6;
                color: var(--navy);
                word-break: break-word;
            }
            .credentials-box .mono {
                font-family: 'SFMono-Regular', 'Consolas', 'Liberation Mono', monospace;
            }
            .doc-footer {
                display: flex;
                justify-content: space-between;
                align-items: flex-end;
                gap: 16px;
                margin-top: 26px;
                padding-top: 18px;
                border-top: 1px solid var(--line);
                font-size: 12px;
                color: #64748B;
            }
            .doc-footer strong {
                display: block;
                margin-bottom: 4px;
                color: var(--navy);
            }
            .signature-block { padding-top: 12px; }
            .signature-name {
                font-family: 'Montserrat', Arial, sans-serif;
                font-size: 15px;
                font-weight: 700;
                color: var(--navy);
            }
            .signature-role {
                margin-top: 4px;
                font-size: 12px;
                color: #64748B;
            }
            .muted { color: #64748B; }
        </style>
    `;
}

function buildOnboardingBrandLockupHtml() {
    const logoSrc = getHtmlImageSrc(path.join('public', 'logo.webp'), 'VIBESPHERE_LOGO_URL');

    return logoSrc
        ? `<div class="logo-frame"><img src="${logoSrc}" alt="VibeSphere Logo"></div>`
        : `<div class="logo-frame"><span class="logo-fallback">VS</span></div>`;
}

function buildOnboardingDocumentShell({
    badgeLabel,
    title,
    subtitle,
    issuedOn,
    headerHint,
    bodyHtml,
    footerTitle,
    footerText,
    signName,
    signRole
}) {
    const safeBadgeLabel = escapeHtml(badgeLabel || 'Onboarding Document');
    const safeTitle = escapeHtml(title || 'VibeSphere Document');
    const safeSubtitle = escapeHtml(subtitle || '');
    const safeIssuedOn = escapeHtml(issuedOn || '');
    const safeHeaderHint = escapeHtml(headerHint || '');
    const safeFooterTitle = escapeHtml(footerTitle || 'VibeSphere Media');
    const safeFooterText = escapeHtml(footerText || '');
    const safeSignName = escapeHtml(signName || 'People & Culture');
    const safeSignRole = escapeHtml(signRole || 'VibeSphere Media Pvt. Ltd.');

    return `<!DOCTYPE html>
<html lang="en">
<head>
    ${buildOnboardingDocumentStyles()}
</head>
<body>
    <div class="doc-shell">
        <div class="doc-card">
            <div class="doc-inner">
                <div class="doc-header">
                    <div class="brand-block">
                        ${buildOnboardingBrandLockupHtml()}
                        <div>
                            <h1 class="brand-title">VibeSphere Media</h1>
                            <div class="brand-subtitle">People, Performance, Precision</div>
                            <div class="brand-meta">Official onboarding communication from the VibeSphere People &amp; Culture desk.</div>
                        </div>
                    </div>
                    <div class="doc-header-meta">
                        <div class="doc-chip">${safeBadgeLabel}</div>
                        <div class="doc-header-label">Issued on</div>
                        <div class="doc-header-value">${safeIssuedOn}</div>
                        <div class="doc-header-hint">${safeHeaderHint}</div>
                    </div>
                </div>

                <h2 class="doc-title">${safeTitle}</h2>
                <p class="doc-subtitle">${safeSubtitle}</p>

                ${bodyHtml}

                <div class="doc-footer">
                    <div>
                        <strong>${safeFooterTitle}</strong>
                        <div>${safeFooterText}</div>
                    </div>
                    <div class="signature-block">
                        <div class="signature-name">${safeSignName}</div>
                        <div class="signature-role">${safeSignRole}</div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</body>
</html>`;
}

function getOnboardingRoleProfile(role) {
    const normalizedRole = String(role || '').toLowerCase();

    if (/(sales|business|lead|growth|closing|executive)/.test(normalizedRole)) {
        return {
            mission: 'Drive qualified opportunities through the staff CRM, maintain disciplined follow-ups, and convert conversations into measurable revenue outcomes.',
            responsibilities: [
                'Maintain accurate client records, follow-up notes, and lead stages inside the dashboard throughout the day.',
                'Respond to assigned leads promptly, qualify needs clearly, and escalate warm opportunities without delay.',
                'Submit bounty or project work on time with supporting links, context, and clean handover notes.',
                'Coordinate with management on monthly targets, conversion pacing, and blockers that impact performance.'
            ],
            successMarkers: [
                'Consistent follow-up cadence with complete notes',
                'Timely closure updates for every active lead',
                'Professional communication across calls, chat, and email',
                'Reliable use of the wallet, payout, and attendance workflows'
            ]
        };
    }

    if (/(support|crm|helpdesk|customer|service)/.test(normalizedRole)) {
        return {
            mission: 'Deliver calm, structured, and timely client support while keeping tickets, responses, and follow-up commitments visible in the CRM.',
            responsibilities: [
                'Review assigned client tickets, confirm issue scope, and provide clear updates through the support workflow.',
                'Document every client interaction with accurate notes, status changes, and next steps for internal visibility.',
                'Escalate technical, billing, or service-critical issues to the correct owner before timelines are affected.',
                'Protect service quality by keeping communication professional, empathetic, and policy aligned at all times.'
            ],
            successMarkers: [
                'Fast first-response time on active tickets',
                'Clean ticket histories with actionable notes',
                'Clear escalation judgment and ownership discipline',
                'Consistent use of team chat and knowledge-base references'
            ]
        };
    }

    if (/(developer|engineer|web|app|tech|it|software)/.test(normalizedRole)) {
        return {
            mission: 'Build and maintain dependable digital deliverables while coordinating progress, revisions, and delivery updates through the internal workspace.',
            responsibilities: [
                'Own assigned deliverables from intake through handover with clear milestone visibility and practical communication.',
                'Maintain quality, testing discipline, and version control hygiene across ongoing technical work.',
                'Submit work links, revision notes, and completion status inside the staff dashboard so approvals remain traceable.',
                'Flag technical risks early and collaborate with project stakeholders before timelines drift.'
            ],
            successMarkers: [
                'Stable delivery quality with low rework',
                'Transparent progress reporting and handoffs',
                'Disciplined documentation of blockers and revisions',
                'Reliable coordination across chat, helpdesk, and approval workflows'
            ]
        };
    }

    if (/(designer|editor|video|content|social|marketing|creative)/.test(normalizedRole)) {
        return {
            mission: 'Create brand-aligned creative output with consistent quality, fast turnaround, and clean visibility for approvals and revisions.',
            responsibilities: [
                'Translate campaign or client briefs into polished creative deliverables that meet brand and performance standards.',
                'Maintain version clarity by uploading review-ready links, revision notes, and final assets through the dashboard.',
                'Coordinate with leads, support staff, and managers to keep timelines, feedback, and approvals synchronized.',
                'Protect quality by checking copy, structure, and asset readiness before every submission.'
            ],
            successMarkers: [
                'Consistent creative quality and brand alignment',
                'Fast revision response with organized submissions',
                'Clear asset naming, notes, and delivery hygiene',
                'Reliable collaboration using team chat and knowledge resources'
            ]
        };
    }

    if (/(hr|people|admin|operations|manager|coordinator)/.test(normalizedRole)) {
        return {
            mission: 'Keep staff operations organized, timely, and professionally documented so onboarding, approvals, and daily execution remain dependable.',
            responsibilities: [
                'Maintain accurate staff records, process updates, and workflow visibility across core operational systems.',
                'Coordinate approvals, escalations, and internal communication with strong attention to timing and completeness.',
                'Support staff through structured guidance on attendance, leaves, documents, and internal processes.',
                'Uphold confidentiality, process discipline, and professional communication across every internal touchpoint.'
            ],
            successMarkers: [
                'Orderly records and dependable follow-through',
                'Accurate coordination across approvals and staff requests',
                'Calm handling of sensitive or urgent issues',
                'Strong process compliance across the staff dashboard ecosystem'
            ]
        };
    }

    return {
        mission: 'Contribute dependable, professional work that supports the VibeSphere delivery team and keeps internal operations visible, timely, and well documented.',
        responsibilities: [
            'Execute assigned work with ownership, communication clarity, and respect for delivery timelines.',
            'Use the staff dashboard to maintain current status, submissions, approvals, and daily work records.',
            'Collaborate professionally with team members, share blockers early, and respond to feedback constructively.',
            'Represent the company well in all internal and external communication while following policy and process.'
        ],
        successMarkers: [
            'Reliable daily execution and status visibility',
            'Accurate use of the staff systems and tools',
            'Professional communication and teamwork',
            'Timely escalation of blockers or dependencies'
        ]
    };
}

function buildOnboardingGuideCard({ icon, title, body, bullets = [] }) {
    const safeTitle = escapeHtml(title || '');
    const safeBody = escapeHtml(body || '');

    return `
        <div class="guide-card">
            <div class="guide-head">
                <div class="guide-icon">${getOnboardingIconSvg(icon)}</div>
                <div>
                    <h3>${safeTitle}</h3>
                </div>
            </div>
            <p>${safeBody}</p>
            <ul>
                ${bullets.map((bullet) => `<li>${escapeHtml(bullet)}</li>`).join('')}
            </ul>
        </div>
    `;
}

function buildJoiningLetterHtml({
    staffName,
    staffRole,
    staffEmail,
    staffEmpId,
    joinDate
}) {
    const safeStaffName = escapeHtml(staffName || 'Team Member');
    const safeStaffRole = escapeHtml(staffRole || 'Staff');
    const safeStaffEmail = escapeHtml(staffEmail || 'staff@vibespheremedia.in');
    const safeStaffEmpId = escapeHtml(staffEmpId || 'VS-0000');
    const safeJoinDate = escapeHtml(joinDate || '');

    const bodyHtml = `
        <div class="doc-grid">
            <div class="section-card">
                <h2>Letter of Appointment</h2>
                <p>Dear <strong>${safeStaffName}</strong>,</p>
                <p>We are pleased to formally welcome you to <strong>VibeSphere Media</strong>. Following the completion of the selection process, you are hereby appointed to the role of <strong>${safeStaffRole}</strong> with effect from <strong>${safeJoinDate}</strong>.</p>
                <p>Your appointment reflects our confidence in your capability, professionalism, and potential contribution to the team. You are expected to carry out your responsibilities with diligence, integrity, and alignment with company policies, reporting instructions, and operational standards.</p>
                <p>Please treat this document as your official joining communication and retain it for your records.</p>
            </div>

            <div class="section-card">
                <h2>Appointment Details</h2>
                <div class="meta-grid" style="margin-top:18px;">
                    <div class="meta-card">
                        <div class="label">Employee Name</div>
                        <div class="value">${safeStaffName}</div>
                    </div>
                    <div class="meta-card">
                        <div class="label">Designation</div>
                        <div class="value">${safeStaffRole}</div>
                    </div>
                    <div class="meta-card">
                        <div class="label">Employee ID</div>
                        <div class="value">${safeStaffEmpId}</div>
                    </div>
                    <div class="meta-card">
                        <div class="label">Official Email</div>
                        <div class="value">${safeStaffEmail}</div>
                    </div>
                </div>
            </div>
        </div>

        <div class="doc-grid" style="margin-top:18px;">
            <div class="section-card">
                <h2>Joining Instructions</h2>
                <ul>
                    <li>Use your official email address for all internal communication and platform access.</li>
                    <li>Review the attached role description and welcome guide carefully before your first full working day.</li>
                    <li>Complete your first login, profile review, and dashboard orientation as part of the onboarding process.</li>
                    <li>Reach out to the People &amp; Culture desk immediately if any joining detail on this document needs correction.</li>
                </ul>
            </div>
            <div class="section-card">
                <h2>Professional Understanding</h2>
                <p>This appointment is made subject to the policies, confidentiality expectations, and performance standards communicated by VibeSphere Media. Company systems, internal resources, and client information must be handled responsibly at all times.</p>
                <p>We look forward to your contribution and wish you a successful start with the organization.</p>
            </div>
        </div>
    `;

    return buildOnboardingDocumentShell({
        badgeLabel: 'Joining Letter',
        title: 'Welcome to the VibeSphere Team',
        subtitle: 'A formal confirmation of appointment, identity setup, and joining readiness for your first working day.',
        issuedOn: joinDate,
        headerHint: `Employee ID ${staffEmpId || 'VS-0000'}`,
        bodyHtml,
        footerTitle: 'VibeSphere Media Pvt. Ltd.',
        footerText: 'This document is system generated and forms part of your official onboarding pack.',
        signName: 'People & Culture',
        signRole: 'VibeSphere Media Pvt. Ltd.'
    });
}

function buildRoleDescriptionHtml({
    staffName,
    staffRole,
    staffEmpId,
    joinDate
}) {
    const safeStaffName = escapeHtml(staffName || 'Team Member');
    const safeStaffRole = escapeHtml(staffRole || 'Staff');
    const safeStaffEmpId = escapeHtml(staffEmpId || 'VS-0000');
    const safeJoinDate = escapeHtml(joinDate || '');
    const roleProfile = getOnboardingRoleProfile(staffRole);

    const bodyHtml = `
        <div class="note-band">
            <div class="icon-wrap">${getOnboardingIconSvg('shield')}</div>
            <div>
                <strong>Role expectations and operating standards</strong>
                <span>This document outlines the role mission, day-to-day expectations, and success standards attached to the position of ${safeStaffRole}.</span>
            </div>
        </div>

        <div class="doc-grid two-col">
            <div class="section-card">
                <h2>Role Mission</h2>
                <p>Dear <strong>${safeStaffName}</strong>,</p>
                <p>You are joining VibeSphere Media as <strong>${safeStaffRole}</strong> from <strong>${safeJoinDate}</strong>. Your role exists to support dependable execution, strong collaboration, and measurable progress across the company workflow.</p>
                <p>${escapeHtml(roleProfile.mission)}</p>
                <div class="meta-grid" style="margin-top:18px;">
                    <div class="meta-card">
                        <div class="label">Assigned Role</div>
                        <div class="value">${safeStaffRole}</div>
                    </div>
                    <div class="meta-card">
                        <div class="label">Employee ID</div>
                        <div class="value">${safeStaffEmpId}</div>
                    </div>
                    <div class="meta-card">
                        <div class="label">Effective From</div>
                        <div class="value">${safeJoinDate}</div>
                    </div>
                    <div class="meta-card">
                        <div class="label">Reporting Flow</div>
                        <div class="value">Team Lead / Admin Coordination</div>
                    </div>
                </div>
            </div>

            <div class="section-card">
                <h2>Key Responsibilities</h2>
                <ul>
                    ${roleProfile.responsibilities.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}
                </ul>
            </div>
        </div>

        <div class="doc-grid" style="margin-top:18px;">
            <div class="section-card">
                <h2>Success Standards</h2>
                <ul>
                    ${roleProfile.successMarkers.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}
                </ul>
            </div>
            <div class="section-card">
                <h2>Operating Expectations</h2>
                <p>Your daily execution should remain visible through the staff dashboard, task updates, attendance records, and official approval systems. Internal tools are considered part of the work process, not optional add-ons.</p>
                <p>Professional conduct, responsiveness, confidentiality, and respectful collaboration are expected in every interaction with team members, leadership, and clients.</p>
            </div>
            <div class="section-card">
                <h2>Primary Internal Tools</h2>
                <ul>
                    <li>Staff Dashboard for task status, submissions, documents, and approvals</li>
                    <li>Attendance workspace for check-in, check-out, reports, and compliance records</li>
                    <li>Team Chat and Customer Support CRM for collaboration and issue movement</li>
                    <li>Knowledge Base for SOPs, scripts, reference links, and training material</li>
                </ul>
            </div>
        </div>
    `;

    return buildOnboardingDocumentShell({
        badgeLabel: 'Role Description',
        title: `${staffRole || 'Staff'} Responsibilities`,
        subtitle: 'A professional summary of the outcomes, accountability areas, and working standards expected in your role.',
        issuedOn: joinDate,
        headerHint: `Reference ${staffEmpId || 'VS-0000'}`,
        bodyHtml,
        footerTitle: 'Management Office',
        footerText: 'Please review this role note carefully and use it as the baseline for your ongoing responsibilities.',
        signName: 'Operations & Leadership',
        signRole: 'VibeSphere Media Pvt. Ltd.'
    });
}

function buildWelcomeGuideHtml({
    staffName,
    staffEmail,
    staffEmpId,
    joinDate
}) {
    const safeStaffName = escapeHtml(staffName || 'Team Member');
    const safeStaffEmail = escapeHtml(staffEmail || 'staff@vibespheremedia.in');
    const safeStaffEmpId = escapeHtml(staffEmpId || 'VS-0000');
    const safeJoinDate = escapeHtml(joinDate || '');
    const guideSections = [
        {
            icon: 'dashboard',
            title: 'Dashboard Widgets',
            body: 'Your home screen summarizes the numbers that matter first so you can see revenue progress, pending payouts, completed work, target movement, and active lead pressure at a glance.',
            bullets: [
                'Review earnings, wallet-ready amounts, and completed-task counts in one place.',
                'Use the target progress card to understand monthly pacing without opening separate reports.',
                'Check the lead activity snapshot before starting follow-ups so your priorities stay clear.'
            ]
        },
        {
            icon: 'tasks',
            title: 'My Tasks',
            body: 'This area is your live execution board for assigned leads and bounty work. It is where daily updates, status changes, notes, and work submissions should stay current.',
            bullets: [
                'Update task status after each meaningful follow-up so leadership can see progress without chasing updates.',
                'Use the bounty submission flow to share completed work links, revisions, and final delivery evidence.',
                'Refresh the panel regularly to catch new assignments or revision requests.'
            ]
        },
        {
            icon: 'attendance',
            title: 'Attendance',
            body: 'Attendance combines live shift actions and monthly visibility so your check-ins, break tracking, work hours, and reports remain accurate for payroll and compliance.',
            bullets: [
                'Use check-in, break, resume, and check-out controls from the dashboard toolbar.',
                'Review the calendar and list views to verify exact day-wise attendance records.',
                'Download or submit monthly attendance reports when approval or payroll documentation is required.'
            ]
        },
        {
            icon: 'wallet',
            title: 'Payouts & Wallet',
            body: 'The wallet workspace shows credited earnings, pending withdrawal requests, payout history, approvals, and payslip access in one organized financial view.',
            bullets: [
                'Track wallet balance, pending requests, and paid-out totals without manual reconciliation.',
                'Use the earnings ledger to see which task or project generated each credited amount.',
                'Open payslip and approval subtabs whenever you need formal monthly payment records.'
            ]
        },
        {
            icon: 'leave',
            title: 'Leave Application',
            body: 'This module is your official route for planned leave. Submit dates and reason once, then monitor the approval trail through the same dashboard instead of managing it over chat.',
            bullets: [
                'Enter start date, end date, and a clear reason before submitting.',
                'Review leave history to confirm approval, rejection, or pending status.',
                'Apply early whenever possible so scheduling and handovers can be managed smoothly.'
            ]
        },
        {
            icon: 'chat',
            title: 'Team Chat',
            body: 'Team Chat is the real-time communication layer for staff coordination. Use it for quick updates, internal collaboration, pinned notices, and work-context communication.',
            bullets: [
                'Send messages, attachments, and voice notes for faster team coordination.',
                'Check pinned communication and live status indicators before asking repeat questions.',
                'Keep conversations professional, brief, and relevant to execution or escalation.'
            ]
        },
        {
            icon: 'support',
            title: 'Customer Support CRM',
            body: 'The support workspace helps you review assigned client tickets, read issue context, add replies, and keep client communication moving through the correct internal process.',
            bullets: [
                'Read each ticket fully before responding so details are not missed.',
                'Use status, reply, and escalation actions carefully because they shape the client experience.',
                'Coordinate with internal teams quickly if the request involves billing, delivery, or technical dependencies.'
            ]
        },
        {
            icon: 'knowledge',
            title: 'Knowledge Base',
            body: 'The knowledge base stores the reusable information that keeps execution sharp: sales scripts, SOPs, pricing references, forms, links, and internal how-to material.',
            bullets: [
                'Search here first when you need policy, pitch, or process guidance.',
                'Use official documents and links from this section instead of relying on outdated copies.',
                'Return to this area during onboarding whenever a workflow or company term feels unfamiliar.'
            ]
        }
    ];

    const bodyHtml = `
        <div class="note-band">
            <div class="icon-wrap">${getOnboardingIconSvg('dashboard')}</div>
            <div>
                <strong>Welcome to your staff workspace</strong>
                <span>Hello ${safeStaffName}. This guide walks you through every major area of the VibeSphere Staff Dashboard so your first login feels structured, not overwhelming.</span>
            </div>
        </div>

        <div class="credentials-strip">
            <div class="credentials-box">
                <div class="label">Login Portal</div>
                <div class="value">vibespheremedia.in/staff-login.html</div>
            </div>
            <div class="credentials-box">
                <div class="label">Official Login ID</div>
                <div class="value">${safeStaffEmail}</div>
            </div>
            <div class="credentials-box">
                <div class="label">Employee Reference</div>
                <div class="value">${safeStaffEmpId}</div>
            </div>
        </div>

        <div class="section-card" style="margin-bottom:18px;">
            <h2>First Login Orientation</h2>
            <p>On your joining date of <strong>${safeJoinDate}</strong>, start by signing in with the credentials provided in your welcome email. After access is confirmed, review your dashboard widgets, verify your profile information, and understand where tasks, attendance, payouts, support items, and learning resources live.</p>
            <p>If anything looks incorrect, contact the People &amp; Culture or Admin team immediately so your account record can be corrected before routine work begins.</p>
        </div>

        <div class="guide-grid">
            ${guideSections.map((section) => buildOnboardingGuideCard(section)).join('')}
        </div>

        <div class="doc-grid" style="margin-top:18px;">
            <div class="section-card">
                <h2>Best Practices for Week One</h2>
                <ul>
                    <li>Keep your task statuses, notes, and submissions current so your work is never invisible.</li>
                    <li>Use official dashboard modules instead of informal messages for attendance, leave, payouts, and approvals.</li>
                    <li>Check the knowledge base before escalating routine process questions.</li>
                    <li>Maintain a professional tone in team chat, support replies, and all internal records.</li>
                </ul>
            </div>
        </div>
    `;

    return buildOnboardingDocumentShell({
        badgeLabel: 'Welcome Guide',
        title: 'VibeSphere Staff Dashboard Guide',
        subtitle: 'A practical walkthrough of the tools, panels, and operating flows you will use every day inside the staff ecosystem.',
        issuedOn: joinDate,
        headerHint: 'Read before your first full work cycle',
        bodyHtml,
        footerTitle: 'People & Culture Support',
        footerText: 'Use this guide as your reference during your first week and revisit it whenever you need a quick orientation.',
        signName: 'Team VibeSphere',
        signRole: 'People & Culture'
    });
}

function buildAttendanceReportHtml({ staff, monthLabel, summary, rows, generatedAt, approvalStatus }) {
    const logoSrc = getHtmlImageSrc('logo.png', 'VIBESPHERE_LOGO_URL');
    const signatureSrc = getHtmlImageSrc('signature.png', 'CEO_SIGNATURE_URL');
    const isApproved = approvalStatus === 'Approved';

    const rowHtml = rows.length ? rows.map((row) => {
        const statusKey = (row.status || 'Present').toLowerCase();
        const statusClass = statusKey === 'absent' ? 'p-absent' : (statusKey === 'leave' ? 'p-leave' : 'p-present');
        return `
            <tr>
                <td>${escapeHtml(row.date)}</td>
                <td>${escapeHtml(row.checkIn)}</td>
                <td>${escapeHtml(row.checkOut)}</td>
                <td>${escapeHtml(row.breakTime)}</td>
                <td>${escapeHtml(row.workTime)}</td>
                <td><span class="pill ${statusClass}">${escapeHtml(row.status)}</span></td>
            </tr>
        `;
    }).join('') : '<tr><td colspan="6" style="text-align:center;color:#64748b;padding:20px;">No attendance records found for this period.</td></tr>';

    return `
        <!doctype html>
        <html>
        <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width,initial-scale=1" />
            ${buildPdfShellStyles()}
        </head>
        <body>
            <div class="page">
                <div class="watermark">VIBESPHERE</div>
                <div class="head">
                    <div class="company">
                        ${logoSrc
            ? `<img src="${logoSrc}" alt="VibeSphere Media" style="width:165px;max-width:100%;height:auto;display:block;margin-bottom:8px;" />`
            : `<h1>VibeSphere Media</h1>`}
                        <p>Digital Growth, Web and Automation Studio</p>
                        <p>support@vibespheremedia.in | www.vibespheremedia.in</p>
                    </div>
                    <div class="meta">
                        <p><strong>Document:</strong> Attendance Report</p>
                        <p><strong>Period:</strong> ${escapeHtml(monthLabel)}</p>
                        <p><strong>Generated:</strong> ${escapeHtml(generatedAt)}</p>
                    </div>
                </div>

                <div class="title">
                    <h2>${escapeHtml(staff.name || 'Staff Member')} (${escapeHtml(staff.empId || 'NA')})</h2>
                    <div class="subtitle">${escapeHtml(staff.email || '')}</div>
                </div>

                <div class="grid">
                    <div class="card"><div class="label">Present Days</div><div class="value">${summary.presentDays}</div></div>
                    <div class="card"><div class="label">Absent Days</div><div class="value">${summary.absentDays}</div></div>
                    <div class="card"><div class="label">Leave Days</div><div class="value">${summary.leaveDays}</div></div>
                    <div class="card"><div class="label">Net Working Time</div><div class="value">${escapeHtml(formatHoursMinutesFromMs(summary.totalWorkingMs))}</div></div>
                </div>

                <div class="section">
                    <table>
                        <thead>
                            <tr>
                                <th style="width:16%">Date</th>
                                <th style="width:16%">Check-In</th>
                                <th style="width:16%">Check-Out</th>
                                <th style="width:16%">Break Time</th>
                                <th style="width:16%">Net Hours</th>
                                <th style="width:20%">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rowHtml}
                        </tbody>
                    </table>
                </div>

                <div class="foot">
                    <div class="note">This is a system-generated attendance summary prepared from daily check-in/check-out logs and approved attendance states.</div>
                    <div class="sign">
                        ${isApproved
            ? `<span style="color: green; font-weight: bold; font-size: 13px;">VERIFIED ✓</span>`
            : `<h3 style="color: red; margin: 0; font-size: 16px;">NOT VERIFIED</h3>`}
                        ${isApproved && signatureSrc
            ? `<div style="margin-top:8px;"><img src="${signatureSrc}" alt="Signature" style="width:140px;height:auto;" /></div>`
            : ''}
                        ${isApproved ? `<div style="font-size:12px;color:#0f172a;font-weight:700;margin-top:6px;">Harsh Panwar</div>` : ''}
                        <div class="line">Authorized Signatory | VibeSphere Media</div>
                    </div>
                </div>
            </div>
        </body>
        </html>
    `;
}

function buildPayslipHtml({ staff, monthLabel, summary, payoutData, generatedAt, approvalStatus }) {
    const logoSrc = getHtmlImageSrc('logo.png', 'VIBESPHERE_LOGO_URL');
    const signatureSrc = getHtmlImageSrc('signature.png', 'CEO_SIGNATURE_URL');
    const isApproved = approvalStatus === 'Approved';

    const payoutRows = payoutData.rows.length ? payoutData.rows.map((item) => `
        <tr>
            <td>${escapeHtml(item.dateLabel)}</td>
            <td>${escapeHtml(item.orderId)}</td>
            <td>${escapeHtml(item.clientName)}</td>
            <td>${escapeHtml(item.packageName)}</td>
            <td style="text-align:right;">${escapeHtml(formatINR(item.commission))}</td>
        </tr>
    `).join('') : `
        <tr>
            <td colspan="5" style="text-align:center;color:#64748b;padding:20px;">No approved task payouts found for this month.</td>
        </tr>
    `;

    return `
        <!doctype html>
        <html>
        <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width,initial-scale=1" />
            ${buildPdfShellStyles()}
            <style>
                .mono { font-variant-numeric: tabular-nums; }
                .section-table { padding: 0 24px 12px; }
                .totals {
                    padding: 0 24px 8px;
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 12px;
                }
                .total-card {
                    border: 1px solid var(--line);
                    border-radius: 10px;
                    background: #fff;
                    padding: 12px;
                }
                .total-card .k { font-size: 11px; color: var(--muted); }
                .total-card .v { margin-top: 4px; font-size: 20px; font-weight: 800; }
                .net { background: linear-gradient(120deg, #ecfeff, #f0fdfa); border-color: #99f6e4; }
            </style>
        </head>
        <body>
                <div class="page">
                    <div class="watermark">PAYSLIP</div>
                    <div class="head">
                    <div class="company">
                        ${logoSrc
            ? `<img src="${logoSrc}" alt="VibeSphere Media" style="width:165px;max-width:100%;height:auto;display:block;margin-bottom:8px;" />`
            : `<h1>VibeSphere Media</h1>`}
                        <p>Task-Based Payout Statement</p>
                        <p>support@vibespheremedia.in | www.vibespheremedia.in</p>
                    </div>
                    <div class="meta">
                        <p><strong>Document:</strong> Task Payout Slip</p>
                        <p><strong>Payout Month:</strong> ${escapeHtml(monthLabel)}</p>
                        <p><strong>Generated:</strong> ${escapeHtml(generatedAt)}</p>
                    </div>
                </div>

                <div class="title">
                    <h2>${escapeHtml(staff.name || 'Staff Member')} (${escapeHtml(staff.empId || 'NA')})</h2>
                    <div class="subtitle">${escapeHtml(staff.email || '')} | Role: ${escapeHtml(staff.role || 'Staff')}</div>
                </div>

                <div class="grid">
                    <div class="card"><div class="label">Present</div><div class="value">${summary.presentDays}</div></div>
                    <div class="card"><div class="label">Absent</div><div class="value">${summary.absentDays}</div></div>
                    <div class="card"><div class="label">Leave</div><div class="value">${summary.leaveDays}</div></div>
                    <div class="card"><div class="label">Net Worked</div><div class="value">${escapeHtml(formatHoursMinutesFromMs(summary.totalWorkingMs))}</div></div>
                </div>

                <div class="section-table">
                    <table class="mono">
                        <thead>
                            <tr>
                                <th style="width:14%">Date</th>
                                <th style="width:16%">Ref ID</th>
                                <th style="width:28%">Context</th>
                                <th style="width:22%">Task</th>
                                <th style="width:20%;text-align:right;">Payout</th>
                            </tr>
                        </thead>
                        <tbody>${payoutRows}</tbody>
                    </table>
                </div>

                <div class="totals">
                    <div class="total-card">
                        <div class="k">Approved Items</div>
                        <div class="v mono">${escapeHtml(String(payoutData.approvedTaskCount || 0))}</div>
                    </div>
                    <div class="total-card net">
                        <div class="k">Total Approved Payout</div>
                        <div class="v mono">${escapeHtml(formatINR(payoutData.totalCommission || 0))}</div>
                    </div>
                </div>

                <div class="foot">
                    <div class="note">This is a computer-generated payout slip. It reflects approved order commissions and approved task bounties for the selected month only.</div>
                    <div class="sign">
                        ${isApproved
            ? `<span style="color: green; font-weight: bold; font-size: 13px;">VERIFIED ✓</span>`
            : `<h3 style="color: red; margin: 0; font-size: 16px;">NOT VERIFIED</h3>`}
                        ${isApproved && signatureSrc
            ? `<div style="margin-top:8px;"><img src="${signatureSrc}" alt="Signature" style="width:140px;height:auto;" /></div>`
            : ''}
                        ${isApproved ? `<div style="font-size:12px;color:#0f172a;font-weight:700;margin-top:6px;">Harsh Panwar</div>` : ''}
                        <div class="line">Authorized Signatory | VibeSphere Media</div>
                    </div>
                </div>
            </div>
        </body>
        </html>
    `;
}

// ==========================================
// 🎨 PREMIUM INVOICE DESIGN (BUG FREE)
// ==========================================
function buildAgencyInvoice(doc, order) {
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

    // --- 4. TABLE ROWS ---
    let itemsToRender = [];
    if (order.orderItems && order.orderItems.length > 0) {
        itemsToRender = order.orderItems.map(item => {
            const name = item.name || item.title || item.packageId?.title || 'Package';
            const quantity = item.quantity || 1;
            const price = item.price || item.priceAtAdd || 0;
            const currency = item.currency || order.currency || 'INR';
            return { name, quantity, price, currency };
        });
    } else {
        const name = order.package || 'VibeSphere Digital Service';
        const quantity = order.quantity || 1;
        let priceNum = 0;
        if (order.price) {
            const cleaned = order.price.replace(/[^\d.]/g, '');
            priceNum = parseFloat(cleaned) || 0;
        }
        const currency = order.currency || (order.price && order.price.includes('$') ? 'USD' : 'INR');
        itemsToRender.push({ name, quantity, price: priceNum, currency });
    }

    let currentY = tableTop + 35;
    doc.fillColor('#333333').font('Helvetica').fontSize(10);

    for (const item of itemsToRender) {
        const descHeight = doc.heightOfString(item.name, { width: 250 });

        doc.text(item.name, 60, currentY, { width: 250, align: 'left' });
        doc.text(String(item.quantity), 330, currentY);

        const cleanCurrency = item.currency === 'INR' ? 'INR' : item.currency;
        const rateText = `${cleanCurrency} ${Number(item.price).toLocaleString()}`;
        doc.text(rateText, 400, currentY);

        const amountNum = item.quantity * item.price;
        const amountText = `${cleanCurrency} ${Number(amountNum).toLocaleString()}`;
        doc.text(amountText, 480, currentY);

        const rowHeight = Math.max(descHeight, 20);
        currentY += rowHeight + 10;

        doc.moveTo(50, currentY - 5).lineTo(540, currentY - 5).strokeColor('#e2e8f0').lineWidth(0.5).stroke();
        currentY += 10;
    }

    // --- 5. TOTAL CALCULATION ---
    const totalY = currentY + 10;

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

function buildSmmInvoice(doc, order) {
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

    // Using purple accent for SMM SMM style
    doc.fillColor('#7c3aed').font('Helvetica-Bold').fontSize(28).text('INVOICE', 380, 45, { align: 'right', width: 160 });

    // --- 2. CLIENT & INVOICE DETAILS ---
    const detailY = 185;

    // Left Side
    doc.fillColor('#000000').font('Helvetica-Bold').fontSize(11).text('Client Details', 50, detailY);
    doc.font('Helvetica').fontSize(10).fillColor('#333333')
        .text(`Name: ${order.customerName || 'Client'}`, 50, detailY + 18)
        .text(`Email: ${order.email || 'N/A'}`, 50, detailY + 33)
        .text(`Phone: ${order.phone || 'N/A'}`, 50, detailY + 48);

    // Right Side
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
    doc.rect(50, tableTop, 490, 25).fill('#7c3aed');

    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(9)
        .text('Platform', 60, tableTop + 7)
        .text('Service Type', 140, tableTop + 7)
        .text('Quantity', 220, tableTop + 7)
        .text('Target Link', 290, tableTop + 7)
        .text('Amount', 480, tableTop + 7);

    // --- 4. DATA PARSING & TABLE ROWS ---
    let currentY = tableTop + 35;

    if (order.orderItems && order.orderItems.length > 0) {
        for (const item of order.orderItems) {
            const titleText = item.title || 'SMM Service';
            let pName = 'Instagram';
            if (item.packageId && String(item.packageId).includes('_')) {
                const parts = String(item.packageId).split('_');
                pName = parts[1] ? parts[1].charAt(0).toUpperCase() + parts[1].slice(1) : 'Instagram';
            } else {
                const parts = titleText.split(' ');
                pName = parts[0] || 'Instagram';
            }

            let sType = 'SMM Boost';
            let cleanText = titleText.replace(new RegExp(`^${pName}\\s+`, 'i'), '');
            cleanText = cleanText.replace(/\s*\([^)]*\)\s*$/, ''); // Remove "(1000 units)"
            if (cleanText.trim()) sType = cleanText.trim();

            let qty = 1000;
            const qtyMatch = titleText.match(/\((\d+)\s*units\)/i);
            if (qtyMatch && qtyMatch[1]) {
                qty = Number(qtyMatch[1]);
            }

            const itemCurrency = item.currency || order.currency || 'INR';
            const cleanCurrency = itemCurrency === 'INR' ? 'INR' : itemCurrency;
            const itemPriceText = `${cleanCurrency} ${Number(item.priceAtAdd || 0).toLocaleString()}`;
            const targetLink = order.targetLink || order.instaLink || 'N/A';

            doc.fillColor('#333333').font('Helvetica').fontSize(9)
                .text(pName, 60, currentY)
                .text(sType, 140, currentY)
                .text(Number(qty).toLocaleString(), 220, currentY);

            doc.text(targetLink, 290, currentY, { width: 170, height: 35, ellipsis: true });
            doc.text(itemPriceText, 480, currentY);

            currentY += 45;
            doc.moveTo(50, currentY - 5).lineTo(540, currentY - 5).strokeColor('#e2e8f0').lineWidth(0.5).stroke();
            currentY += 10;
        }
    } else {
        let platformName = 'Instagram';
        if (order.serviceId) {
            const parts = order.serviceId.split('_');
            if (parts.length > 0) platformName = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
        } else if (order.package) {
            const parts = order.package.split(' ');
            if (parts.length > 0) platformName = parts[0];
        }

        let serviceType = 'SMM Boost';
        if (order.package) {
            let cleanText = order.package.replace(new RegExp(`^${platformName}\\s+`, 'i'), '');
            cleanText = cleanText.replace(/\s*\([^)]*\)\s*$/, '');
            if (cleanText.trim()) serviceType = cleanText.trim();
        }

        const quantity = order.quantity || 1000;
        const targetLink = order.targetLink || order.instaLink || 'N/A';

        doc.fillColor('#333333').font('Helvetica').fontSize(9)
            .text(platformName, 60, currentY)
            .text(serviceType, 140, currentY)
            .text(Number(quantity).toLocaleString(), 220, currentY);

        doc.text(targetLink, 290, currentY, { width: 170, height: 35, ellipsis: true });
        doc.text(displayPrice, 480, currentY);

        currentY += 45;
        doc.moveTo(50, currentY - 5).lineTo(540, currentY - 5).strokeColor('#e2e8f0').lineWidth(0.5).stroke();
        currentY += 10;
    }

    // --- 5. TOTAL CALCULATION ---
    const totalY = currentY;

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

    // --- 6. TERMS & CONDITIONS (SMM Specific Shaded Box) ---
    const termsY = totalY + 90;

    // Draw shaded box background
    doc.rect(50, termsY, 490, 115).fill('#fffbeb'); // Shaded warm amber/light yellow background
    doc.rect(50, termsY, 490, 115).strokeColor('#fef3c7').lineWidth(1).stroke(); // Subtle border

    doc.fillColor('#92400e').font('Helvetica-Bold').fontSize(10)
        .text('Important SMM Terms & Conditions:', 60, termsY + 10);

    doc.font('Helvetica').fontSize(8.5).fillColor('#78350f')
        .text('1. Delivery is fully automated. Your social media account/post MUST remain PUBLIC during delivery.', 60, termsY + 28)
        .text('2. Please double-check target links. No refunds or redeliveries can be provided for incorrect or invalid links.', 60, termsY + 45)
        .text('3. Once processing starts, orders are strictly non-refundable. For issues, contact support within 24 hours.', 60, termsY + 62)
        .text('4. Any legal disputes arising from this transaction will be subject to the jurisdiction of Jaipur, India.', 60, termsY + 79)
        .text('5. This is a computer-generated invoice and does not require a physical signature.', 60, termsY + 96);

    // SaaS note
    doc.rect(50, termsY + 125, 490, 25).fill('#f8fafc'); // Light gray SaaS box
    doc.fillColor('#475569').font('Helvetica-Bold').fontSize(9)
        .text(' Track Order History & Progress at:', 60, termsY + 133);
    doc.fillColor('#3b82f6').font('Helvetica-Bold').fontSize(9)
        .text('vibespheremedia.in/dashboard', 260, termsY + 133);

    // --- 7. FOOTER ---
    doc.font('Helvetica-Bold').fontSize(10).fillColor('#383d46')
        .text('Thank you for choosing VibeSphere Media.', 50, 750, { align: 'center', width: 490 });

    doc.end();
}

function buildProfessionalInvoice(doc, order) {
    if (order && order.orderType === 'smm') {
        buildSmmInvoice(doc, order);
    } else {
        buildAgencyInvoice(doc, order);
    }
}
// --- 1. Variables ---
let CURRENT_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

// NOTE: CORS is already configured above with credentials: true — do NOT add a second app.use(cors()) here

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

// Ek IP address se 15 minute mein sirf 10 baar login attempts allowed hain
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Maximum 10 requests allowed per IP
    message: { success: false, message: "Too many login attempts, please try again after 15 minutes" },
    standardHeaders: true,
    legacyHeaders: false,
});
// Frontend files serve
app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html', 'htm'] }));

// Dynamic page routes (serve HTML shell, JS fetches data from API)
const serveAdminDashboard = (_req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html'));
app.get(['/admin', '/admin/'], serveAdminDashboard);
app.get('/service/:id', (req, res) => res.sendFile(path.join(__dirname, 'public', 'service-detail.html')));
app.get('/package/:id', (req, res) => res.sendFile(path.join(__dirname, 'public', 'package-detail.html')));
app.get('/cart', (req, res) => res.sendFile(path.join(__dirname, 'public', 'cart.html')));

// --- 2. Database Connection ---
const mongoURI = process.env.MONGO_URI;

if (mongoURI) {
    mongoose.connect(mongoURI)
        .then(async () => {
            console.log("✅ MongoDB Connected Successfully!");
            startDripFeedWorker();
            
            // ==========================================
            // 🚀 SUPER ADMIN AUTO-SEEDER
            // ==========================================
            try {
                if (typeof AdminUser !== 'undefined') {
                    const adminCount = await AdminUser.countDocuments();
                    if (adminCount === 0 && process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
                        const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD, 10);
                        await AdminUser.create({
                            name: 'Super Admin',
                            email: process.env.ADMIN_EMAIL.toLowerCase(),
                            password: hashedPassword,
                            role: 'SuperAdmin',
                            permissions: { staff: true, finance: true, orders: true, smm: true, content: true, clients: true, commerce: true, helpdesk: true }
                        });
                        console.log("✅ First SuperAdmin seeded successfully:", process.env.ADMIN_EMAIL);
                    }
                }
            } catch (err) {
                console.error("❌ Admin Seeder Error:", err.message);
            }
        })
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

    // 💸 WALLET SYSTEM (Phase 1)
    walletBalance: { type: Number, default: 0 },
    walletId: { type: String, unique: true },
    walletStatus: { type: String, enum: ['Active', 'Frozen', 'Hold'], default: 'Active' },

    date: { type: Date, default: Date.now }
});

// Auto-generate unique walletId
userSchema.pre('save', function (next) {
    if (!this.walletId) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let randomStr = '';
        for (let i = 0; i < 8; i++) {
            randomStr += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        this.walletId = `VS-W-${randomStr}`;
    }
    next();
});

const User = mongoose.model('User', userSchema);

// ==========================================
// 🛡️ ADMIN USER SCHEMA (RBAC)
// ==========================================
const adminUserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['SuperAdmin', 'SubAdmin'], default: 'SubAdmin' },
    permissions: {
        staff:    { type: Boolean, default: false },
        finance:  { type: Boolean, default: false },
        orders:   { type: Boolean, default: false },
        smm:      { type: Boolean, default: false },
        content:  { type: Boolean, default: false },
        clients:  { type: Boolean, default: false },
        commerce: { type: Boolean, default: false },
        helpdesk: { type: Boolean, default: false },
    },
    isActive: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now }
});
const AdminUser = mongoose.model('AdminUser', adminUserSchema);
// ==========================================
// 💸 PAYOUT REQUEST SCHEMA (UPDATED)
// ==========================================
const payoutSchema = new mongoose.Schema({
    staffEmail: String,
    staffName: String,
    staffEmpId: String,
    amount: Number,
    paymentMethod: String, // 'UPI' ya 'Bank'
    paymentDetails: Object, // Isme UPI ID ya Bank Details save hongi
    status: { type: String, default: 'Pending' },
    financeTransactionId: { type: mongoose.Schema.Types.ObjectId, ref: 'FinancialTransaction', default: null },
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
            staffEmpId: staff.empId || '',
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
            for (const att of mailOptions.attachments) {
                try {
                    if (!att.content) {
                        console.error(`❌ Attachment "${att.filename}" has no content buffer — skipping.`);
                        continue;
                    }
                    formattedAttachments.push({
                        content: (typeof att.content === 'string') ? att.content : Buffer.from(att.content).toString('base64'),
                        name: att.filename || 'attachment.pdf'
                    });
                } catch (attErr) {
                    console.error(`❌ Failed to encode attachment "${att.filename}":`, attErr.message);
                }
            }
        }

        // 2. Data pack karna
        const payload = {
            sender: {
                email: mailOptions.from || process.env.EMAIL_USER,
                name: mailOptions.fromName || "VibeSphere Media"
            },
            to: [{ email: mailOptions.to }],
            subject: mailOptions.subject,
            textContent: mailOptions.text || "",
            htmlContent: mailOptions.html || "",
        };

        // 🟢 CRITICAL FIX: Add attachments to payload for Brevo API
        if (formattedAttachments.length > 0) {
            payload.attachment = formattedAttachments;
            console.log(`📎 Attaching ${formattedAttachments.length} file(s): ${formattedAttachments.map(a => a.name).join(', ')}`);
        }

        // 3. Set HTML Content
        if (mailOptions.html) {
            payload.htmlContent = mailOptions.html;
        } else if (mailOptions.text) {
            payload.htmlContent = `<p style="font-family: sans-serif; color: #333;">${mailOptions.text.replace(/\n/g, '<br>')}</p>`;
        } else {
            payload.htmlContent = "<p>Message from VibeSphere Media</p>";
        }

        // 4. Set Plain Text Content (Spam filter bypass karne ke liye)
        if (mailOptions.text) {
            payload.textContent = mailOptions.text;
        } else if (mailOptions.html) {
            payload.textContent = mailOptions.html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        } else {
            payload.textContent = "Message from VibeSphere Media";
        }

        // 5. Render ke bahar API shoot karna!
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
                else console.error('⚠️ Brevo API Response (no messageId):', JSON.stringify(data));
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
app.post('/api/auth/signup', loginLimiter, async (req, res) => {
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
app.post('/api/auth/login', loginLimiter, async (req, res) => {
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

            // Determine Expiration and Role based on user data
            const isAdmin = user.role === 'admin' || user.role === 'Admin';
            const jwtExpiresIn = isAdmin ? '1d' : '3650d';
            const cookieMaxAge = isAdmin ? 24 * 60 * 60 * 1000 : 10 * 365 * 24 * 60 * 60 * 1000;
            const tokenRole = isAdmin ? 'Admin' : 'Client';

            // Create JWT Token
            const token = jwt.sign({
                email: user.email,
                role: tokenRole,
                name: user.name
            }, process.env.JWT_SECRET, { expiresIn: jwtExpiresIn });

            res.cookie('token', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'Strict',
                maxAge: cookieMaxAge
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


            // Client ko turant login karwa do
            res.json({ success: true, message: "Login successful" });

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
            // Create JWT Token
            const tokenGenerated = jwt.sign({
                email: user.email,
                role: 'Client',
                name: user.name
            }, process.env.JWT_SECRET, { expiresIn: '7d' });

            res.cookie('token', tokenGenerated, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'Strict',
                maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
            });

            console.log(`🛡️ Magic Login Alert: ${user.email} logged in from ${deviceName} using ${browserName}`);
            // ==========================================
            // Seedha login de do
            res.json({ success: true, message: "Magic link verified" });
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
app.post('/api/auth/change-password', loginLimiter, async (req, res) => {
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
app.post('/api/client/my-orders', checkAuth, async (req, res) => {
    try {
        const email = req.user.email;
        // Us email se jude saare orders dhoondo
        const myOrders = await Order.find({ email: email }).sort({ _id: -1 });
        res.json({ success: true, orders: myOrders });
    } catch (e) { res.status(500).json({ success: false, error: "Fetch Error" }); }
});
// ==========================================
// 🛡️ CLIENT SECURITY & DEVICE MANAGEMENT APIs
// ==========================================

// 1. Get Login History
app.post('/api/client/security-data', checkAuth, async (req, res) => {
    try {
        const email = req.user.email;
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
app.post('/api/client/logout-other-devices', checkAuth, async (req, res) => {
    try {
        const email = req.user.email;
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
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    customerName: String,
    email: String,
    phone: String,
    package: String,
    price: String,
    orderAmount: { type: Number, default: 0 },
    orderItems: { type: Array, default: [] },
    instaLink: String,
    date: String,
    paymentStatus: { type: String, default: 'Pending' },
    paymentMethod: { type: String, default: '' },
    workStatus: { type: String, default: 'Work Pending' },
    status: { type: String, default: 'Work Pending' },
    finalAmount: { type: Number, default: 0 },

    // SMM specific fields
    orderType: { type: String, enum: ['agency', 'smm'], default: 'agency' },
    targetLink: { type: String, default: '' },
    quantity: { type: Number, default: 0 },
    serviceId: { type: String, default: '' },
    selectedVariantName: { type: String, default: '' },
    selectedVariantId: { type: Number, default: null },
    selectedCountry: { type: String, default: '' },
    selectedQuality: { type: String, default: '' },
    selectedSpeed: { type: String, default: '' },
    selectedRefill: { type: String, default: '' },
    selectedVariantBasePrice: { type: Number, default: 0 },
    selectedVariantDiscountPercent: { type: Number, default: 0 },
    selectedVariantDiscountAmount: { type: Number, default: 0 },
    selectedVariantEffectivePrice: { type: Number, default: 0 },
    isDripFeed: { type: Boolean, default: false },
    runs: { type: Number, default: 1 },
    interval: { type: Number, default: 0 }, // in minutes
    quantityPerRun: { type: Number, default: 0 },
    remainingRuns: { type: Number, default: 0 },
    nextRunAt: { type: Date, default: null },
    extraInput: { type: String, default: '' },
    extraInputType: { type: String, default: 'none' },
    couponCode: { type: String, default: '' },
    couponModule: { type: String, default: '' },
    couponDiscountAmount: { type: Number, default: 0 },
    couponFinalTotal: { type: Number, default: 0 },

    // 🟢 NAYA: Commission Engine Fields
    assignedStaff: { type: String, default: '' }, // Staff ka email jisne pitch kiya tha
    assignedAt: { type: Date, default: null },
    commissionValue: { type: Number, default: 0 }, // 20% cut kitna bana
    payoutStatus: { type: String, default: 'Unpaid' } // Unpaid ya Paid
}, { timestamps: true });
const Order = mongoose.model('Order', orderSchema);

async function saveOrderDocument(orderData = {}) {
    const order = new Order(orderData);
    if (mongoose.connection.readyState === 1) {
        await order.save();
    }
    return order;
}

async function createFreeCheckoutOrder({
    userId = null,
    orderDetails = {},
    orderType = 'agency',
    resolvedServiceId = '',
    resolvedQuantity = 0,
    resolvedTargetLink = '',
    selectedVariantName = '',
    selectedVariantId = null,
    selectedCountry = '',
    selectedQuality = '',
    selectedSpeed = '',
    selectedRefill = '',
    selectedVariantBasePrice = 0,
    selectedVariantDiscountPercent = 0,
    selectedVariantDiscountAmount = 0,
    selectedVariantEffectivePrice = 0,
    isDripActive = false,
    runsVal = 1,
    intervalMins = 0,
    qtyPerRun = 0,
    remainingRunsVal = 0,
    nextRunTimestamp = null,
    resolvedOrderItems = [],
    currency = 'INR',
    couponPricing = null
} = {}) {
    const generatedOrderId = "#ORD-" + Math.floor(100000 + Math.random() * 900000);
    const normalizedCurrency = String(currency || orderDetails?.currency || 'INR').toUpperCase() === 'USD' ? 'USD' : 'INR';
    const zeroPriceLabel = normalizedCurrency === 'USD' ? '$0.00' : '₹0.00';
    const freePaymentId = `FREE-${Date.now()}`;

    const newOrder = await saveOrderDocument({
        orderId: generatedOrderId,
        paymentId: freePaymentId,
        paymentStatus: 'Paid',
        paymentMethod: '100% Discount / Free',
        workStatus: 'Work Pending',
        status: 'Work Pending',
        userId,
        ...orderDetails,
        price: zeroPriceLabel,
        orderAmount: 0,
        finalAmount: 0,
        orderItems: resolvedOrderItems,
        orderType,
        serviceId: resolvedServiceId,
        quantity: resolvedQuantity,
        targetLink: resolvedTargetLink,
        instaLink: resolvedTargetLink || orderDetails?.instaLink || '',
        selectedVariantName,
        selectedVariantId,
        selectedCountry,
        selectedQuality,
        selectedSpeed,
        selectedRefill,
        selectedVariantBasePrice,
        selectedVariantDiscountPercent,
        selectedVariantDiscountAmount,
        selectedVariantEffectivePrice,
        isDripFeed: isDripActive,
        runs: runsVal,
        interval: intervalMins,
        quantityPerRun: qtyPerRun,
        remainingRuns: remainingRunsVal,
        nextRunAt: nextRunTimestamp,
        extraInput: orderDetails?.extraInput || '',
        extraInputType: orderDetails?.extraInputType || 'none',
        couponCode: couponPricing?.coupon?.code || orderDetails?.couponCode || '',
        couponModule: couponPricing?.module || orderDetails?.couponModule || '',
        couponDiscountAmount: couponPricing?.discountAmount || orderDetails?.couponDiscountAmount || 0,
        couponFinalTotal: 0,
        date: new Date().toLocaleString()
    });

    return newOrder;
}

const couponSchema = new mongoose.Schema({
    code: { type: String, required: true, unique: true, trim: true },
    discountType: { type: String, enum: ['percent', 'fixed'], default: 'percent' },
    discountValue: { type: Number, required: true, default: 0 },
    maxDiscountAmount: { type: Number, default: 0 },
    minOrderValue: { type: Number, default: 0 },
    applicableModules: { type: [String], default: ['all'] },
    usageLimit: { type: Number, default: 0 },
    usageCount: { type: Number, default: 0 },
    expiryDate: { type: Date, default: null },
    isGlobal: { type: Boolean, default: true },
    isGlobalUser: { type: Boolean, default: true },
    allowedUsers: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], default: [] },
    isActive: { type: Boolean, default: true },
    expiresAt: { type: Date, default: null }
}, { timestamps: true });

couponSchema.pre('save', function (next) {
    if (this.code) {
        this.code = String(this.code).trim().toUpperCase();
    }
    this.discountType = trimSmmText(this.discountType).toLowerCase() === 'fixed' ? 'fixed' : 'percent';
    this.discountValue = normalizeCouponAmount(this.discountValue, 0);
    this.maxDiscountAmount = normalizeCouponAmount(this.maxDiscountAmount, 0);
    this.minOrderValue = normalizeCouponAmount(this.minOrderValue, 0);
    this.usageLimit = normalizeCouponLimit(this.usageLimit, 0);
    this.usageCount = normalizeCouponLimit(this.usageCount, 0);
    this.applicableModules = normalizeCouponModules(this.applicableModules, { defaultToAll: true });
    const expiryDate = normalizeCouponExpiryDate(this.expiryDate || this.expiresAt);
    this.expiryDate = expiryDate;
    this.expiresAt = expiryDate;
    this.isGlobal = Array.isArray(this.applicableModules) && this.applicableModules.includes('all');
    this.isGlobalUser = !Array.isArray(this.allowedUsers) || this.allowedUsers.length === 0;
    next();
});

const Coupon = mongoose.models.Coupon || mongoose.model('Coupon', couponSchema);

function normalizeCouponAmount(value, fallback = 0) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) {
        return fallback;
    }
    return Number(parsed.toFixed(2));
}

function normalizeCouponLimit(value, fallback = 0) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) {
        return fallback;
    }
    return Math.floor(parsed);
}

function normalizeCouponModuleKey(value) {
    const normalized = trimSmmText(value).toLowerCase().replace(/\s+/g, '_').replace(/-+/g, '_');
    if (!normalized) return '';
    if (['all', 'any', 'global'].includes(normalized)) return 'all';
    if (['smm', 'social', 'social_media', 'socialmedia'].includes(normalized)) return 'smm';
    if (['seo', 'search', 'search_engine_optimization', 'search_engine_optimisation'].includes(normalized)) return 'seo';
    if (['web', 'web_design', 'webdesign', 'website', 'general', 'agency', 'cart'].includes(normalized)) return 'web_design';
    return normalized;
}

function normalizeCouponModules(values = [], { defaultToAll = false } = {}) {
    const rawValues = Array.isArray(values) ? values : (values ? [values] : []);
    const normalized = [...new Set(rawValues.map((value) => normalizeCouponModuleKey(value)).filter(Boolean))];

    if (normalized.includes('all')) {
        return ['all'];
    }

    if (normalized.length > 0) {
        return normalized;
    }

    return defaultToAll ? ['all'] : [];
}

function normalizeCouponExpiryDate(value) {
    const rawValue = trimSmmText(value);
    if (!rawValue) return null;

    if (/^\d{4}-\d{2}-\d{2}$/.test(rawValue)) {
        const [year, month, day] = rawValue.split('-').map(Number);
        const date = new Date(year, month - 1, day, 23, 59, 59, 999);
        return Number.isNaN(date.getTime()) ? null : date;
    }

    const date = new Date(rawValue);
    return Number.isNaN(date.getTime()) ? null : date;
}

function couponAppliesToModule(coupon = {}, moduleName = '') {
    const applicableModules = normalizeCouponModules(coupon.applicableModules, { defaultToAll: false });
    if (!Array.isArray(applicableModules) || applicableModules.length === 0) {
        return true;
    }

    if (applicableModules.includes('all')) {
        return true;
    }

    const requestedModule = normalizeCouponModuleKey(moduleName);
    if (!requestedModule) {
        return true;
    }

    return applicableModules.includes(requestedModule);
}

async function incrementCouponUsageByCode(code) {
    const normalizedCode = normalizeCouponCode(code);
    if (!normalizedCode) {
        return;
    }

    await Coupon.updateOne(
        { code: new RegExp(`^${escapeRegex(normalizedCode)}$`, 'i') },
        { $inc: { usageCount: 1 } }
    );
}

function formatCouponAdminResponse(coupon = {}) {
    const expiryDate = normalizeCouponExpiryDate(coupon.expiryDate || coupon.expiresAt);
    const applicableModules = normalizeCouponModules(coupon.applicableModules, {
        defaultToAll: coupon.isGlobal !== false
    });
    const allowedUsers = Array.isArray(coupon.allowedUsers) ? coupon.allowedUsers : [];
    const isGlobalUser = typeof coupon.isGlobalUser === 'boolean' ? coupon.isGlobalUser : allowedUsers.length === 0;

    return {
        _id: coupon._id,
        code: coupon.code || '',
        discountType: trimSmmText(coupon.discountType).toLowerCase() === 'fixed' ? 'fixed' : 'percent',
        discountValue: normalizeCouponAmount(coupon.discountValue, 0),
        maxDiscountAmount: normalizeCouponAmount(coupon.maxDiscountAmount, 0),
        minOrderValue: normalizeCouponAmount(coupon.minOrderValue, 0),
        applicableModules,
        usageLimit: normalizeCouponLimit(coupon.usageLimit, 0),
        usageCount: normalizeCouponLimit(coupon.usageCount, 0),
        expiryDate: expiryDate ? expiryDate.toISOString() : null,
        expiresAt: expiryDate ? expiryDate.toISOString() : null,
        isGlobal: coupon.isGlobal !== false,
        isGlobalUser,
        allowedUsers,
        isActive: coupon.isActive !== false,
        createdAt: coupon.createdAt || null,
        updatedAt: coupon.updatedAt || null
    };
}
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
// 🕒 ATTENDANCE SCHEMA
// ==========================================
const attendanceSchema = new mongoose.Schema({
    staffEmail: { type: String, required: true },
    staffName: { type: String, default: '' },
    empId: { type: String, default: '' },
    dateString: { type: String, required: true }, // YYYY-MM-DD (IST)
    checkInTime: { type: Date, default: null },
    checkOutTime: { type: Date, default: null },
    breaks: [{
        startTime: { type: Date, required: true },
        endTime: { type: Date, default: null }
    }],
    totalWorkingMs: { type: Number, default: 0 },
    approvalStatus: { type: String, enum: ['Unverified', 'Pending_Approval', 'Approved', 'Denied'], default: 'Unverified' },
    status: { type: String, default: 'Present' }, // Present | Absent | Leave
    date: { type: Date, default: Date.now }
});
attendanceSchema.index({ staffEmail: 1, dateString: 1 }, { unique: true });
const Attendance = mongoose.model('Attendance', attendanceSchema);

const documentApprovalSchema = new mongoose.Schema({
    staffEmail: { type: String, required: true },
    documentType: { type: String, enum: ['AttendanceReport', 'Payslip'], required: true },
    month: { type: Number, required: true },
    year: { type: Number, required: true },
    approvalStatus: { type: String, enum: ['Unverified', 'Pending_Approval', 'Approved', 'Denied'], default: 'Unverified' },
    requestedAt: { type: Date, default: null },
    approvedAt: { type: Date, default: null },
    approvedBy: { type: String, default: '' },
    date: { type: Date, default: Date.now }
});
documentApprovalSchema.index({ staffEmail: 1, documentType: 1, month: 1, year: 1 }, { unique: true });
const DocumentApproval = mongoose.model('DocumentApproval', documentApprovalSchema);

function getISTNow() {
    return new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
}

function formatDateYYYYMMDD(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function getISTDateString(offsetDays = 0) {
    const d = getISTNow();
    d.setDate(d.getDate() + offsetDays);
    return formatDateYYYYMMDD(d);
}

function getOpenBreak(record) {
    if (!record || !Array.isArray(record.breaks) || !record.breaks.length) return null;
    const last = record.breaks[record.breaks.length - 1];
    if (last && last.startTime && !last.endTime) return last;
    return null;
}

function calculateAttendanceMetrics(record, nowDate = new Date()) {
    if (!record || !record.checkInTime) {
        return { totalSpanMs: 0, totalBreakMs: 0, netWorkingMs: 0 };
    }

    const end = record.checkOutTime ? new Date(record.checkOutTime) : nowDate;
    const start = new Date(record.checkInTime);
    const totalSpanMs = Math.max(0, end.getTime() - start.getTime());

    let totalBreakMs = 0;
    if (Array.isArray(record.breaks)) {
        record.breaks.forEach((b) => {
            if (!b || !b.startTime) return;
            const breakStart = new Date(b.startTime);
            const breakEnd = b.endTime ? new Date(b.endTime) : end;
            totalBreakMs += Math.max(0, breakEnd.getTime() - breakStart.getTime());
        });
    }

    const netWorkingMs = Math.max(0, totalSpanMs - totalBreakMs);
    return { totalSpanMs, totalBreakMs, netWorkingMs };
}

async function markAbsentForDate(dateString) {
    try {
        const allStaff = await Staff.find().select('email name empId').lean();
        if (!allStaff.length) return;

        const existing = await Attendance.find({ dateString }).select('staffEmail').lean();
        const existingSet = new Set(existing.map(r => r.staffEmail));

        // Fetch all approved leaves that overlap with this date
        const approvedLeaves = await Leave.find({
            status: 'Approved',
            dateFrom: { $lte: dateString },
            dateTo: { $gte: dateString }
        }).select('staffEmail').lean();
        const onLeaveSet = new Set(approvedLeaves.map(l => l.staffEmail));

        const bulkDocs = [];
        for (const staff of allStaff) {
            if (existingSet.has(staff.email)) continue;

            const isOnLeave = onLeaveSet.has(staff.email);
            bulkDocs.push({
                staffEmail: staff.email,
                staffName: staff.name || '',
                empId: staff.empId || '',
                dateString,
                status: isOnLeave ? 'Leave' : 'Absent',
                checkInTime: null,
                checkOutTime: null,
                breaks: [],
                totalWorkingMs: 0
            });
        }

        if (bulkDocs.length) {
            await Attendance.insertMany(bulkDocs, { ordered: false });
        }

        const leaveCount = bulkDocs.filter(d => d.status === 'Leave').length;
        const absentCount = bulkDocs.filter(d => d.status === 'Absent').length;
        console.log(`🕒 Attendance Job done for ${dateString} | absent: ${absentCount}, on-leave: ${leaveCount}`);
    } catch (e) {
        console.error('❌ Attendance Absent Job Error:', e.message);
    }
}

async function autoCheckoutForDate(dateString) {
    try {
        // Find all records that have a check-in but no check-out for this date
        const openRecords = await Attendance.find({
            dateString,
            checkInTime: { $ne: null },
            checkOutTime: null,
            status: 'Present'
        });

        if (!openRecords.length) {
            console.log(`⏰ Auto-Checkout: No open shifts found for ${dateString}.`);
            return;
        }

        // Build the 23:59:00 IST timestamp for this date
        const [year, month, day] = dateString.split('-').map(Number);
        const autoCheckoutTime = new Date(Date.UTC(year, month - 1, day, 18, 29, 0)); // 23:59 IST = 18:29 UTC

        let autoClosedCount = 0;
        for (const record of openRecords) {
            record.checkOutTime = autoCheckoutTime;

            // Close any open break
            if (Array.isArray(record.breaks) && record.breaks.length) {
                const lastBreak = record.breaks[record.breaks.length - 1];
                if (lastBreak && lastBreak.startTime && !lastBreak.endTime) {
                    lastBreak.endTime = autoCheckoutTime;
                }
            }

            // Calculate total working time
            const metrics = calculateAttendanceMetrics(record, autoCheckoutTime);
            record.totalWorkingMs = metrics.netWorkingMs;

            await record.save();
            autoClosedCount++;
        }

        console.log(`⏰ Auto-Checkout done for ${dateString} | auto-closed: ${autoClosedCount} shifts.`);
    } catch (e) {
        console.error('❌ Auto-Checkout Error:', e.message);
    }
}

function scheduleDailyAbsentJob() {
    const runJob = async () => {
        // At 00:05 IST, mark absent (or on-leave) for previous IST day.
        const targetDateString = getISTDateString(-1);
        await markAbsentForDate(targetDateString);
    };

    const nowIST = getISTNow();
    const nextRun = new Date(nowIST);
    nextRun.setHours(24, 5, 0, 0);
    const initialDelay = Math.max(1000, nextRun.getTime() - nowIST.getTime());

    setTimeout(async () => {
        await runJob();
        setInterval(runJob, 24 * 60 * 60 * 1000);
    }, initialDelay);

    console.log('🗓️ Daily Absent Job scheduled (00:05 IST). Now checks approved leaves before marking absent.');
}

function scheduleAutoCheckoutJob() {
    const runJob = async () => {
        // At 23:59 IST, auto-checkout any open shifts for today.
        const todayDateString = getISTDateString(0);
        await autoCheckoutForDate(todayDateString);
    };

    const nowIST = getISTNow();
    const nextRun = new Date(nowIST);
    nextRun.setHours(23, 59, 0, 0);

    // If it's already past 23:59 today, schedule for tomorrow
    if (nextRun.getTime() <= nowIST.getTime()) {
        nextRun.setDate(nextRun.getDate() + 1);
    }

    const initialDelay = Math.max(1000, nextRun.getTime() - nowIST.getTime());

    setTimeout(async () => {
        await runJob();
        setInterval(runJob, 24 * 60 * 60 * 1000);
    }, initialDelay);

    console.log('⏰ Auto-Checkout Job scheduled (23:59 IST). Will auto-close forgotten shifts.');
}

// ==========================================
// 🎧 HELPDESK TICKETING SCHEMA
// ==========================================
const ticketSchema = new mongoose.Schema({
    ticketNumber: { type: String, default: '' },
    clientEmail: String,
    clientName: String,
    subject: String,
    issue: String,
    status: { type: String, default: 'Open' }, // Open, In Progress, Resolved, Closed
    replies: [{
        sender: String,
        message: String,
        text: String,
        date: { type: Date, default: Date.now },
        createdAt: { type: Date, default: Date.now }
    }],
    orderId: { type: String, default: '' },
    category: { type: String, default: '' },
    subcategory: { type: String, default: '' },
    actionRequired: { type: String, default: '' },
    chatActive: { type: Boolean, default: false },
    isLiveChat: { type: Boolean, default: false },
    offlineQuery: { type: Boolean, default: false },
    date: { type: Date, default: Date.now }
});

// Auto-generate a unique ticket number before first save
ticketSchema.pre('save', function (next) {
    if (!this.ticketNumber) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let suffix = '';
        for (let i = 0; i < 6; i++) suffix += chars.charAt(Math.floor(Math.random() * chars.length));
        this.ticketNumber = '#TCK-' + suffix;
    }
    next();
});

const Ticket = mongoose.model('Ticket', ticketSchema);

// ==========================================
// 🏢 STAFF INTERNAL TICKET SCHEMA
// ==========================================
const staffTicketSchema = new mongoose.Schema({
    staffEmail: { type: String, required: true },
    staffName: { type: String, default: 'Staff' },
    category: { type: String, default: 'General' }, // IT Support, HR, Accounts, General
    subject: { type: String, required: true },
    issue: { type: String, required: true },
    status: { type: String, default: 'Open' }, // Open, In Progress, Resolved
    priority: { type: String, default: 'Normal' }, // Normal, Urgent
    replies: [{
        sender: String,
        message: String,
        date: { type: Date, default: Date.now }
    }],
    date: { type: Date, default: Date.now }
});
const StaffTicket = mongoose.model('StaffTicket', staffTicketSchema);

// ==========================================
// 💰 EXPENSE TRACKER SCHEMA (Admin Only)
// ==========================================
const expenseSchema = new mongoose.Schema({
    title: String,
    amount: Number,
    category: { type: String, default: 'General' }, // Ads, Server, Salaries, Tools, General
    transactionType: { type: String, default: 'EXPENSE' },
    financeTransactionId: { type: mongoose.Schema.Types.ObjectId, ref: 'FinancialTransaction', default: null },
    date: { type: Date, default: Date.now }
});
const Expense = mongoose.model('Expense', expenseSchema);

const financialTransactionSchema = new mongoose.Schema({
    title: String,
    amount: { type: Number, default: 0 },
    type: { type: String, enum: ['SALARY', 'EXPENSE', 'INCOME'], required: true, index: true },
    kind: { type: String, enum: ['credit', 'debit'], default: 'debit' },
    category: { type: String, default: '' },
    source: { type: String, default: '' },
    meta: { type: String, default: '' },
    notes: { type: String, default: '' },
    staffName: { type: String, default: '' },
    staffEmail: { type: String, default: '' },
    staffEmpId: { type: String, default: '' },
    payoutRequestId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payout', default: null, index: true },
    expenseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Expense', default: null },
    date: { type: Date, default: Date.now }
});
const FinancialTransaction = mongoose.model('FinancialTransaction', financialTransactionSchema);

// ==========================================
// 💸 WALLET TRANSACTION SCHEMA (Phase 1)
// ==========================================
const transactionSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['Credit', 'Debit'], required: true },
    amount: { type: Number, required: true },
    description: { type: String, required: true },
    transactionId: { type: String },
    status: { type: String, enum: ['Success', 'Pending', 'Failed', 'Refunded'], default: 'Success' }
}, {
    timestamps: true
});
const Transaction = mongoose.model('Transaction', transactionSchema);

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
    qrCodeString: { type: String, default: '' },
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
    joiningDate: { type: Date, default: null },
    // 🟢 NAYA: Duty Status Tracker
    isOnline: { type: Boolean, default: false },
    isMuted: { type: Boolean, default: false },
    lastActive: { type: Date, default: Date.now },

    date: { type: Date, default: Date.now }
});
const Staff = mongoose.model('Staff', staffSchema);
scheduleDailyAbsentJob();
scheduleAutoCheckoutJob();
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

const staffBountyTaskSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
    assignedStaffEmail: { type: String, required: true, trim: true, lowercase: true },
    bountyAmount: { type: Number, required: true, min: 0 },
    status: {
        type: String,
        enum: ['Assigned', 'Submitted', 'Revision', 'Approved'],
        default: 'Assigned'
    },
    submissionLink: { type: String, default: '', trim: true },
    adminFeedback: { type: String, default: '', trim: true },
    approvedAt: { type: Date, default: null }
}, { timestamps: true });
const StaffBountyTask = mongoose.model('StaffBountyTask', staffBountyTaskSchema);

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
    replyTo: {
        messageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Chat', default: null },
        senderName: { type: String, default: '' },
        previewText: { type: String, default: '' }
    },
    isPinned: { type: Boolean, default: false },
    pinnedAt: { type: Date, default: null },
    date: { type: Date, default: Date.now }
});
const Chat = mongoose.model('Chat', chatSchema);

// Global Settings (Chat on/off karne ke liye)
const settingsSchema = new mongoose.Schema({
    isChatBlocked: { type: Boolean, default: false }
});
const AppSettings = mongoose.model('AppSettings', settingsSchema);

// Global Site Settings (announcement banner)
const siteSettingsSchema = new mongoose.Schema({
    normalBannerText: { type: String, default: '' },
    isNormalActive: { type: Boolean, default: false },
    smmBannerText: { type: String, default: '' },
    isSmmActive: { type: Boolean, default: false }
}, { timestamps: true });
const SiteSettings = mongoose.models.SiteSettings || mongoose.model('SiteSettings', siteSettingsSchema);

// Legal Pages CMS Schema
const legalPageSchema = new mongoose.Schema({
    pageSlug: { type: String, required: true, unique: true },
    content: { type: String, default: '' },
}, { timestamps: true });
const LegalPage = mongoose.models.LegalPage || mongoose.model('LegalPage', legalPageSchema);

function normalizeBannerText(value) {
    return String(value ?? '');
}

function normalizeBannerBoolean(value) {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value === 1;
    if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();
        return ['true', '1', 'yes', 'on'].includes(normalized);
    }
    return false;
}

function formatBannerSettings(settings) {
    return {
        normalBannerText: normalizeBannerText(settings?.normalBannerText),
        isNormalActive: Boolean(settings?.isNormalActive),
        smmBannerText: normalizeBannerText(settings?.smmBannerText),
        isSmmActive: Boolean(settings?.isSmmActive)
    };
}

async function getOrCreateSiteSettings() {
    return SiteSettings.findOneAndUpdate(
        {},
        {
            $setOnInsert: {
                normalBannerText: '',
                isNormalActive: false,
                smmBannerText: '',
                isSmmActive: false
            }
        },
        {
            new: true,
            upsert: true,
            setDefaultsOnInsert: true
        }
    );
}

async function saveSiteSettingsBanner(payload = {}) {
    const nextValues = {
        normalBannerText: normalizeBannerText(payload.normalBannerText),
        isNormalActive: normalizeBannerBoolean(payload.isNormalActive),
        smmBannerText: normalizeBannerText(payload.smmBannerText),
        isSmmActive: normalizeBannerBoolean(payload.isSmmActive)
    };

    const settings = await SiteSettings.findOneAndUpdate(
        {},
        { $set: nextValues },
        {
            new: true,
            upsert: true,
            setDefaultsOnInsert: true
        }
    );

    return settings;
}
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

async function enrichStaffBountyTasks(tasks = []) {
    const emailList = [...new Set(tasks.map((task) => String(task.assignedStaffEmail || '').trim().toLowerCase()).filter(Boolean))];
    const staffRows = emailList.length
        ? await Staff.find({ email: { $in: emailList } }).select('email name empId profilePhoto').lean()
        : [];
    const staffMap = new Map(staffRows.map((staff) => [String(staff.email || '').trim().toLowerCase(), staff]));

    return tasks.map((task) => {
        const staff = staffMap.get(String(task.assignedStaffEmail || '').trim().toLowerCase()) || {};
        return {
            ...task,
            assignedStaffName: staff.name || task.assignedStaffEmail,
            assignedStaffEmpId: staff.empId || '',
            assignedStaffProfilePhoto: staff.profilePhoto || ''
        };
    });
}

// ==========================================
// 🚀 STAFF PORTAL APIs
// ==========================================

// API 1: Staff Login
app.post('/api/staff/login', loginLimiter, async (req, res) => {
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
            }, process.env.JWT_SECRET, { expiresIn: '12h' });

            res.cookie('token', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'Strict',
                maxAge: 12 * 60 * 60 * 1000 // 12 hours
            });

            // 🟢 Naya code: empId bhi frontend ko bhejo + token in body for mobile app
            res.json({
                success: true,
                token,
                staff: {
                    empId: staff.empId,
                    qrCodeString: staff.qrCodeString,
                    name: staff.name,
                    email: staff.email,
                    role: staff.role,
                    profilePhoto: staff.profilePhoto,
                    joiningDate: staff.joiningDate,
                    isOnline: staff.isOnline
                }
            });
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
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded.role === 'Staff') {
            // Re-fetch robust UI context from DB if needed, or simply return decoded values
            Staff.findOne({ email: decoded.email }).then(staff => {
                if (!staff) return res.status(401).json({ success: false });
                res.json({
                    success: true,
                    staff: {
                        empId: staff.empId,
                        qrCodeString: staff.qrCodeString,
                        name: staff.name,
                        email: staff.email,
                        role: staff.role,
                        profilePhoto: staff.profilePhoto,
                        joiningDate: staff.joiningDate,
                        isOnline: staff.isOnline
                    }
                });
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
        const email = (req.body.email || '').toLowerCase().trim();
        const isOnline = !!req.body.isOnline;
        if (!email) return res.status(400).json({ success: false, message: 'Email is required.' });

        const staff = await Staff.findOne({ email });
        if (!staff) return res.status(404).json({ success: false, message: 'Staff not found' });

        const dateString = getISTDateString(0);
        const now = new Date();
        let attendance = await Attendance.findOne({ staffEmail: email, dateString });

        if (isOnline) {
            if (!attendance) {
                attendance = new Attendance({
                    staffEmail: email,
                    staffName: staff.name,
                    empId: staff.empId || '',
                    dateString,
                    checkInTime: now,
                    status: 'Present',
                    breaks: []
                });
            }

            if (!attendance.checkOutTime) {
                if (!attendance.checkInTime) attendance.checkInTime = now;
                const openBreak = getOpenBreak(attendance);
                if (openBreak) openBreak.endTime = now;
                attendance.status = 'Present';
                const metrics = calculateAttendanceMetrics(attendance, now);
                attendance.totalWorkingMs = metrics.netWorkingMs;
                await attendance.save();
            }
        } else if (attendance && attendance.checkInTime && !attendance.checkOutTime) {
            // Legacy offline action is treated as "take break", not checkout.
            if (!getOpenBreak(attendance)) {
                attendance.breaks.push({ startTime: now, endTime: null });
                const metrics = calculateAttendanceMetrics(attendance, now);
                attendance.totalWorkingMs = metrics.netWorkingMs;
                await attendance.save();
            }
        }

        staff.isOnline = isOnline;
        staff.lastActive = Date.now();
        await staff.save();

        res.json({ success: true, isOnline: staff.isOnline, attendance });
    } catch (e) {
        res.status(500).json({ success: false, error: "Server Error" });
    }
});

// ==========================================
// 🕒 NEW ATTENDANCE APIs (Check-In Workflow)
// ==========================================
app.post('/api/staff/check-in', async (req, res) => {
    try {
        const email = (req.body.email || '').toLowerCase().trim();
        if (!email) return res.status(400).json({ success: false, message: 'Email is required.' });

        const staff = await Staff.findOne({ email });
        if (!staff) return res.status(404).json({ success: false, message: 'Staff not found.' });

        const dateString = getISTDateString(0);
        let attendance = await Attendance.findOne({ staffEmail: email, dateString });
        const now = new Date();

        if (!attendance) {
            attendance = new Attendance({
                staffEmail: email,
                staffName: staff.name,
                empId: staff.empId || '',
                dateString,
                checkInTime: now,
                status: 'Present',
                breaks: []
            });
        } else {
            if (attendance.checkOutTime) {
                return res.status(400).json({ success: false, message: 'Shift already ended for today.' });
            }
            if (!attendance.checkInTime) attendance.checkInTime = now;
            attendance.status = 'Present';
        }

        const openBreak = getOpenBreak(attendance);
        if (openBreak) openBreak.endTime = now;

        const metrics = calculateAttendanceMetrics(attendance, now);
        attendance.totalWorkingMs = metrics.netWorkingMs;
        await attendance.save();

        staff.isOnline = true;
        staff.lastActive = Date.now();
        await staff.save();

        res.json({ success: true, message: 'Checked in successfully.', attendance, isOnline: true });
    } catch (e) {
        res.status(500).json({ success: false, message: 'Check-in failed.' });
    }
});

app.post('/api/staff/take-break', async (req, res) => {
    try {
        const email = (req.body.email || '').toLowerCase().trim();
        if (!email) return res.status(400).json({ success: false, message: 'Email is required.' });

        const dateString = getISTDateString(0);
        const attendance = await Attendance.findOne({ staffEmail: email, dateString });
        if (!attendance || !attendance.checkInTime) {
            return res.status(400).json({ success: false, message: 'Check in first.' });
        }
        if (attendance.checkOutTime) {
            return res.status(400).json({ success: false, message: 'Shift already ended.' });
        }
        if (getOpenBreak(attendance)) {
            return res.status(400).json({ success: false, message: 'Already on break.' });
        }

        attendance.breaks.push({ startTime: new Date(), endTime: null });
        const metrics = calculateAttendanceMetrics(attendance, new Date());
        attendance.totalWorkingMs = metrics.netWorkingMs;
        await attendance.save();

        await Staff.findOneAndUpdate({ email }, { isOnline: false, lastActive: Date.now() });
        res.json({ success: true, message: 'Break started.', attendance, isOnline: false });
    } catch (e) {
        res.status(500).json({ success: false, message: 'Could not start break.' });
    }
});

app.post('/api/staff/resume-work', async (req, res) => {
    try {
        const email = (req.body.email || '').toLowerCase().trim();
        if (!email) return res.status(400).json({ success: false, message: 'Email is required.' });

        const dateString = getISTDateString(0);
        const attendance = await Attendance.findOne({ staffEmail: email, dateString });
        if (!attendance || !attendance.checkInTime) {
            return res.status(400).json({ success: false, message: 'Check in first.' });
        }
        if (attendance.checkOutTime) {
            return res.status(400).json({ success: false, message: 'Shift already ended.' });
        }

        const openBreak = getOpenBreak(attendance);
        if (!openBreak) {
            return res.status(400).json({ success: false, message: 'No active break found.' });
        }

        openBreak.endTime = new Date();
        const metrics = calculateAttendanceMetrics(attendance, new Date());
        attendance.totalWorkingMs = metrics.netWorkingMs;
        await attendance.save();

        await Staff.findOneAndUpdate({ email }, { isOnline: true, lastActive: Date.now() });
        res.json({ success: true, message: 'Work resumed.', attendance, isOnline: true });
    } catch (e) {
        res.status(500).json({ success: false, message: 'Could not resume work.' });
    }
});

app.post('/api/staff/check-out', async (req, res) => {
    try {
        const email = (req.body.email || '').toLowerCase().trim();
        if (!email) return res.status(400).json({ success: false, message: 'Email is required.' });

        const dateString = getISTDateString(0);
        const attendance = await Attendance.findOne({ staffEmail: email, dateString });
        if (!attendance || !attendance.checkInTime) {
            return res.status(400).json({ success: false, message: 'Check in first.' });
        }
        if (attendance.checkOutTime) {
            return res.status(400).json({ success: false, message: 'Shift already ended.' });
        }

        const now = new Date();
        const openBreak = getOpenBreak(attendance);
        if (openBreak) openBreak.endTime = now;

        attendance.checkOutTime = now;
        const metrics = calculateAttendanceMetrics(attendance, now);
        attendance.totalWorkingMs = metrics.netWorkingMs;
        await attendance.save();

        await Staff.findOneAndUpdate({ email }, { isOnline: false, lastActive: Date.now() });
        res.json({ success: true, message: 'Checked out successfully.', attendance, isOnline: false });
    } catch (e) {
        res.status(500).json({ success: false, message: 'Check-out failed.' });
    }
});

app.get('/api/staff/today-attendance', async (req, res) => {
    try {
        const token = req.cookies?.token;
        if (!token) return res.status(401).json({ success: false, message: 'No active session.' });

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded.role !== 'Staff') return res.status(401).json({ success: false, message: 'Role mismatch.' });

        const dateString = getISTDateString(0);
        const attendance = await Attendance.findOne({ staffEmail: decoded.email, dateString });
        const staff = await Staff.findOne({ email: decoded.email }).select('isOnline').lean();

        if (!attendance) {
            return res.json({ success: true, attendance: null, isOnline: !!staff?.isOnline });
        }

        const metrics = calculateAttendanceMetrics(attendance, new Date());
        const payload = attendance.toObject();
        payload.totalWorkingMsLive = metrics.netWorkingMs;
        payload.totalBreakMsLive = metrics.totalBreakMs;

        res.json({ success: true, attendance: payload, isOnline: !!staff?.isOnline });
    } catch (e) {
        res.status(500).json({ success: false, message: 'Failed to fetch today attendance.' });
    }
});

app.get('/api/staff/my-attendance', async (req, res) => {
    try {
        const token = req.cookies?.token;
        if (!token) return res.status(401).json({ success: false, message: 'No active session.' });

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded.role !== 'Staff') return res.status(401).json({ success: false, message: 'Role mismatch.' });

        const month = Number(req.query.month || 0);
        const year = Number(req.query.year || 0);
        const query = { staffEmail: decoded.email };

        if (month && year) {
            const prefix = `${year}-${String(month).padStart(2, '0')}`;
            query.dateString = { $regex: new RegExp(`^${prefix}`) };
        }

        const attendance = await Attendance.find(query).sort({ dateString: -1 }).lean();
        const enriched = attendance.map((rec) => {
            const metrics = calculateAttendanceMetrics(rec, new Date());
            return {
                ...rec,
                totalWorkingMsLive: rec.checkOutTime ? (rec.totalWorkingMs || 0) : metrics.netWorkingMs,
                totalBreakMsLive: metrics.totalBreakMs
            };
        });

        res.json({ success: true, attendance: enriched });
    } catch (e) {
        res.status(500).json({ success: false, message: 'Failed to fetch attendance history.' });
    }
});

app.get('/api/staff/download-attendance-report', async (req, res) => {
    try {
        const decoded = parseTokenFromRequest(req);
        if (!decoded || decoded.role !== 'Staff') {
            return res.status(401).json({ success: false, message: 'Unauthorized access.' });
        }

        const staff = await Staff.findOne({ email: decoded.email }).lean();
        if (!staff) return res.status(404).json({ success: false, message: 'Staff profile not found.' });

        const { month, year } = resolveMonthYear(req.query.month, req.query.year);
        const { pdfBuffer, fileName } = await createAttendanceReportPdf(staff, month, year);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
        res.setHeader('Content-Length', pdfBuffer.length);
        res.end(pdfBuffer);
    } catch (e) {
        console.error('Staff attendance report PDF error:', e.message);
        res.status(500).json({ success: false, message: 'Failed to generate attendance report PDF.' });
    }
});

app.get('/api/staff/download-payslip', async (req, res) => {
    try {
        const decoded = parseTokenFromRequest(req);
        if (!decoded || decoded.role !== 'Staff') {
            return res.status(401).json({ success: false, message: 'Unauthorized access.' });
        }

        const staff = await Staff.findOne({ email: decoded.email }).lean();
        if (!staff) return res.status(404).json({ success: false, message: 'Staff profile not found.' });

        const { month, year } = resolveMonthYear(req.query.month, req.query.year);
        const { pdfBuffer, fileName } = await createPayslipPdf(staff, month, year);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
        res.setHeader('Content-Length', pdfBuffer.length);
        res.end(pdfBuffer);
    } catch (e) {
        console.error('Staff payslip PDF error:', e.message);
        res.status(500).json({ success: false, message: 'Failed to generate payslip PDF.' });
    }
});

app.post('/api/staff/download-id-card', async (req, res) => {
    try {
        const decoded = parseTokenFromRequest(req);
        if (!decoded || decoded.role !== 'Staff') {
            return res.status(401).json({ success: false, message: 'Unauthorized access.' });
        }

        const { htmlContent, cardType } = req.body;
        if (!htmlContent) {
            return res.status(400).json({ success: false, message: 'HTML payload missing.' });
        }

        // Generate the PDF directly from the styled HTML
        const pdfBuffer = await renderHtmlToPdfBuffer(htmlContent);

        const safeCardType = String(cardType || 'Card').charAt(0).toUpperCase() + String(cardType || 'Card').slice(1);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=VibeSphere_${safeCardType}_ID.pdf`);
        res.setHeader('Content-Length', pdfBuffer.length);
        res.end(pdfBuffer);
    } catch (e) {
        console.error('ID Card PDF Generation error:', e.message);
        res.status(500).json({ success: false, message: 'Failed to generate ID card PDF.' });
    }
});

app.post('/api/staff/request-document-approval', async (req, res) => {
    try {
        const decoded = parseTokenFromRequest(req);
        if (!decoded || decoded.role !== 'Staff') {
            return res.status(401).json({ success: false, message: 'Unauthorized access.' });
        }

        const documentType = normalizeDocumentType(req.body.documentType);
        if (!documentType) {
            return res.status(400).json({ success: false, message: 'Invalid documentType. Use AttendanceReport or Payslip.' });
        }

        const { month, year } = resolveMonthYear(req.body.month, req.body.year);
        await DocumentApproval.findOneAndUpdate(
            { staffEmail: decoded.email, documentType, month, year },
            {
                $set: {
                    approvalStatus: 'Pending_Approval',
                    requestedAt: new Date(),
                    approvedAt: null,
                    approvedBy: ''
                }
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        if (documentType === 'AttendanceReport') {
            await Attendance.updateMany(
                { staffEmail: decoded.email, dateString: { $regex: new RegExp(monthRegexString(month, year)) } },
                { $set: { approvalStatus: 'Pending_Approval' } }
            );
        }

        io.to('Admin').emit('document_approval_requested', {
            staffEmail: decoded.email,
            documentType,
            month,
            year,
            approvalStatus: 'Pending_Approval'
        });

        res.json({ success: true, message: `${documentType} request submitted for admin approval.`, documentType, month, year, approvalStatus: 'Pending_Approval' });
    } catch (e) {
        console.error('Request document approval error:', e.message);
        res.status(500).json({ success: false, message: 'Failed to submit document approval request.' });
    }
});

app.post('/api/admin/approve-document', checkAuth, async (req, res) => {
    try {
        if (!['Admin', 'SuperAdmin', 'SubAdmin'].includes(req.user?.role)) {
            return res.status(403).json({ success: false, message: 'Admin access required.' });
        }

        const documentType = normalizeDocumentType(req.body.documentType);
        if (!documentType) {
            return res.status(400).json({ success: false, message: 'Invalid documentType. Use AttendanceReport or Payslip.' });
        }

        const { month, year } = resolveMonthYear(req.body.month, req.body.year);

        let staffEmail = (req.body.staffEmail || '').toLowerCase().trim();
        if (!staffEmail && req.body.staffId) {
            const staffFromId = await Staff.findById(req.body.staffId).select('email').lean();
            staffEmail = staffFromId?.email || '';
        }

        if (!staffEmail) {
            return res.status(400).json({ success: false, message: 'staffEmail or staffId is required.' });
        }

        await DocumentApproval.findOneAndUpdate(
            { staffEmail, documentType, month, year },
            {
                $set: {
                    approvalStatus: 'Approved',
                    approvedAt: new Date(),
                    approvedBy: 'Admin'
                }
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        if (documentType === 'AttendanceReport') {
            await Attendance.updateMany(
                { staffEmail, dateString: { $regex: new RegExp(monthRegexString(month, year)) } },
                { $set: { approvalStatus: 'Approved' } }
            );
        }

        io.to(staffEmail).emit('document_approval_updated', {
            documentType,
            month,
            year,
            approvalStatus: 'Approved'
        });

        res.json({ success: true, message: `${documentType} marked as Approved.`, staffEmail, documentType, month, year, approvalStatus: 'Approved' });
    } catch (e) {
        console.error('Approve document error:', e.message);
        res.status(500).json({ success: false, message: 'Failed to approve document.' });
    }
});

app.post('/api/admin/deny-document', checkAuth, async (req, res) => {
    try {
        if (!['Admin', 'SuperAdmin', 'SubAdmin'].includes(req.user?.role)) {
            return res.status(403).json({ success: false, message: 'Admin access required.' });
        }

        const documentType = normalizeDocumentType(req.body.documentType);
        if (!documentType) {
            return res.status(400).json({ success: false, message: 'Invalid documentType. Use AttendanceReport or Payslip.' });
        }

        const { month, year } = resolveMonthYear(req.body.month, req.body.year);

        let staffEmail = (req.body.staffEmail || '').toLowerCase().trim();
        if (!staffEmail && req.body.staffId) {
            const staffFromId = await Staff.findById(req.body.staffId).select('email').lean();
            staffEmail = staffFromId?.email || '';
        }

        if (!staffEmail) {
            return res.status(400).json({ success: false, message: 'staffEmail or staffId is required.' });
        }

        await DocumentApproval.findOneAndUpdate(
            { staffEmail, documentType, month, year },
            {
                $set: {
                    approvalStatus: 'Denied',
                    approvedAt: new Date(),
                    approvedBy: 'Admin'
                }
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        if (documentType === 'AttendanceReport') {
            await Attendance.updateMany(
                { staffEmail, dateString: { $regex: new RegExp(monthRegexString(month, year)) } },
                { $set: { approvalStatus: 'Denied' } }
            );
        }

        io.to(staffEmail).emit('document_approval_updated', {
            documentType,
            month,
            year,
            approvalStatus: 'Denied'
        });

        res.json({ success: true, message: `${documentType} marked as Denied.`, staffEmail, documentType, month, year, approvalStatus: 'Denied' });
    } catch (e) {
        console.error('Deny document error:', e.message);
        res.status(500).json({ success: false, message: 'Failed to deny document.' });
    }
});

app.get('/api/staff/my-document-approvals', async (req, res) => {
    try {
        const decoded = parseTokenFromRequest(req);
        if (!decoded || decoded.role !== 'Staff') {
            return res.status(401).json({ success: false, message: 'Unauthorized access.' });
        }

        const approvals = await DocumentApproval.find({ staffEmail: decoded.email })
            .sort({ year: -1, month: -1, requestedAt: -1 })
            .lean();

        res.json({ success: true, approvals });
    } catch (e) {
        console.error('My document approvals error:', e.message);
        res.status(500).json({ success: false, message: 'Failed to fetch document approvals.' });
    }
});

app.get('/api/admin/document-approvals', checkAuth, async (req, res) => {
    try {
        if (!['Admin', 'SuperAdmin', 'SubAdmin'].includes(req.user?.role)) {
            return res.status(403).json({ success: false, message: 'Admin access required.' });
        }

        const statusFilter = String(req.query.status || 'Pending_Approval');
        const query = statusFilter && statusFilter !== 'all' ? { approvalStatus: statusFilter } : {};

        const approvals = await DocumentApproval.find(query)
            .sort({ requestedAt: 1, year: 1, month: 1 })
            .lean();

        const staffEmails = [...new Set(approvals.map((item) => item.staffEmail).filter(Boolean))];
        const staffRows = staffEmails.length
            ? await Staff.find({ email: { $in: staffEmails } }).select('email name empId profilePhoto').lean()
            : [];
        const staffMap = new Map(staffRows.map((row) => [row.email, row]));

        const enriched = approvals.map((item) => {
            const staff = staffMap.get(item.staffEmail) || {};
            return {
                ...item,
                staffName: staff.name || item.staffEmail,
                staffEmpId: staff.empId || '',
                staffId: staff._id || null,
                staffProfilePhoto: staff.profilePhoto || ''
            };
        });

        res.json({ success: true, approvals: enriched });
    } catch (e) {
        console.error('Admin document approvals list error:', e.message);
        res.status(500).json({ success: false, message: 'Failed to fetch document approvals list.' });
    }
});

app.get('/api/admin/preview-document/:docType/:recordId', checkAuth, async (req, res) => {
    try {
        if (!['Admin', 'SuperAdmin', 'SubAdmin'].includes(req.user?.role)) {
            return res.status(403).json({ success: false, message: 'Admin access required.' });
        }

        const requestedDocType = normalizeDocumentType(req.params.docType);
        if (!requestedDocType) {
            return res.status(400).json({ success: false, message: 'Invalid document type.' });
        }

        const approval = await DocumentApproval.findById(req.params.recordId).lean();
        if (!approval) {
            return res.status(404).json({ success: false, message: 'Document approval request not found.' });
        }

        if (approval.documentType !== requestedDocType) {
            return res.status(400).json({ success: false, message: 'Document type mismatch for this approval record.' });
        }

        const staff = await Staff.findOne({ email: approval.staffEmail }).lean();
        if (!staff) {
            return res.status(404).json({ success: false, message: 'Staff profile not found.' });
        }

        const previewStatus = approval.approvalStatus === 'Approved'
            ? 'Pending_Approval'
            : (approval.approvalStatus || 'Unverified');

        const generator = requestedDocType === 'AttendanceReport' ? createAttendanceReportPdf : createPayslipPdf;
        const generatorOptions = requestedDocType === 'AttendanceReport'
            ? previewStatus
            : {
                approvalStatus: previewStatus
            };
        const { pdfBuffer } = requestedDocType === 'AttendanceReport'
            ? await generator(staff, approval.month, approval.year, generatorOptions)
            : await generator(staff, approval.month, approval.year, generatorOptions);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'inline; filename="preview.pdf"');
        res.setHeader('Content-Length', pdfBuffer.length);
        res.end(pdfBuffer);
    } catch (e) {
        console.error('Admin preview document PDF error:', e.message);
        res.status(500).json({ success: false, message: 'Failed to generate preview document PDF.' });
    }
});

app.get('/api/admin/staff/:staffId/download-attendance-report', checkAuth, async (req, res) => {
    try {
        if (!['Admin', 'SuperAdmin', 'SubAdmin'].includes(req.user?.role)) {
            return res.status(403).json({ success: false, message: 'Admin access required.' });
        }

        const staff = await Staff.findById(req.params.staffId).lean();
        if (!staff) return res.status(404).json({ success: false, message: 'Staff profile not found.' });

        const { month, year } = resolveMonthYear(req.query.month, req.query.year);
        const { pdfBuffer, fileName } = await createAttendanceReportPdf(staff, month, year);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
        res.setHeader('Content-Length', pdfBuffer.length);
        res.end(pdfBuffer);
    } catch (e) {
        console.error('Admin attendance report PDF error:', e.message);
        res.status(500).json({ success: false, message: 'Failed to generate attendance report PDF.' });
    }
});

app.get('/api/admin/staff/:staffId/download-payslip', checkAuth, async (req, res) => {
    try {
        if (!['Admin', 'SuperAdmin', 'SubAdmin'].includes(req.user?.role)) {
            return res.status(403).json({ success: false, message: 'Admin access required.' });
        }

        const staff = await Staff.findById(req.params.staffId).lean();
        if (!staff) return res.status(404).json({ success: false, message: 'Staff profile not found.' });

        const { month, year } = resolveMonthYear(req.query.month, req.query.year);
        const { pdfBuffer, fileName } = await createPayslipPdf(staff, month, year);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
        res.setHeader('Content-Length', pdfBuffer.length);
        res.end(pdfBuffer);
    } catch (e) {
        console.error('Admin payslip PDF error:', e.message);
        res.status(500).json({ success: false, message: 'Failed to generate payslip PDF.' });
    }
});

app.get('/api/staff/bounty-tasks', async (req, res) => {
    try {
        const decoded = parseTokenFromRequest(req);
        if (!decoded || decoded.role !== 'Staff') {
            return res.status(401).json({ success: false, message: 'Unauthorized access.' });
        }

        const tasks = await StaffBountyTask.find({ assignedStaffEmail: String(decoded.email || '').trim().toLowerCase() })
            .sort({ createdAt: -1, updatedAt: -1 })
            .lean();

        res.json({ success: true, tasks });
    } catch (e) {
        console.error('Fetch staff bounty tasks error:', e.message);
        res.status(500).json({ success: false, message: 'Failed to fetch your tasks.' });
    }
});

app.post('/api/staff/bounty-tasks/:id/submit', async (req, res) => {
    try {
        const decoded = parseTokenFromRequest(req);
        if (!decoded || decoded.role !== 'Staff') {
            return res.status(401).json({ success: false, message: 'Unauthorized access.' });
        }

        const submissionLink = String(req.body.submissionLink || '').trim();
        if (!submissionLink) {
            return res.status(400).json({ success: false, message: 'Submission link is required.' });
        }

        const task = await StaffBountyTask.findById(req.params.id);
        if (!task) {
            return res.status(404).json({ success: false, message: 'Task not found.' });
        }
        if (task.assignedStaffEmail !== String(decoded.email || '').trim().toLowerCase()) {
            return res.status(403).json({ success: false, message: 'You can only submit your own assigned tasks.' });
        }
        if (!['Assigned', 'Revision'].includes(task.status)) {
            return res.status(400).json({ success: false, message: 'This task is not open for submission.' });
        }

        task.submissionLink = submissionLink;
        task.status = 'Submitted';
        task.adminFeedback = '';
        await task.save();

        io.to('Admin').emit('bounty_task_updated', { action: 'submitted', taskId: task._id });
        io.to(task.assignedStaffEmail).emit('bounty_task_updated', { action: 'submitted', taskId: task._id });

        res.json({ success: true, message: 'Work submitted successfully.' });
    } catch (e) {
        console.error('Submit staff bounty task error:', e.message);
        res.status(500).json({ success: false, message: 'Failed to submit task.' });
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
        const normalizedEmail = String(email || '').trim().toLowerCase();
        const staff = await Staff.findOne({ email: normalizedEmail });

        if (!staff) return res.json({ success: false, message: "Staff not found" });

        const todayIst = getISTDateString(0);
        const currentMonth = Number(todayIst.slice(5, 7));
        const currentYear = Number(todayIst.slice(0, 4));

        const [
            monthlyCommissionSummary,
            completedLeadTasks,
            completedBountyTasks
        ] = await Promise.all([
            getMonthlyApprovedCommissionSummary(normalizedEmail, currentMonth, currentYear),
            Task.countDocuments({
                assignedTo: normalizedEmail,
                status: { $in: ['interested', 'rejected'] }
            }),
            StaffBountyTask.countDocuments({
                assignedStaffEmail: normalizedEmail,
                status: 'Approved'
            })
        ]);

        res.json({
            success: true,
            totalEarnings: staff.totalEarnings || 0,
            pendingPayout: staff.pendingPayout || 0,
            monthlyTarget: staff.monthlyTarget || 50000,
            currentMonthEarnings: monthlyCommissionSummary.totalCommission || 0,
            currentMonthApprovedItems: monthlyCommissionSummary.approvedTaskCount || 0,
            completedTasks: Number(completedLeadTasks || 0) + Number(completedBountyTasks || 0)
        });
    } catch (e) {
        res.status(500).json({ success: false, error: "Fetch Error" });
    }
});

app.get('/api/staff/earnings-ledger', async (req, res) => {
    try {
        const decoded = parseTokenFromRequest(req);
        if (!decoded || decoded.role !== 'Staff') {
            return res.status(401).json({ success: false, message: 'Unauthorized access.' });
        }

        const todayIst = getISTDateString(0);
        const fallbackMonth = Number(todayIst.slice(5, 7));
        const fallbackYear = Number(todayIst.slice(0, 4));
        const month = parsePositiveInt(req.query.month, fallbackMonth);
        const year = parsePositiveInt(req.query.year, fallbackYear);

        const summary = await getMonthlyApprovedCommissionSummary(decoded.email, month, year);
        const rows = (summary.rows || [])
            .slice()
            .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
            .map((row) => {
                const isBounty = String(row.orderId || '').startsWith('BT-');
                const taskName = isBounty
                    ? (row.packageName || 'Bounty Task')
                    : `${row.clientName || 'Client'}${row.packageName ? ` - ${row.packageName}` : ''}`;

                return {
                    date: row.date,
                    dateLabel: row.dateLabel,
                    referenceId: row.orderId || 'NA',
                    taskName,
                    source: isBounty ? 'Bounty' : 'Commission',
                    amount: Number(row.commission || 0),
                    status: 'Credited'
                };
            });

        res.json({
            success: true,
            month,
            year,
            totalAmount: summary.totalCommission || 0,
            totalItems: summary.approvedTaskCount || 0,
            rows
        });
    } catch (e) {
        console.error('Staff earnings ledger error:', e.message);
        res.status(500).json({ success: false, message: 'Failed to fetch earnings ledger.' });
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
            staffEmpId: staff.empId || '',
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

        const staff = await Staff.findOne({ email: payout.staffEmail }).select('name email empId').lean();
        let financeTransaction = null;

        if (payout.financeTransactionId) {
            financeTransaction = await FinancialTransaction.findById(payout.financeTransactionId);
        }
        if (!financeTransaction) {
            financeTransaction = await FinancialTransaction.findOne({ payoutRequestId: payout._id, type: 'SALARY' });
        }
        if (!financeTransaction) {
            financeTransaction = await FinancialTransaction.create({
                title: `Salary payout - ${payout.staffName || staff?.name || payout.staffEmail || 'Staff'}`,
                amount: Number(payout.amount || 0),
                type: 'SALARY',
                kind: 'debit',
                category: 'Payout Approval',
                source: 'PAYOUT_APPROVAL',
                meta: 'Approved payout request',
                notes: `Auto-generated on payout approval for request ${payout._id}`,
                staffName: payout.staffName || staff?.name || '',
                staffEmail: payout.staffEmail || staff?.email || '',
                staffEmpId: payout.staffEmpId || staff?.empId || '',
                payoutRequestId: payout._id,
                date: new Date()
            });
        }

        // 🟢 MAGIC: Staff ke pending payout se amount kaat lo (Total Earnings wahi rahegi)
        await Staff.findOneAndUpdate(
            { email: payout.staffEmail },
            { $inc: { pendingPayout: -payout.amount } }
        );

        // Request ko Paid mark kar do
        payout.status = 'Paid';
        payout.financeTransactionId = financeTransaction._id;
        payout.staffEmpId = payout.staffEmpId || staff?.empId || '';
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

// 1b. Get Announcement Banner Settings
app.get('/api/site-settings/banners', async (req, res) => {
    try {
        const settings = await getOrCreateSiteSettings();
        res.json({ success: true, banners: formatBannerSettings(settings) });
    } catch (e) {
        console.error('Error in GET /api/site-settings/banners:', e);
        res.status(500).json({ success: false, error: 'Failed to load banner settings.' });
    }
});

async function updateBannerSettingsHandler(req, res) {
    try {
        if (!['Admin', 'SuperAdmin', 'SubAdmin'].includes(req.user?.role)) {
            return res.status(403).json({ success: false, error: 'Unauthorized admin access.' });
        }

        const settings = await saveSiteSettingsBanner(req.body || {});
        res.json({
            success: true,
            message: 'Banner settings saved successfully.',
            banners: formatBannerSettings(settings)
        });
    } catch (e) {
        console.error('Error in banner settings update:', e);
        res.status(500).json({ success: false, error: e.message || 'Failed to save banner settings.' });
    }
}

app.post('/api/admin/site-settings/banners', checkAuth, updateBannerSettingsHandler);
app.put('/api/admin/site-settings/banners', checkAuth, updateBannerSettingsHandler);

// ==========================================
// 📜 LEGAL PAGES CMS APIs
// ==========================================
app.get('/api/legal/:slug', async (req, res) => {
    try {
        const page = await LegalPage.findOne({ pageSlug: req.params.slug });
        res.json({ success: true, content: page ? page.content : '' });
    } catch (e) {
        res.status(500).json({ success: false, error: 'Failed to fetch legal page' });
    }
});

app.post('/api/admin/legal/:slug', checkAuth, checkSuperAdmin, async (req, res) => {
    try {
        const { content } = req.body;
        let page = await LegalPage.findOne({ pageSlug: req.params.slug });
        if (page) {
            page.content = content || '';
            await page.save();
        } else {
            page = new LegalPage({ pageSlug: req.params.slug, content: content || '' });
            await page.save();
        }
        res.json({ success: true, message: 'Legal page saved successfully', page });
    } catch (e) {
        res.status(500).json({ success: false, error: 'Failed to save legal page' });
    }
});

// 2. Fetch Chat History (Pichle 100 messages)
app.get('/api/chat/history', async (req, res) => {
    try {
        const messages = await Chat.find().sort({ date: 1 }).limit(100);
        const pinnedMessage = await Chat.findOne({ isPinned: true }).sort({ pinnedAt: -1, date: -1 });
        res.json({ success: true, messages, pinnedMessage });
    } catch (e) { res.status(500).json({ success: false }); }
});

// 2.5 Mobile/API Send Message
app.post('/api/chat/send', async (req, res) => {
    try {
        const role = req.body.role === 'Admin' ? 'Admin' : 'Staff';
        const senderEmail = String(req.body.senderEmail || '').trim().toLowerCase();
        const senderName = String(req.body.senderName || '').trim();
        const message = String(req.body.message || '').trim();
        const fileUrl = String(req.body.fileUrl || '').trim();
        const fileType = String(req.body.fileType || '').trim();
        const fileName = String(req.body.fileName || '').trim();

        if (!message && !fileUrl) {
            return res.status(400).json({ success: false, message: 'Message cannot be empty.' });
        }

        const settings = await AppSettings.findOne();
        if (settings && settings.isChatBlocked && role !== 'Admin') {
            return res.status(403).json({ success: false, message: 'Admin has blocked the team chat.' });
        }

        let staffRecord = null;
        if (role !== 'Admin') {
            if (!senderEmail) {
                return res.status(400).json({ success: false, message: 'Sender email is required.' });
            }

            staffRecord = await Staff.findOne({ email: senderEmail });
            if (!staffRecord) {
                return res.status(404).json({ success: false, message: 'Staff account not found.' });
            }

            if (staffRecord.isMuted) {
                return res.status(403).json({ success: false, message: 'You have been muted by Admin.' });
            }
        }

        const newMessage = new Chat({
            senderName: senderName || staffRecord?.name || 'Staff Member',
            senderEmail: senderEmail || staffRecord?.email || '',
            role,
            message,
            fileUrl,
            fileType,
            fileName,
            profilePhoto: String(req.body.profilePhoto || '').trim() || staffRecord?.profilePhoto || '',
            replyTo: req.body.replyTo ? {
                messageId: req.body.replyTo.messageId || null,
                senderName: req.body.replyTo.senderName || '',
                previewText: req.body.replyTo.previewText || ''
            } : undefined
        });

        await newMessage.save();
        io.to('admin_team_room').emit('team_receive_msg', newMessage);

        res.json({ success: true, message: 'Message sent successfully.', chatMessage: newMessage });
    } catch (e) {
        console.error('Chat send API error:', e.message);
        res.status(500).json({ success: false, message: 'Failed to send chat message.' });
    }
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
            fileType = 'image';
            if (req.query.cloudinary === 'true') {
                // 📸 Image → Cloudinary (Preserve Transparency)
                fileUrl = await uploadToCloudinary(file.buffer, fileName, mimeType);
                console.log('✅ Image uploaded to Cloudinary:', fileUrl);
            } else {
                // 📸 Image → ImgBB
                const base64Image = file.buffer.toString('base64');
                fileUrl = await uploadToImgBB(base64Image);
                console.log('✅ Image uploaded to ImgBB:', fileUrl);
            }
        } else if (mimeType === 'application/pdf') {
            // 📄 PDF → Cloudinary
            fileType = 'pdf';
            fileUrl = await uploadToCloudinary(file.buffer, fileName, mimeType);
            console.log('✅ PDF uploaded to Cloudinary:', fileUrl);
        } else if (mimeType.startsWith('audio/')) {
            // 🎤 Audio (Voice Notes) → Cloudinary
            fileType = 'audio';
            fileUrl = await uploadToCloudinary(file.buffer, fileName, mimeType);
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
        io.to('admin_team_room').emit('team_chat_status_changed', { isChatBlocked: settings.isChatBlocked });
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
        const deleted = await Chat.findByIdAndDelete(req.params.id);
        io.to('admin_team_room').emit('team_message_deleted', req.params.id); // Live sabke screen se message hatao
        if (deleted?.isPinned) {
            io.to('admin_team_room').emit('team_message_pinned', null);
        }
        res.json({ success: true, message: "Message Deleted 🗑️" });
    } catch (e) { res.status(500).json({ success: false }); }
});

app.post('/api/admin/pin-message/:id', checkAuth, async (req, res) => {
    try {
        await Chat.updateMany({ isPinned: true }, { $set: { isPinned: false, pinnedAt: null } });
        const message = await Chat.findByIdAndUpdate(
            req.params.id,
            { $set: { isPinned: true, pinnedAt: new Date() } },
            { new: true }
        );
        if (!message) return res.status(404).json({ success: false, message: 'Message not found.' });
        io.to('admin_team_room').emit('team_message_pinned', message);
        res.json({ success: true, message: 'Message pinned successfully.', pinnedMessage: message });
    } catch (e) {
        res.status(500).json({ success: false, message: 'Failed to pin message.' });
    }
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

// ==========================================
// 🏢 SERVICE SCHEMA
// ==========================================
const serviceSchema = new mongoose.Schema({
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true },  // e.g. 'instagram-growth'
    tagline: { type: String, default: '' },
    description: { type: String, default: '' },            // Short (for cards)
    fullDescription: { type: String, default: '' },        // Long (for detail page)
    aboutText: { type: String, default: '' },
    icon: { type: String, default: '🚀' },
    benefits: [{ iconUrl: String, title: String, description: String }],
    processSteps: [{ stepNumber: Number, title: String, description: String }],
    faqs: [{ question: String, answer: String }],
    isActive: { type: Boolean, default: true }
}, { timestamps: true });
const Service = mongoose.model('Service', serviceSchema);

// ==========================================
// 📦 PACKAGE SCHEMA (with Manual Geo-Pricing)
// ==========================================
const packageSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, default: '' },
    features: [String],
    serviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: true },
    rating: { type: Number, default: 4.9, min: 1, max: 5 },
    faqs: [{ question: String, answer: String }],
    reviews: [{
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        userName: String,
        rating: { type: Number, min: 1, max: 5 },
        comment: String,
        status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
        createdAt: { type: Date, default: Date.now }
    }],
    pricing: {
        priceIN: { type: Number, required: true },     // India price in ₹
        priceUS: { type: Number, required: true },     // USA price in $
        priceGlobal: { type: Number, required: true } // Rest of world in $
    },
    isActive: { type: Boolean, default: true },
    isFeatured: { type: Boolean, default: false }
}, { timestamps: true });
const Package = mongoose.model('Package', packageSchema);

// ==========================================
// 🛒 CART SCHEMA (Server-side, auth-linked)
// ==========================================
const cartItemSchema = new mongoose.Schema({
    packageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Package', required: true },
    quantity: { type: Number, default: 1, min: 1 },
    priceAtAdd: Number,   // Price locked at time of adding
    currency: { type: String, default: 'INR' } // 'INR', 'USD'
});
const cartSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    items: [cartItemSchema],
    updatedAt: { type: Date, default: Date.now }
});
const Cart = mongoose.model('Cart', cartSchema);

// ==========================================
// 🚀 SMM PLATFORM SCHEMA & MODEL
// ==========================================
const smmPlatformSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    logoUrl: { type: String, required: true }
}, { timestamps: true });
const SmmPlatform = mongoose.model('SmmPlatform', smmPlatformSchema);

// ==========================================
// 💳 PAYMENT GATEWAY SCHEMA & MODEL
// ==========================================
const paymentGatewaySchema = new mongoose.Schema({
    gatewayId: { type: String, required: true, unique: true },
    isActive: { type: Boolean, default: false },
    apiKey: { type: String, required: true },
    apiSecret: { type: String, required: true },
    minOrder: { type: Number, default: 0 },
    maxOrder: { type: Number, default: 0 }
}, { timestamps: true });
const PaymentGateway = mongoose.models.PaymentGateway || mongoose.model('PaymentGateway', paymentGatewaySchema);

function encryptGatewaySecret(text) {
    if (!text) return text;
    const algorithm = 'aes-256-cbc';
    const key = crypto.createHash('sha256').update(process.env.JWT_SECRET || 'fallback_secret').digest();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return `${iv.toString('hex')}:${encrypted}`;
}

function decryptGatewaySecret(text) {
    if (!text) return text;
    try {
        const parts = text.split(':');
        if (parts.length !== 2) return text;
        const iv = Buffer.from(parts[0], 'hex');
        const encryptedText = Buffer.from(parts[1], 'hex');
        const algorithm = 'aes-256-cbc';
        const key = crypto.createHash('sha256').update(process.env.JWT_SECRET || 'fallback_secret').digest();
        const decipher = crypto.createDecipheriv(algorithm, key, iv);
        let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    } catch (err) {
        console.error('Decryption failed', err);
        return text;
    }
}

// ==========================================
// 🚀 SMM SERVICE SCHEMA & MODEL
// ==========================================
const DEFAULT_SMM_PLATFORM_LOGO = '/assets/images/default-platform.png';

const smmVariantSchema = new mongoose.Schema({
    name: { type: String, required: true },
    country: { type: String, default: '' },
    speed: { type: String, default: '' },
    refill: { type: String, default: '' },
    variantId: { type: Number, default: null },
    hasDynamicInput: { type: Boolean, default: false },
    inputType: { type: String, enum: ['none', 'text', 'textarea'], default: 'none' },
    inputLabel: { type: String, default: '' },
    discountPercent: { type: Number, default: 0 },
    price: { type: Number, required: true },
    minQty: { type: Number, required: true },
    maxQty: { type: Number, required: true },
    legacyServiceIds: { type: [String], default: [] } // Internal compatibility map for legacy links
}, { _id: false });

const smmServiceSchema = new mongoose.Schema({
    serviceId: { type: Number, required: true, unique: true },
    legacyServiceIds: { type: [String], default: [] },
    platform: { type: String, required: true },
    category: { type: String, required: true },
    description: { type: String, default: '' },
    variants: { type: [smmVariantSchema], default: [] }
}, { timestamps: true });
const SmmService = mongoose.model('SmmService', smmServiceSchema);

function trimSmmText(value, fallback = '') {
    const normalized = value == null ? '' : String(value).trim();
    return normalized || fallback;
}

function uniqueSmmStrings(values = []) {
    return [...new Set((Array.isArray(values) ? values : [values]).map((value) => trimSmmText(value)).filter(Boolean))];
}

function compareSmmStrings(left, right) {
    return trimSmmText(left).localeCompare(trimSmmText(right), 'en', { sensitivity: 'base' });
}

function normalizeSmmInputType(value) {
    const normalized = trimSmmText(value).toLowerCase();
    if (normalized === 'textarea') return 'textarea';
    if (normalized === 'text') return 'text';
    return 'none';
}

function normalizeSmmQuantity(value, fallback) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) {
        return fallback;
    }
    return Math.round(parsed);
}

function normalizeSmmPrice(value, fallback = 0) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) {
        return fallback;
    }
    return Number(parsed.toFixed(2));
}

function normalizeSmmDiscountPercent(value, fallback = 0) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) {
        return fallback;
    }
    return Number(Math.min(100, parsed).toFixed(2));
}

function getSmmVariantPricing(variant = {}) {
    const basePrice = normalizeSmmPrice(variant?.price, 0);
    const discountPercent = normalizeSmmDiscountPercent(variant?.discountPercent, 0);
    const discountAmount = discountPercent > 0
        ? Number((basePrice * (discountPercent / 100)).toFixed(2))
        : 0;
    const effectivePrice = Number(Math.max(0, basePrice - discountAmount).toFixed(2));

    return {
        basePrice,
        discountPercent,
        discountAmount,
        effectivePrice
    };
}

function buildSmmPlatformPrefix(platform) {
    const normalized = trimSmmText(platform).toLowerCase();
    if (normalized.includes('insta')) return 'ig';
    if (normalized.includes('youtube') || normalized === 'yt') return 'yt';
    if (normalized.includes('facebook') || normalized === 'fb') return 'fb';
    if (normalized.includes('twitter') || normalized === 'x') return 'tw';
    if (normalized.includes('tiktok')) return 'tk';
    if (normalized.includes('telegram')) return 'tg';
    return (normalized.replace(/[^a-z0-9]/g, '').slice(0, 3) || 'smm');
}

function buildSmmServiceId(platform, category) {
    const prefix = buildSmmPlatformPrefix(platform);
    const slug = trimSmmText(category)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    return `${prefix}-${slug || 'service'}`;
}

function normalizeSmmServiceIdValue(value) {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function collectSmmGlobalIdState(services = []) {
    const state = {
        maxId: 1097
    };

    const register = (value) => {
        const parsed = Number(value);
        if (Number.isInteger(parsed) && parsed >= 1098 && parsed > state.maxId) {
            state.maxId = parsed;
        }
    };

    (Array.isArray(services) ? services : []).forEach((service) => {
        register(service?.serviceId);
        (Array.isArray(service?.variants) ? service.variants : []).forEach((variant) => register(variant?.variantId));
    });

    return state;
}

function assignSmmVariantIdsInPlace(variants = [], state = collectSmmGlobalIdState()) {
    const nextState = state || collectSmmGlobalIdState();

    return (Array.isArray(variants) ? variants : []).map((variant) => {
        const existingVariantId = normalizeSmmServiceIdValue(variant?.variantId);

        if (Number.isInteger(existingVariantId) && existingVariantId > 0) {
            if (existingVariantId > nextState.maxId) {
                nextState.maxId = existingVariantId;
            }

            return {
                ...variant,
                variantId: existingVariantId
            };
        }

        nextState.maxId += 1;
        return {
            ...variant,
            variantId: nextState.maxId
        };
    });
}

async function getSmmGlobalIdState() {
    const services = await SmmService.find({}, 'serviceId variants.variantId').lean();
    return collectSmmGlobalIdState(services);
}

async function findSmmServiceByAnyId(anyServiceId) {
    const normalizedId = trimSmmText(anyServiceId);
    if (!normalizedId) return null;

    const numericServiceId = normalizeSmmServiceIdValue(normalizedId);
    return SmmService.findOne({
        $or: [
            ...(numericServiceId !== null ? [{ serviceId: numericServiceId }] : []),
            { legacyServiceIds: normalizedId },
            { 'variants.legacyServiceIds': normalizedId }
        ]
    });
}

function buildLegacySmmDescription(rawDoc = {}) {
    const description = trimSmmText(rawDoc.description || rawDoc.serviceDetails?.description);
    const startTime = trimSmmText(rawDoc.serviceDetails?.startTime);
    const parts = [];
    if (description) parts.push(description);
    if (startTime) parts.push(`Start time: ${startTime}`);
    return parts.join('\n\n');
}

function buildLegacyDynamicInput(rawDoc = {}) {
    const legacyExtraType = trimSmmText(rawDoc.extraInputType).toLowerCase();
    const hasDynamicInput = rawDoc.hasDynamicInput === true
        || rawDoc.hasCustomInput === true
        || ['custom_comments', 'poll_option', 'mentions'].includes(legacyExtraType);

    if (!hasDynamicInput) {
        return {
            hasDynamicInput: false,
            inputType: 'none',
            inputLabel: ''
        };
    }

    let inputType = normalizeSmmInputType(rawDoc.inputType || rawDoc.customInputType);
    if (inputType === 'none') {
        inputType = legacyExtraType === 'custom_comments' ? 'textarea' : 'text';
    }

    const inputLabel = trimSmmText(
        rawDoc.inputLabel
        || rawDoc.customInputLabel
        || (legacyExtraType === 'custom_comments' ? 'Enter Custom Comments (1 per line)' : 'Enter details')
    );

    return {
        hasDynamicInput: true,
        inputType,
        inputLabel
    };
}

function normalizeSmmVariantDynamicInput(rawVariant = {}, fallback = {}) {
    const rawInputType = normalizeSmmInputType(rawVariant.inputType || rawVariant.customInputType);
    const fallbackInputType = normalizeSmmInputType(fallback.inputType);
    const rawLabel = trimSmmText(rawVariant.inputLabel || rawVariant.customInputLabel);
    const fallbackLabel = trimSmmText(fallback.inputLabel);
    const hasDynamicInput = rawVariant.hasDynamicInput === true
        || rawVariant.hasCustomInput === true
        || fallback.hasDynamicInput === true
        || rawInputType !== 'none'
        || fallbackInputType !== 'none'
        || Boolean(rawLabel || fallbackLabel);

    if (!hasDynamicInput) {
        return {
            hasDynamicInput: false,
            inputType: 'none',
            inputLabel: ''
        };
    }

    const inputType = rawInputType !== 'none'
        ? rawInputType
        : (fallbackInputType !== 'none' ? fallbackInputType : 'text');

    return {
        hasDynamicInput: true,
        inputType,
        inputLabel: rawLabel || fallbackLabel || (inputType === 'textarea' ? 'Enter Custom Comments (1 per line)' : 'Enter details')
    };
}

function buildLegacyVariantName(rawDoc = {}, rawVariant = {}, category = '') {
    const explicitName = trimSmmText(rawVariant.name);
    if (explicitName) {
        return explicitName;
    }

    const serviceType = trimSmmText(rawDoc.serviceType);
    const quality = trimSmmText(rawVariant.quality);

    if (serviceType && quality && quality.toLowerCase() !== 'standard' && !serviceType.toLowerCase().includes(quality.toLowerCase())) {
        return `${serviceType} - ${quality}`;
    }

    return serviceType || quality || trimSmmText(category, 'Standard');
}

function normalizeSmmVariant(rawVariant = {}, fallback = {}) {
    const name = trimSmmText(rawVariant.name || fallback.name, 'Standard');
    const minQty = normalizeSmmQuantity(rawVariant.minQty ?? fallback.minQty, fallback.minQty ?? 10);
    const fallbackMaxQty = Math.max(minQty, normalizeSmmQuantity(fallback.maxQty, 10000));
    let maxQty = normalizeSmmQuantity(rawVariant.maxQty ?? fallback.maxQty, fallbackMaxQty);
    if (maxQty < minQty) {
        maxQty = minQty;
    }

    return {
        variantId: rawVariant.variantId || fallback.variantId,
        name,
        country: trimSmmText(rawVariant.country || fallback.country),
        speed: trimSmmText(rawVariant.speed || fallback.speed),
        refill: trimSmmText(rawVariant.refill ?? rawVariant.refillGuarantee ?? fallback.refill),
        ...normalizeSmmVariantDynamicInput(rawVariant, fallback),
        discountPercent: normalizeSmmDiscountPercent(rawVariant.discountPercent ?? fallback.discountPercent, normalizeSmmDiscountPercent(fallback.discountPercent, 0)),
        price: normalizeSmmPrice(rawVariant.price, normalizeSmmPrice(fallback.price, 0)),
        minQty,
        maxQty,
        legacyServiceIds: uniqueSmmStrings(rawVariant.legacyServiceIds || fallback.legacyServiceIds || [])
    };
}

function getSmmVariantSignature(variant = {}) {
    return [
        trimSmmText(variant.name).toLowerCase(),
        trimSmmText(variant.country).toLowerCase(),
        trimSmmText(variant.speed).toLowerCase(),
        trimSmmText(variant.refill).toLowerCase(),
        Number(variant.discountPercent || 0).toFixed(2),
        Number(variant.price || 0).toFixed(2),
        Number(variant.minQty || 0),
        Number(variant.maxQty || 0)
    ].join('|');
}
async function ensureSmmPlatformExists(platformName) {
    const normalizedName = trimSmmText(platformName);
    if (!normalizedName) return;

    const existingPlatform = await SmmPlatform.findOne({
        name: new RegExp(`^${escapeRegex(normalizedName)}$`, 'i')
    });

    if (!existingPlatform) {
        await SmmPlatform.create({
            name: normalizedName,
            logoUrl: DEFAULT_SMM_PLATFORM_LOGO
        });
    }
}

function getSmmVariantQuantityBounds(variant = {}) {
    const minQty = normalizeSmmQuantity(variant?.minQty, 1);
    let maxQty = normalizeSmmQuantity(variant?.maxQty, Math.max(minQty, 1));
    if (maxQty < minQty) {
        maxQty = minQty;
    }
    return { minQty, maxQty };
}

function calculateSmmVariantTotal(quantity, variant = {}) {
    const parsedQuantity = Number(quantity);
    const ratePer1000 = getSmmVariantPricing(variant).effectivePrice;
    if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0 || !Number.isFinite(ratePer1000) || ratePer1000 <= 0) {
        return 0;
    }
    return parseFloat(((parsedQuantity / 1000) * ratePer1000).toFixed(2));
}

function normalizeCheckoutTotal(value) {
    const parsed = Number(String(value ?? '').replace(/,/g, '').replace(/[^\d.-]/g, ''));
    return Number.isFinite(parsed) && parsed >= 0 ? Number(parsed.toFixed(2)) : null;
}

function normalizeCouponCode(value) {
    return trimSmmText(value).toUpperCase();
}

function computeCouponDiscount(coupon = {}, cartTotal = 0) {
    const total = Number(cartTotal);
    if (!Number.isFinite(total) || total < 0) {
        return {
            discountAmount: 0,
            finalTotal: 0
        };
    }

    const discountType = trimSmmText(coupon.discountType).toLowerCase() === 'fixed' ? 'fixed' : 'percent';
    const discountValue = Number(coupon.discountValue || 0);
    const safeDiscountValue = Number.isFinite(discountValue) && discountValue > 0 ? discountValue : 0;

    let discountAmount = 0;
    if (discountType === 'percent') {
        discountAmount = total * (safeDiscountValue / 100);
    } else {
        discountAmount = safeDiscountValue;
    }

    const maxDiscountAmount = normalizeCouponAmount(coupon.maxDiscountAmount, 0);
    if (maxDiscountAmount > 0) {
        discountAmount = Math.min(discountAmount, maxDiscountAmount);
    }

    discountAmount = Number(Math.min(total, Math.max(0, discountAmount)).toFixed(2));
    const finalTotal = Number(Math.max(0, total - discountAmount).toFixed(2));

    return {
        discountAmount,
        finalTotal
    };
}

async function resolveCouponCheckoutPricing({ code, cartTotal, moduleName, user }) {
    const normalizedCode = normalizeCouponCode(code);
    const normalizedModule = normalizeCouponModuleKey(moduleName);
    const normalizedTotal = normalizeCheckoutTotal(cartTotal);

    if (!normalizedCode) {
        const error = new Error('Coupon code is required.');
        error.status = 400;
        throw error;
    }

    if (!normalizedModule) {
        const error = new Error('Module is required.');
        error.status = 400;
        throw error;
    }

    if (!user) {
        const error = new Error('Login required to use promo codes');
        error.status = 401;
        throw error;
    }

    if (normalizedTotal === null || normalizedTotal <= 0) {
        const error = new Error('A valid cart total is required.');
        error.status = 400;
        throw error;
    }

    const coupon = await Coupon.findOne({ code: new RegExp(`^${escapeRegex(normalizedCode)}$`, 'i') }).lean();
    if (!coupon) {
        const error = new Error('Invalid coupon code.');
        error.status = 400;
        throw error;
    }

    if (!coupon.isActive) {
        const error = new Error('This coupon is inactive.');
        error.status = 400;
        throw error;
    }

    const expiryDate = normalizeCouponExpiryDate(coupon.expiryDate || coupon.expiresAt);
    if (expiryDate) {
        if (!Number.isNaN(expiryDate.getTime()) && expiryDate.getTime() < Date.now()) {
            const error = new Error('This coupon has expired.');
            error.status = 400;
            throw error;
        }
    }

    const minOrderValue = normalizeCouponAmount(coupon.minOrderValue, 0);
    if (minOrderValue > 0 && normalizedTotal < minOrderValue) {
        const error = new Error(`Minimum order value for this coupon is ${minOrderValue.toFixed(2)}.`);
        error.status = 400;
        throw error;
    }

    const usageLimit = normalizeCouponLimit(coupon.usageLimit, 0);
    const usageCount = normalizeCouponLimit(coupon.usageCount, 0);
    if (usageLimit > 0 && usageCount >= usageLimit) {
        const error = new Error('This coupon has reached its usage limit.');
        error.status = 400;
        throw error;
    }

    if (!couponAppliesToModule(coupon, normalizedModule)) {
        const error = new Error('This coupon is not valid for the selected checkout module.');
        error.status = 400;
        throw error;
    }

    if (Array.isArray(coupon.allowedUsers) && coupon.allowedUsers.length > 0) {
        const userId = user?._id ? String(user._id) : '';
        const allowedUsers = Array.isArray(coupon.allowedUsers) ? coupon.allowedUsers.map((entry) => String(entry)) : [];
        if (!userId || !allowedUsers.includes(userId)) {
            const error = new Error('You are not eligible for this coupon.');
            error.status = 400;
            throw error;
        }
    }

    const pricing = computeCouponDiscount(coupon, normalizedTotal);
    return {
        module: normalizedModule,
        cartTotal: normalizedTotal,
        discountAmount: pricing.discountAmount,
        finalTotal: pricing.finalTotal,
        coupon: {
            code: coupon.code,
            discountType: coupon.discountType,
            discountValue: coupon.discountValue,
            maxDiscountAmount: normalizeCouponAmount(coupon.maxDiscountAmount, 0),
            minOrderValue,
            applicableModules: normalizeCouponModules(coupon.applicableModules, { defaultToAll: coupon.isGlobal !== false }),
            usageLimit,
            usageCount,
            isGlobal: coupon.isGlobal,
            expiryDate: expiryDate ? expiryDate.toISOString() : null,
            expiresAt: expiryDate ? expiryDate.toISOString() : null
        }
    };
}

async function resolveSmmServiceSelection(anyServiceId, requestedVariantIndex = 0, requestedVariantId = null) {
    const normalizedId = trimSmmText(anyServiceId);
    const normalizedVariantId = normalizeSmmServiceIdValue(requestedVariantId);
    if (!normalizedId && normalizedVariantId === null) return null;
    const numericServiceId = normalizeSmmServiceIdValue(normalizedId);

    const service = await SmmService.findOne({
        $or: [
            ...(numericServiceId !== null ? [{ serviceId: numericServiceId }] : []),
            { legacyServiceIds: normalizedId },
            { 'variants.legacyServiceIds': normalizedId },
            ...(numericServiceId !== null ? [{ 'variants.variantId': numericServiceId }] : []),
            ...(normalizedVariantId !== null ? [{ 'variants.variantId': normalizedVariantId }] : [])
        ]
    }).lean();

    if (!service) {
        return null;
    }

    const variants = Array.isArray(service.variants) ? service.variants : [];
    let variantIndex = Number.isInteger(Number(requestedVariantIndex)) ? Number(requestedVariantIndex) : 0;

    if (normalizedVariantId !== null) {
        const matchedVariantIndex = variants.findIndex((variant) => Number(variant?.variantId) === normalizedVariantId);
        if (matchedVariantIndex >= 0) {
            variantIndex = matchedVariantIndex;
        }
    }

    if (numericServiceId === null || Number(service.serviceId) !== numericServiceId) {
        const mappedVariantIndex = variants.findIndex((variant) => Array.isArray(variant?.legacyServiceIds) && variant.legacyServiceIds.includes(normalizedId));
        if (mappedVariantIndex >= 0) {
            variantIndex = mappedVariantIndex;
        }
    }

    if (variantIndex < 0 || variantIndex >= variants.length) {
        variantIndex = 0;
    }

    return {
        service,
        canonicalServiceId: service.serviceId,
        variantIndex,
        variant: variants[variantIndex] || null
    };
}

async function initSmmServices() {
    // Absolutely no hardcoded data allowed.
    // The SMM platform is 100% dynamic and managed solely via the Admin Panel UI.
    return;
}
initSmmServices();


async function initSmmPlatforms() {
    // Absolutely no hardcoded platforms allowed.
    // Platforms must be managed entirely from the Admin Panel UI.
    return;
}
initSmmPlatforms();

// ==========================================
// 🚀 SMM PLATFORM API ENDPOINTS
// ==========================================

// GET all SMM platforms
app.get('/api/platforms', async (req, res) => {
    try {
        const platforms = await SmmPlatform.find().sort({ name: 1 });
        res.json({ success: true, platforms });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// POST a new SMM platform (Admin authenticated)
app.post('/api/platforms', checkAuth, async (req, res) => {
    try {
        if (!['Admin', 'SuperAdmin', 'SubAdmin'].includes(req.user.role)) {
            return res.status(403).json({ success: false, error: 'Unauthorized admin access.' });
        }
        const { name, logoUrl } = req.body;
        if (!name || !logoUrl) {
            return res.status(400).json({ success: false, error: 'Name and logoUrl are required.' });
        }

        const existing = await SmmPlatform.findOne({ name: new RegExp(`^${escapeRegex(name)}$`, 'i') });
        if (existing) {
            return res.status(400).json({ success: false, error: 'Platform name already exists.' });
        }

        const newPlatform = new SmmPlatform({ name, logoUrl });
        await newPlatform.save();
        res.json({ success: true, platform: newPlatform });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// PUT (update) SMM platform (Admin authenticated)
app.put('/api/platforms/:id', checkAuth, async (req, res) => {
    try {
        if (!['Admin', 'SuperAdmin', 'SubAdmin'].includes(req.user.role)) {
            return res.status(403).json({ success: false, error: 'Unauthorized admin access.' });
        }
        const { id } = req.params;
        const { name, logoUrl } = req.body;

        const platform = await SmmPlatform.findById(id);
        if (!platform) {
            return res.status(404).json({ success: false, error: 'Platform not found.' });
        }

        if (name) {
            const dupe = await SmmPlatform.findOne({ _id: { $ne: id }, name: new RegExp(`^${escapeRegex(name)}$`, 'i') });
            if (dupe) {
                return res.status(400).json({ success: false, error: 'Another platform with this name already exists.' });
            }
            platform.name = name;
        }
        if (logoUrl) {
            platform.logoUrl = logoUrl;
        }

        await platform.save();
        res.json({ success: true, platform });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// DELETE SMM platform (Admin authenticated)
app.delete('/api/platforms/:id', checkAuth, async (req, res) => {
    try {
        if (!['Admin', 'SuperAdmin', 'SubAdmin'].includes(req.user.role)) {
            return res.status(403).json({ success: false, error: 'Unauthorized admin access.' });
        }
        const { id } = req.params;
        const result = await SmmPlatform.findByIdAndDelete(id);
        if (!result) {
            return res.status(404).json({ success: false, error: 'Platform not found.' });
        }
        res.json({ success: true, message: 'Platform deleted successfully.' });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// ==========================================
// 🚀 SMM RATE API ENDPOINTS
// ==========================================

app.get('/api/admin/smm/options', checkAuth, async (req, res) => {
    try {
        if (!['Admin', 'SuperAdmin', 'SubAdmin'].includes(req.user.role)) {
            return res.status(403).json({ success: false, error: 'Unauthorized admin access.' });
        }

        const requestedPlatform = trimSmmText(req.query.platform);
        const [servicePlatforms, brandedPlatforms] = await Promise.all([
            SmmService.distinct('platform'),
            SmmPlatform.distinct('name')
        ]);

        const platforms = uniqueSmmStrings([...servicePlatforms, ...brandedPlatforms]).sort(compareSmmStrings);
        let categories = [];

        if (requestedPlatform) {
            categories = uniqueSmmStrings(await SmmService.find({
                platform: new RegExp(`^${escapeRegex(requestedPlatform)}$`, 'i')
            }).distinct('category')).sort(compareSmmStrings);
        }

        res.json({ success: true, platforms, categories });
    } catch (e) {
        console.error("Error in GET /api/admin/smm/options:", e);
        res.status(500).json({ success: false, error: e.message });
    }
});

// GET all SMM rates (Public)
app.get('/api/smm/rates', async (req, res) => {
    try {
        const rates = await SmmService.find({}, 'serviceId legacyServiceIds platform category description variants')
            .sort({ platform: 1, category: 1 })
            .lean();
        res.json({ success: true, rates });
    } catch (e) {
        console.error("Error in GET /api/smm/rates:", e);
        res.status(500).json({ success: false, error: e.message });
    }
});

// GET exact checkout service details by variantId
app.get('/api/checkout/service-details', async (req, res) => {
    try {
        const requestedVariantId = Number(req.query.variantId);
        if (!Number.isInteger(requestedVariantId) || requestedVariantId <= 0) {
            return res.status(400).json({ success: false, error: 'Missing variantId' });
        }

        const serviceDoc = await SmmService.findOne({ 'variants.variantId': requestedVariantId }).lean();
        if (!serviceDoc) {
            return res.status(404).json({ success: false, error: 'Service not found' });
        }

        const exactVariant = Array.isArray(serviceDoc.variants)
            ? serviceDoc.variants.find((variant) => Number(variant?.variantId) === requestedVariantId)
            : null;

        if (!exactVariant) {
            return res.status(404).json({ success: false, error: 'Variant not found' });
        }

        res.json({
            success: true,
            service: {
                serviceId: serviceDoc.serviceId,
                platform: serviceDoc.platform,
                category: serviceDoc.category,
                description: serviceDoc.description || ''
            },
            variant: exactVariant
        });
    } catch (e) {
        console.error("Error in GET /api/checkout/service-details:", e);
        res.status(500).json({ success: false, error: e.message });
    }
});

// POST/UPSERT SMM rate (Admin authenticated)
app.post('/api/admin/smm/rates', checkAuth, async (req, res) => {
    try {
        if (!['Admin', 'SuperAdmin', 'SubAdmin'].includes(req.user.role)) {
            return res.status(403).json({ success: false, error: 'Unauthorized admin access.' });
        }
        console.log("Incoming Variants Payload:", JSON.stringify(req.body.variants, null, 2));
        const {
            existingServiceId,
            platform,
            category,
            description,
            hasDynamicInput,
            inputType,
            inputLabel,
            variants
        } = req.body;

        const normalizedPlatform = trimSmmText(platform);
        const normalizedCategory = trimSmmText(category);
        const legacyDynamicEnabled = hasDynamicInput === true || hasDynamicInput === 'true';
        const legacyDynamicType = normalizeSmmInputType(inputType);
        const legacyDynamicLabel = trimSmmText(inputLabel);
        const existingService = await findSmmServiceByAnyId(existingServiceId);

        if (!normalizedPlatform || !normalizedCategory || !Array.isArray(variants) || variants.length === 0) {
            return res.status(400).json({ success: false, error: 'Platform, category, and at least one variant are required.' });
        }

        const normalizedVariants = variants.map((variant) => normalizeSmmVariant(variant, {
            minQty: variant?.hasDynamicInput === true && normalizeSmmInputType(variant.inputType) === 'textarea' ? 1 : 10,
            maxQty: 10000,
            hasDynamicInput: legacyDynamicEnabled,
            inputType: legacyDynamicType,
            inputLabel: legacyDynamicLabel
        }));
        let globalMaxId = 1097;
        const allServices = await SmmService.find({}, 'serviceId variants.variantId').lean();
        allServices.forEach((serviceDoc) => {
            const serviceId = Number(serviceDoc?.serviceId);
            if (Number.isInteger(serviceId) && serviceId > globalMaxId) {
                globalMaxId = serviceId;
            }

            (Array.isArray(serviceDoc?.variants) ? serviceDoc.variants : []).forEach((variant) => {
                const variantId = Number(variant?.variantId);
                if (Number.isInteger(variantId) && variantId > globalMaxId) {
                    globalMaxId = variantId;
                }
            });
        });

        const normalizedVariantsWithIds = normalizedVariants.map((incomingVariant) => {
            const existingVariantId = Number(incomingVariant?.variantId);
            if (Number.isInteger(existingVariantId) && existingVariantId > 0) {
                return {
                    ...incomingVariant,
                    variantId: existingVariantId
                };
            }

            globalMaxId += 1;
            return {
                ...incomingVariant,
                variantId: globalMaxId
            };
        });

        const invalidVariant = normalizedVariantsWithIds.find((variant) => {
            return !trimSmmText(variant.name)
                || !Number.isFinite(Number(variant.price))
                || Number(variant.price) <= 0
                || !Number.isFinite(Number(variant.minQty))
                || Number(variant.minQty) <= 0
                || !Number.isFinite(Number(variant.maxQty))
                || Number(variant.maxQty) < Number(variant.minQty);
        });

        if (invalidVariant) {
            return res.status(400).json({ success: false, error: 'Each variant must have a name, positive price, and valid min/max quantities.' });
        }

        const duplicateFilter = {
            platform: new RegExp(`^${escapeRegex(normalizedPlatform)}$`, 'i'),
            category: new RegExp(`^${escapeRegex(normalizedCategory)}$`, 'i')
        };
        if (existingService?.serviceId != null) {
            duplicateFilter.serviceId = { $ne: existingService.serviceId };
        }

        const duplicate = await SmmService.findOne(duplicateFilter);

        if (duplicate) {
            return res.status(409).json({ success: false, error: 'A service for this platform and category already exists.' });
        }

        let service = existingService;
        if (!service) {
            service = await SmmService.findOne({
                platform: new RegExp(`^${escapeRegex(normalizedPlatform)}$`, 'i'),
                category: new RegExp(`^${escapeRegex(normalizedCategory)}$`, 'i')
            });
        }

        let serviceId = service?.serviceId ?? null;
        if (serviceId == null) {
            globalMaxId += 1;
            serviceId = globalMaxId;
        }

        const nextService = {
            serviceId,
            legacyServiceIds: uniqueSmmStrings(service?.legacyServiceIds || []).filter((legacyId) => Number(legacyId) !== Number(serviceId)),
            platform: normalizedPlatform,
            category: normalizedCategory,
            description: trimSmmText(description),
            variants: normalizedVariantsWithIds.map((variant) => ({
                ...variant,
                legacyServiceIds: uniqueSmmStrings(variant.legacyServiceIds || [])
            }))
        };

        await ensureSmmPlatformExists(normalizedPlatform);

        if (service) {
            if (service.serviceId == null) {
                service.serviceId = nextService.serviceId;
            }
            service.platform = nextService.platform;
            service.category = nextService.category;
            service.description = nextService.description;
            service.variants = nextService.variants;
            service.legacyServiceIds = nextService.legacyServiceIds;
            await service.save();
            return res.json({ success: true, message: 'SMM rate updated successfully.', serviceId });
        }

        await new SmmService(nextService).save();
        res.json({ success: true, message: 'SMM rate created successfully.', serviceId });
    } catch (e) {
        console.error("Error in POST /api/admin/smm/rates:", e);
        res.status(500).json({ success: false, error: e.message });
    }
});

// DELETE SMM rate (Admin authenticated)
app.delete('/api/admin/smm/rates/:serviceId', checkAuth, async (req, res) => {
    try {
        if (!['Admin', 'SuperAdmin', 'SubAdmin'].includes(req.user.role)) {
            return res.status(403).json({ success: false, error: 'Unauthorized admin access.' });
        }
        const { serviceId } = req.params;
        const service = await findSmmServiceByAnyId(serviceId);
        if (!service) {
            return res.status(404).json({ success: false, error: 'SMM service not found.' });
        }
        await SmmService.deleteOne({ serviceId: service.serviceId });
        res.json({ success: true, message: 'SMM rate deleted successfully.' });
    } catch (e) {
        console.error("Error in DELETE /api/admin/smm/rates/:serviceId:", e);
        res.status(500).json({ success: false, error: e.message });
    }
});

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
There is a website for our company: https://vibespheremedia.in/
there whatsapp number is +91 8302485826
--- 🚨 CRITICAL RULES (NON-NEGOTIABLE) ---
1. NO INFO DUMPS: Keep messages extremely short (1-3 sentences max).
2. STEP-BY-STEP: Ask only ONE question at a time to keep the user engaged.
3. IDENTIFY INTENT FIRST:
   - If "Reach badhani hai" -> Ask: "Kis type ka page hai? (Personal/Business?)"
   - If "Website banwani hai" -> Ask: "Kis cheez ka business hai aapka?"
   - If "Mera business nahi chal raha" -> First pitch Marketing, then upsell a Website.
4. ALWAYS BE CLOSING: Your ultimate goal is to close the deal and get them to buy a package.

--- 📈 INSTAGRAM & SOCIAL MEDIA GROWTH PACKAGES ---
- ESSENTIAL: ₹1,499/Month (4-5 High-Quality Posts | 1-2 Basic Reels | Profile Setup). Pitch: "Sir, basic digital presence maintain karne ke liye ekdum perfect start hai."
- GROWTH (🔥 Best Seller): ₹5,999/Month (15 Posts | 5-6 Pro Reels | 2-3 Story Updates/week). Pitch: "Daily reach aur solid engagement badhane ke liye hamara top package. Most clients yahi lete hain."
- PRO: ₹9,999/Month (20 Posts | 8-10 Advanced Reels | Daily Story & DM Replies). Pitch: "Sir, market me dominate karna hai aur competitors ko peechhe chhodna hai toh ye lijiye. Full VIP Management!"

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

    // 30s outer timeout (covers full request lifecycle)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    let replyText = null;

    // ════════════════════════════════════════════════════════════════
    // 🎲 RANDOMIZED LOAD BALANCING — 5 AI Providers, shuffled per request
    // ════════════════════════════════════════════════════════════════
    const OR_KEY = process.env.OPENROUTER_API_KEY;
    const GROQ_KEY = process.env.GROQ_API_KEY;

    // Helper: OpenRouter call factory (avoids code duplication)
    const makeORCall = (modelId) => async () => {
        if (!OR_KEY) throw new Error('No OpenRouter key');
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 7000); // 7s strict timeout
        try {
            const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${OR_KEY}`,
                    'HTTP-Referer': 'https://vibespheremedia.in',
                    'X-Title': 'VibeSphere VibeGenie AI'
                },
                body: JSON.stringify({ model: modelId, messages }),
                signal: ctrl.signal
            });
            const data = await res.json();
            if (!res.ok || data.error) throw new Error(JSON.stringify(data.error || data));
            const text = data.choices?.[0]?.message?.content;
            if (!text) throw new Error('empty_response');
            return text;
        } finally { clearTimeout(t); }
    };

    // All 5 providers defined in a fixed pool
    const providerPool = [
        {
            name: 'OpenRouter [Arcee Trinity Large]',
            call: makeORCall('arcee-ai/trinity-large-preview:free')
        },
        {
            name: 'OpenRouter [GLM 4.5 Air]',
            call: makeORCall('z-ai/glm-4.5-air:free')
        },
        {
            name: 'OpenRouter [Llama 3.3 70B]',
            call: makeORCall('meta-llama/llama-3.3-70b-instruct:free')
        },
        {
            name: 'Google Gemma [gemma-3-27b-it]',
            call: async () => {
                const finalContents = [
                    { role: 'user', parts: [{ text: systemPrompt }] },
                    ...contents,
                    { role: 'user', parts: [{ text: userMessage }] }
                ];
                const res = await fetch(
                    `https://generativelanguage.googleapis.com/v1beta/models/gemma-3-27b-it:generateContent?key=${API_KEY}`,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ contents: finalContents }),
                        signal: controller.signal
                    }
                );
                const data = await res.json();
                if (data.error) throw new Error(JSON.stringify(data.error));
                const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
                if (!text) throw new Error('empty_response');
                return text;
            }
        },
        {
            name: 'Groq [Llama 3.1 8B]',
            call: async () => {
                if (!GROQ_KEY) throw new Error('No Groq key');
                const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
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
                const data = await res.json();
                if (!res.ok || data.error) throw new Error(JSON.stringify(data.error || data));
                const text = data.choices?.[0]?.message?.content;
                if (!text) throw new Error('empty_response');
                return text;
            }
        }
    ];

    // Fisher-Yates shuffle — randomize order for every request
    const providers = [...providerPool];
    for (let i = providers.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [providers[i], providers[j]] = [providers[j], providers[i]];
    }
    console.log(`🎲 Provider order: ${providers.map(p => p.name).join(' → ')}`);

    // Iterate shuffled providers — stop at first success
    for (const provider of providers) {
        try {
            console.log(`🔃 Trying ${provider.name}...`);
            replyText = await provider.call();
            console.log(`✅ VibeGenie replied via ${provider.name}`);
            break;
        } catch (err) {
            console.error(`❌ ${provider.name} failed:`, err.message);
            console.log(`🔄 Moving to next provider...`);
        }
    }

    if (!replyText) {
        replyText = 'System is temporarily busy. Please try again shortly!';
        console.error('❌ All 5 AI providers failed.');
    }


    clearTimeout(timeoutId);
    res.json({ reply: replyText });
});




// ============================================================
// 🌍 GEO-DETECTION MIDDLEWARE (ip-api.com — no API key needed)
// ============================================================
async function detectCountry(req) {
    try {
        // Check X-Forwarded-For for proxied/production environments
        const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
        // Skip detection for local IPs
        if (!ip || ip === '::1' || ip.startsWith('127.') || ip.startsWith('192.168.')) return 'IN';
        const response = await fetch(`http://ip-api.com/json/${ip}?fields=countryCode`);
        const data = await response.json();
        return data.countryCode || 'GLOBAL';
    } catch (e) {
        return 'GLOBAL';
    }
}

function selectPrice(pkg, countryCode) {
    if (countryCode === 'IN') return { price: pkg.pricing.priceIN, currency: 'INR', symbol: '₹' };
    if (countryCode === 'US') return { price: pkg.pricing.priceUS, currency: 'USD', symbol: '$' };
    return { price: pkg.pricing.priceGlobal, currency: 'USD', symbol: '$' };
}

// ============================================================
// 🏢 PUBLIC SERVICE ROUTES
// ============================================================

// GET all active services
app.get('/api/services', async (req, res) => {
    try {
        const services = await Service.find({ isActive: true }).sort({ createdAt: -1 });
        res.json({ success: true, services });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// GET single service + its packages (with geo-price)
app.get('/api/services/:id', async (req, res) => {
    try {
        const service = await Service.findById(req.params.id);
        if (!service) return res.status(404).json({ success: false, error: 'Service not found' });
        const rawPkgs = await Package.find({ serviceId: req.params.id, isActive: true });
        const countryCode = await detectCountry(req);
        const packages = rawPkgs.map(pkg => {
            const geo = selectPrice(pkg, countryCode);
            return { ...pkg.toObject(), geo };
        });
        res.json({ success: true, service, packages, countryCode });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// GET specific packages for a service (requested by user)
app.get('/api/services/:id/packages', async (req, res) => {
    try {
        const rawPkgs = await Package.find({ serviceId: req.params.id, isActive: true });
        const countryCode = await detectCountry(req);
        const packages = rawPkgs.map(pkg => {
            const geo = selectPrice(pkg, countryCode);
            return { ...pkg.toObject(), geo };
        });
        res.json({ success: true, packages, countryCode });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// ============================================================
// 📦 PUBLIC PACKAGE ROUTES
// ============================================================

// GET all active packages (optional ?serviceId= filter, with geo-price)
app.get('/api/packages', async (req, res) => {
    try {
        const filter = { isActive: true };
        if (req.query.serviceId) filter.serviceId = req.query.serviceId;
        const rawPkgs = await Package.find(filter).populate('serviceId', 'title slug').sort({ createdAt: -1 });
        const countryCode = await detectCountry(req);
        const packages = rawPkgs.map(pkg => {
            const geo = selectPrice(pkg, countryCode);
            return { ...pkg.toObject(), geo };
        });
        res.json({ success: true, packages, countryCode });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// GET single package with geo-price
app.get('/api/packages/:id', async (req, res) => {
    try {
        const pkg = await Package.findById(req.params.id).populate('serviceId', 'title slug');
        if (!pkg) return res.status(404).json({ success: false, error: 'Package not found' });

        const countryCode = await detectCountry(req);
        const geo = selectPrice(pkg, countryCode);

        // Filter for approved reviews only for public view
        const approvedReviews = (pkg.reviews || []).filter(r => r.status === 'approved');

        // Recalculate average rating based on approved reviews (if any, else fallback to pkg default)
        let displayRating = pkg.rating;
        if (approvedReviews.length > 0) {
            const sum = approvedReviews.reduce((acc, r) => acc + r.rating, 0);
            displayRating = Number((sum / approvedReviews.length).toFixed(1));
        }

        const pkgObj = pkg.toObject();
        pkgObj.reviews = approvedReviews;
        pkgObj.rating = displayRating;
        pkgObj.geo = geo;

        res.json({ success: true, package: pkgObj, countryCode });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// ============================================================
// 🔧 ADMIN — SERVICE CRUD
// ============================================================

// GET all services (admin)
app.get('/api/admin/services', async (req, res) => {
    try {
        const services = await Service.find().sort({ createdAt: -1 });
        res.json({ success: true, services });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// CREATE service
app.post('/api/admin/services', async (req, res) => {
    try {
        const { title, slug, description, fullDescription, tagline, aboutText, icon, benefits, processSteps, faqs } = req.body;
        if (!title || !slug) return res.status(400).json({ success: false, error: 'title and slug required' });

        const service = await Service.create({
            title, slug, description, fullDescription, tagline, aboutText, icon,
            benefits: benefits || [],
            processSteps: processSteps || [],
            faqs: faqs || []
        });
        res.json({ success: true, service });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// UPDATE service
app.put('/api/admin/services/:id', async (req, res) => {
    try {
        const service = await Service.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!service) return res.status(404).json({ success: false, error: 'Not found' });
        res.json({ success: true, service });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// DELETE service
app.delete('/api/admin/services/:id', async (req, res) => {
    try {
        await Service.findByIdAndDelete(req.params.id);
        await Package.deleteMany({ serviceId: req.params.id }); // cascade delete packages
        res.json({ success: true, message: 'Service and its packages deleted' });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// ============================================================
// 🔧 ADMIN — PACKAGE CRUD
// ============================================================

// GET all packages (admin, with service name)
app.get('/api/admin/packages', async (req, res) => {
    try {
        const packages = await Package.find().populate('serviceId', 'title').sort({ createdAt: -1 });
        res.json({ success: true, packages });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// CREATE package
app.post('/api/admin/packages', async (req, res) => {
    try {
        const { title, description, features, serviceId, rating, faqs, pricing, isFeatured } = req.body;
        if (!title || !serviceId || !pricing?.priceIN || !pricing?.priceUS || !pricing?.priceGlobal)
            return res.status(400).json({ success: false, error: 'title, serviceId, and all 3 prices required' });
        const pkg = await Package.create({
            title, description, features: features || [],
            serviceId, rating: rating || 4.9, faqs: faqs || [],
            pricing, isFeatured: isFeatured || false
        });
        res.json({ success: true, package: pkg });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// UPDATE package
app.put('/api/admin/packages/:id', async (req, res) => {
    try {
        const pkg = await Package.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!pkg) return res.status(404).json({ success: false, error: 'Not found' });
        res.json({ success: true, package: pkg });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// SUBMIT review for a package
app.post('/api/packages/:id/reviews', checkAuth, async (req, res) => {
    try {
        const { rating, comment } = req.body;
        const userId = req.user?._id;
        const userName = req.user?.name || 'Anonymous';

        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({ success: false, error: 'Rating (1-5) is required' });
        }

        const pkg = await Package.findById(req.params.id);
        if (!pkg) return res.status(404).json({ success: false, error: 'Package not found' });

        // Add review as pending
        pkg.reviews.push({
            user: userId,
            userName,
            rating: Number(rating),
            comment: comment || '',
            status: 'pending',
            createdAt: new Date()
        });

        await pkg.save();
        res.json({ success: true, message: 'Review submitted for approval' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET all pending reviews (admin)
app.get('/api/admin/reviews/pending', checkAuth, async (req, res) => {
    if (req.user.role?.toLowerCase() !== 'admin') return res.status(403).json({ success: false, error: 'Unauthorized' });
    try {
        const packages = await Package.find({ 'reviews.status': 'pending' });
        let pendingReviews = [];
        packages.forEach(pkg => {
            pkg.reviews.forEach(rev => {
                if (rev.status === 'pending') {
                    pendingReviews.push({
                        packageId: pkg._id,
                        packageTitle: pkg.title,
                        reviewId: rev._id,
                        userName: rev.userName,
                        rating: rev.rating,
                        comment: rev.comment,
                        createdAt: rev.createdAt
                    });
                }
            });
        });
        res.json({ success: true, reviews: pendingReviews });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// Update review status (admin)
app.patch('/api/admin/packages/:packageId/reviews/:reviewId/status', checkAuth, async (req, res) => {
    if (req.user.role?.toLowerCase() !== 'admin') return res.status(403).json({ success: false, error: 'Unauthorized' });
    const { status } = req.body;
    if (!['approved', 'rejected'].includes(status)) return res.status(400).json({ success: false, error: 'Invalid status' });

    try {
        const pkg = await Package.findById(req.params.packageId);
        if (!pkg) return res.status(404).json({ success: false, error: 'Package not found' });

        const review = pkg.reviews.id(req.params.reviewId);
        if (!review) return res.status(404).json({ success: false, error: 'Review not found' });

        review.status = status;

        // If approved, recalculate the package's overall rating using ONLY approved reviews
        if (status === 'approved') {
            const approvedReviews = pkg.reviews.filter(r => r.status === 'approved');
            const total = approvedReviews.reduce((sum, r) => sum + r.rating, 0);
            pkg.rating = parseFloat((total / approvedReviews.length).toFixed(1));
        }

        await pkg.save();
        res.json({ success: true, message: `Review ${status}` });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});
// DELETE package
app.delete('/api/admin/packages/:id', async (req, res) => {
    try {
        await Package.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Package deleted' });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// ============================================================
// 🛒 CART ROUTES (Auth-protected, server-side)
// ============================================================

// GET user's cart
app.get('/api/cart', checkAuth, async (req, res) => {
    try {
        const userId = req.user._id;
        if (!userId) return res.status(401).json({ success: false, error: 'Login required' });
        const cart = await Cart.findOne({ userId }).populate('items.packageId', 'title pricing');
        res.json({ success: true, cart: cart || { items: [] } });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// ADD item to cart
app.post('/api/cart', checkAuth, async (req, res) => {
    try {
        const userId = req.user._id;
        if (!userId) return res.status(401).json({ success: false, error: 'Login required' });
        const { packageId } = req.body;
        if (!packageId) return res.status(400).json({ success: false, error: 'packageId required' });

        // Detect geo-price to lock in at time of add
        const pkg = await Package.findById(packageId);
        if (!pkg) return res.status(404).json({ success: false, error: 'Package not found' });
        const countryCode = await detectCountry(req);
        const geo = selectPrice(pkg, countryCode);

        let cart = await Cart.findOne({ userId });
        if (!cart) cart = new Cart({ userId, items: [] });

        // If already in cart, just update locked price
        const existing = cart.items.find(i => i.packageId.toString() === packageId);
        if (existing) {
            existing.priceAtAdd = geo.price;
            existing.currency = geo.currency;
        } else {
            cart.items.push({ packageId, priceAtAdd: geo.price, currency: geo.currency });
        }
        cart.updatedAt = new Date();
        await cart.save();
        res.json({ success: true, cart });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// REMOVE item from cart
app.delete('/api/cart/:packageId', checkAuth, async (req, res) => {
    try {
        const userId = req.user._id;
        if (!userId) return res.status(401).json({ success: false, error: 'Login required' });
        const cart = await Cart.findOne({ userId });
        if (!cart) return res.json({ success: true });
        cart.items = cart.items.filter(i => i.packageId.toString() !== req.params.packageId);
        await cart.save();
        res.json({ success: true, cart });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// CLEAR entire cart
app.delete('/api/cart', checkAuth, async (req, res) => {
    try {
        const userId = req.user._id;
        if (!userId) return res.status(401).json({ success: false, error: 'Login required' });
        await Cart.findOneAndDelete({ userId });
        res.json({ success: true, message: 'Cart cleared' });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// ==========================================
// 💳 PAYMENT & ADMIN ROUTES (UPDATED)
// ==========================================

// ✅ SMART PAYMENT CREATION (Isme MAGIC kiya hai)
app.post('/api/create-payment', optionalAuth, async (req, res) => {
    try {
        const orderDetails = req.body?.orderDetails && typeof req.body.orderDetails === 'object' ? req.body.orderDetails : {};
        let { amount, baseAmount, currency, isSmm, serviceId, quantity, orderType, variantIndex, variantId, couponCode, couponModule } = req.body;
        const razorpayKeyId = process.env.RAZORPAY_KEY_ID;

        if (!razorpayKeyId) {
            return res.status(500).json({ success: false, error: 'Payment config missing' });
        }

        let cleanCurrency = currency && currency.length === 3 ? currency : "INR";
        let finalPrice = 0;
        let appliedCouponPricing = null;
        const numericAmount = Number(amount);
        const numericBaseAmount = Number(baseAmount);
        const normalizedCouponCode = normalizeCouponCode(couponCode);

        let globalVariant = null;

        // Progressive Detail Collection Extraction
        const customerName = req.body.customerName || req.body.name || (req.body.orderDetails && req.body.orderDetails.customerName) || (req.user && req.user.name) || "Guest";
        const customerEmail = req.body.email || (req.body.orderDetails && req.body.orderDetails.email) || (req.user && req.user.email) || "guest@vibesphere.in";
        const customerPhone = req.body.phone || (req.body.orderDetails && req.body.orderDetails.phone) || (req.user && req.user.mobile) || "9999999999";

        if (isSmm || orderType === 'smm') {
            // Secure SMM pricing calculation
            const parsedQuantity = Number(quantity);
            if ((!serviceId && !variantId) || !Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
                return res.status(400).json({ success: false, error: 'serviceId/variantId and quantity required' });
            }

            const incomingVariantId = Number(variantId || req.body.variantId);
            if (!incomingVariantId) return res.status(400).json({ success: false, error: "Variant ID is missing" });

            const serviceDoc = await SmmService.findOne({ "variants.variantId": incomingVariantId });
            if (!serviceDoc) return res.status(404).json({ success: false, error: "Service not found" });

            const targetVariant = serviceDoc.variants.find(v => v.variantId === incomingVariantId);
            if (!targetVariant) return res.status(404).json({ success: false, error: "Variant data corrupted" });

            let service = serviceDoc;
            let selectedVariant = targetVariant;
            globalVariant = targetVariant;

            const { minQty, maxQty } = getSmmVariantQuantityBounds(selectedVariant);
            if (parsedQuantity < minQty || parsedQuantity > maxQty) {
                return res.status(400).json({ success: false, error: `Quantity must be between ${minQty} and ${maxQty}.` });
            }

            // Calculate price STRICTLY from targetVariant
            let calculatedPrice = (targetVariant.price / 1000) * parsedQuantity;
            if (targetVariant.discountPercent && targetVariant.discountPercent > 0) {
                calculatedPrice = calculatedPrice * (1 - (targetVariant.discountPercent / 100));
            }
            finalPrice = parseFloat(calculatedPrice.toFixed(2));

            if (!Number.isFinite(finalPrice) || finalPrice <= 0) {
                return res.status(400).json({ success: false, error: 'Invalid SMM variant price.' });
            }

            if (normalizedCouponCode) {
                appliedCouponPricing = await resolveCouponCheckoutPricing({
                    code: normalizedCouponCode,
                    cartTotal: finalPrice,
                    moduleName: couponModule || 'smm',
                    user: req.user
                });
                finalPrice = appliedCouponPricing.finalTotal;
            }
            cleanCurrency = "INR";
            console.log(`🔒 SMM Secure Payment calculated: ${finalPrice} INR for service ${service.serviceId}`);
        } else {
            // Normal agency orders
            if (normalizedCouponCode) {
                const couponBaseAmount = Number.isFinite(numericBaseAmount) && numericBaseAmount > 0
                    ? numericBaseAmount
                    : Number.isFinite(numericAmount) ? numericAmount : 0;

                if (!Number.isFinite(couponBaseAmount) || couponBaseAmount <= 0) {
                    return res.status(400).json({ success: false, error: 'Original amount is required when applying a coupon.' });
                }

                appliedCouponPricing = await resolveCouponCheckoutPricing({
                    code: normalizedCouponCode,
                    cartTotal: couponBaseAmount,
                    moduleName: couponModule || orderType || 'general',
                    user: req.user
                });
                finalPrice = appliedCouponPricing.finalTotal;
            } else {
                if (amount == null) {
                    return res.status(400).json({ success: false, error: 'amount required' });
                }
                const cleanAmount = Number(String(amount).replace(/[^\d.]/g, ''));
                if (!Number.isFinite(cleanAmount) || cleanAmount <= 0) {
                    return res.status(400).json({ success: false, error: 'Invalid amount, must be a positive number' });
                }
                finalPrice = cleanAmount;
            }
        }

        const resolvedOrderItems = Array.isArray(orderDetails?.orderItems) ? orderDetails.orderItems : Array.isArray(req.body.items) ? req.body.items : [];

        if (finalPrice <= 0 && appliedCouponPricing) {
            const freeOrder = await createFreeCheckoutOrder({
                userId: req.user?._id || null,
                orderDetails,
                orderType: isSmm || orderType === 'smm' ? 'smm' : 'agency',
                resolvedServiceId: isSmm || orderType === 'smm' ? (serviceId || orderDetails?.serviceId || '') : '',
                resolvedQuantity: isSmm || orderType === 'smm' ? Number(quantity || orderDetails?.quantity || 0) : 0,
                resolvedTargetLink: orderDetails?.targetLink || orderDetails?.instaLink || '',
                selectedVariantName: orderDetails?.selectedVariantName || '',
                selectedVariantId: orderDetails?.selectedVariantId ?? null,
                selectedCountry: orderDetails?.selectedCountry || '',
                selectedQuality: orderDetails?.selectedQuality || '',
                selectedSpeed: orderDetails?.selectedSpeed || '',
                selectedRefill: orderDetails?.selectedRefill || '',
                selectedVariantBasePrice: Number(orderDetails?.selectedVariantBasePrice || 0),
                selectedVariantDiscountPercent: Number(orderDetails?.selectedVariantDiscountPercent || 0),
                selectedVariantDiscountAmount: Number(orderDetails?.selectedVariantDiscountAmount || 0),
                selectedVariantEffectivePrice: Number(orderDetails?.selectedVariantEffectivePrice || 0),
                isDripActive: orderDetails?.isDripFeed === true || orderDetails?.isDripFeed === 'true' || req.body.isDripFeed === true || req.body.isDripFeed === 'true',
                runsVal: Number(orderDetails?.runs || req.body.runs || 1),
                intervalMins: Number(orderDetails?.interval || req.body.interval || 0) * 60,
                qtyPerRun: Number(orderDetails?.quantityPerRun || 0),
                remainingRunsVal: Number(orderDetails?.remainingRuns || 0),
                nextRunTimestamp: orderDetails?.nextRunAt ? new Date(orderDetails.nextRunAt) : null,
                resolvedOrderItems,
                currency: cleanCurrency,
                couponPricing: appliedCouponPricing
            });

            try {
                await incrementCouponUsageByCode(appliedCouponPricing.coupon.code);
            } catch (usageErr) {
                console.error('Failed to increment coupon usage for free checkout:', usageErr);
            }

            return res.json({
                status: 'success_free',
                success: true,
                message: 'Order placed for free!',
                orderId: freeOrder.orderId
            });
        }

        // 🚀 SMART ROUTING DECISION ENGINE
        const activeGateways = await PaymentGateway.find({ isActive: true }).lean();
        const selectedGateway = activeGateways.find(g => finalPrice >= g.minOrder && finalPrice <= g.maxOrder);

        if (!selectedGateway) {
            return res.status(400).json({ success: false, message: 'No payment gateway available for this amount.' });
        }

        const providerId = selectedGateway.gatewayId.toLowerCase();

        switch (providerId) {
            case 'razorpay': {
                if (finalPrice > 0 && finalPrice < 1) {
                    return res.status(400).json({ success: false, error: "Razorpay requires a minimum transaction amount of ₹1.00. Please increase your cart value." });
                }

                const decryptedSecret = decryptGatewaySecret(selectedGateway.apiSecret);
                if (!selectedGateway.apiKey || !decryptedSecret) {
                    return res.status(500).json({ success: false, error: 'Razorpay configuration corrupted.' });
                }

                const Razorpay = require('razorpay');
                const dynamicRazorpay = new Razorpay({
                    key_id: selectedGateway.apiKey,
                    key_secret: decryptedSecret
                });

                const options = {
                    amount: Math.round(finalPrice * 100), // Convert to paise
                    currency: cleanCurrency,
                    receipt: "rcpt_" + Date.now()
                };

                const razorpayOrder = await dynamicRazorpay.orders.create(options);

                return res.json({
                    success: true,
                    provider: 'razorpay',
                    orderData: razorpayOrder,
                    apiKey: selectedGateway.apiKey,
                    internalOrderId: options.receipt,
                    customerName, customerEmail, customerPhone
                });
            }

            case 'paytm': {
                // TEMPORARY DEBUGGING: Comment out DB decryption
                // const decryptedSecret = decryptGatewaySecret(selectedGateway.apiSecret);
                // const cleanSecret = decryptedSecret.trim();

                // HARDCODE TEST KEY HERE
                const cleanSecret = "TGp4%EMY8aKSitLO";

                if (!selectedGateway.apiKey) {
                    return res.status(500).json({ success: false, error: 'Paytm config corrupted.' });
                }

                const paytmAmount = String(Number(finalPrice).toFixed(2));
                const cleanMid = selectedGateway.apiKey.trim();
                const internalOrderId = "ORDER_" + Date.now();
                const paytmchecksum = require('paytmchecksum');

                const paytmParams = {};
                paytmParams.body = {
                    "requestType": "Payment",
                    "mid": cleanMid,
                    "websiteName": "WEBSTAGING",
                    "industryTypeId": "Retail", // ADDED FROM DASHBOARD
                    "orderId": internalOrderId,
                    "callbackUrl": "http://localhost:3000/api/verify-payment",
                    "txnAmount": {
                        "value": paytmAmount,
                        "currency": "INR"
                    },
                    "userInfo": {
                        "custId": "CUST_" + Date.now() // Enforced simple string for testing
                    }
                };

                // Generate Checksum strictly on the stringified body
                const checksum = await paytmchecksum.generateSignature(JSON.stringify(paytmParams.body), cleanSecret);

                paytmParams.head = {
                    "signature": checksum
                };

                const post_data = JSON.stringify(paytmParams);

                // --- DEBUG LOGS ---
                console.log("----- PAYTM DEBUG -----");
                console.log("MID:", cleanMid);
                console.log("POST DATA:", post_data);
                console.log("-----------------------");

                // USING AXIOS TO AVOID 'fetch is not a function' IN OLDER NODE VERSIONS
                const axios = require('axios');
                const paytmRes = await axios.post(`https://securegw-stage.paytm.in/theia/api/v1/initiateTransaction?mid=${cleanMid}&orderId=${internalOrderId}`, post_data, {
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });

                const paytmData = paytmRes.data;
                console.log("PAYTM API RESPONSE:", paytmData);

                if (paytmData.body.resultInfo.resultStatus !== 'S') {
                    console.error("Paytm Init Error:", paytmData);
                    return res.status(400).json({ success: false, error: 'Paytm gateway rejected the request.' });
                }

                return res.json({
                    success: true,
                    provider: 'paytm',
                    transactionData: {
                        txnToken: paytmData.body.txnToken,
                        orderId: internalOrderId,
                        amount: paytmAmount
                    },
                    apiKey: cleanMid,
                    internalOrderId: internalOrderId
                });
            }

            case 'payu': {
                const decryptedSalt = decryptGatewaySecret(selectedGateway.apiSecret);
                if (!selectedGateway.apiKey || !decryptedSalt) {
                    return res.status(500).json({ success: false, error: 'PayU configuration corrupted.' });
                }

                const payuKey = selectedGateway.apiKey.trim();
                const payuSalt = decryptedSalt.trim();
                const txnid = "txnid_" + Date.now();
                const payuAmount = String(Number(finalPrice).toFixed(2));
                const productinfo = "VibeSphere Services";
                const firstname = customerName;
                const email = customerEmail;
                const phone = customerPhone;
                const surl = "http://localhost:3000/api/verify-payment";
                const furl = "http://localhost:3000/api/verify-payment";

                let resolvedTargetLink = req.body.targetLink || (orderDetails && orderDetails.targetLink) || (orderDetails && orderDetails.instaLink) || '';
                if (typeof resolvedTargetLink === 'string' && resolvedTargetLink.includes(' (Target Country:')) {
                    resolvedTargetLink = resolvedTargetLink.split(' (Target Country:')[0];
                }

                const generatedOrderId = "#ORD-" + Math.floor(100000 + Math.random() * 900000);
                const pendingOrder = new Order({
                    orderId: generatedOrderId,
                    paymentId: txnid,
                    paymentStatus: 'Pending',
                    workStatus: 'Work Pending',
                    status: 'Pending',
                    userId: req.user?._id || null,
                    ...(orderDetails && typeof orderDetails === 'object' ? orderDetails : {}),
                    customerName,
                    email,
                    phone,
                    orderAmount: finalPrice,
                    orderItems: Array.isArray(orderDetails?.orderItems) ? orderDetails.orderItems : (Array.isArray(req.body.items) ? req.body.items : []),
                    orderType: (isSmm || orderType === 'smm') ? 'smm' : 'agency',
                    serviceId: (isSmm || orderType === 'smm') ? (serviceId || orderDetails?.serviceId || '') : '',
                    quantity: (isSmm || orderType === 'smm') ? Number(quantity || orderDetails?.quantity || 0) : 0,
                    targetLink: resolvedTargetLink,
                    instaLink: resolvedTargetLink,
                    selectedVariantName: globalVariant && globalVariant.name ? globalVariant.name.trim() : '',
                    selectedCountry: globalVariant && globalVariant.country ? globalVariant.country.trim() : '',
                    selectedQuality: globalVariant && globalVariant.name ? globalVariant.name.trim() : '',
                    selectedSpeed: globalVariant && globalVariant.speed ? globalVariant.speed.trim() : '',
                    selectedRefill: globalVariant && globalVariant.refill ? globalVariant.refill.trim() : '',
                    isDripFeed: orderDetails?.isDripFeed === true || orderDetails?.isDripFeed === 'true',
                    runs: Number(orderDetails?.runs || 1),
                    interval: Number(orderDetails?.interval || 0) * 60,
                    extraInput: req.body.extraInput || orderDetails?.extraInput || '',
                    extraInputType: req.body.extraInputType || orderDetails?.extraInputType || 'none',
                    date: new Date().toLocaleString()
                });

                if (mongoose.connection.readyState === 1) {
                    await pendingOrder.save().catch(e => console.error("PayU Pending Order Save Error:", e));
                }

                // PayU Hash Formula: key|txnid|amount|productinfo|firstname|email|||||||||||salt
                const hashString = `${payuKey}|${txnid}|${payuAmount}|${productinfo}|${firstname}|${email}|||||||||||${payuSalt}`;
                const hash = crypto.createHash('sha512').update(hashString).digest('hex');

                return res.json({
                    success: true,
                    provider: 'payu',
                    transactionData: {
                        key: payuKey,
                        txnid: txnid,
                        amount: payuAmount,
                        productinfo: productinfo,
                        firstname: firstname,
                        email: email,
                        surl: surl,
                        furl: furl,
                        hash: hash
                    },
                    apiKey: payuKey,
                    internalOrderId: txnid
                });
            }

            default: {
                return res.status(400).json({ success: false, message: 'Unsupported payment provider selected.' });
            }
        }
    } catch (error) {
        console.error("❌ Payment Error:", error);
        res.status(error.status || 500).json({ success: false, error: error.message || 'Payment Error' });
    }
});

app.post('/api/verify-payment', optionalAuth, async (req, res) => {
    let { provider, internalOrderId, razorpay_order_id, razorpay_payment_id, razorpay_signature, orderDetails, isSmm, serviceId, quantity, targetLink, orderType: incomingOrderType } = req.body;

    let activeProvider = req.body.provider || req.query.provider;
    if (!activeProvider && req.body.mihpayid && req.body.txnid) {
        activeProvider = 'payu';
    }
    activeProvider = (activeProvider || 'razorpay').toLowerCase();

    if (activeProvider === 'payu' && !internalOrderId) {
        internalOrderId = req.body.txnid;
    }

    console.log("--- VERIFY PAYMENT DEBUG ---");
    console.log("Provider detected:", activeProvider);
    console.log("Request Body:", req.body);
    console.log("----------------------------");

    let isSignatureValid = false;

    switch (activeProvider) {
        case 'razorpay': {
            const razorpayConfig = await PaymentGateway.findOne({ gatewayId: 'razorpay' });
            if (!razorpayConfig) {
                return res.status(400).json({ success: false, error: 'Razorpay configuration not found.' });
            }

            const decryptedSecret = decryptGatewaySecret(razorpayConfig.apiSecret);
            if (!decryptedSecret) {
                return res.status(500).json({ success: false, error: 'Razorpay configuration is corrupted.' });
            }

            const body = razorpay_order_id + "|" + razorpay_payment_id;
            const expectedSignature = crypto.createHmac('sha256', decryptedSecret)
                .update(body.toString()).digest('hex');

            if (expectedSignature === razorpay_signature) {
                isSignatureValid = true;
            }
            break;
        }

        case 'paytm': {
            const paytmConfig = await PaymentGateway.findOne({ gatewayId: 'paytm' });
            if (!paytmConfig) {
                return res.status(400).json({ success: false, error: 'Paytm configuration not found.' });
            }

            const decryptedSecret = decryptGatewaySecret(paytmConfig.apiSecret);
            if (!decryptedSecret) {
                return res.status(500).json({ success: false, error: 'Paytm configuration is corrupted.' });
            }

            const paytmResponse = req.body.paytmResponse || {};
            const checksumHash = paytmResponse.CHECKSUMHASH;

            if (!checksumHash) {
                return res.status(400).json({ success: false, error: 'Missing Paytm checksum.' });
            }

            delete paytmResponse.CHECKSUMHASH;

            const PaytmChecksum = require('paytmchecksum');
            const isValid = PaytmChecksum.verifySignature(paytmResponse, decryptedSecret, checksumHash);

            if (isValid && paytmResponse.STATUS === 'TXN_SUCCESS') {
                isSignatureValid = true;
            } else {
                return res.status(400).json({ success: false, error: 'Invalid Paytm Signature or Failed Transaction.' });
            }
            break;
        }

        case 'payu': {
            const payuConfig = await PaymentGateway.findOne({ gatewayId: 'payu' });
            if (!payuConfig) {
                return res.status(400).send('PayU configuration not found.');
            }

            const decryptedSalt = decryptGatewaySecret(payuConfig.apiSecret);
            if (!decryptedSalt) {
                return res.status(500).send('PayU configuration is corrupted.');
            }

            const { status, txnid, amount, productinfo, firstname, email, hash, key } = req.body;

            // Reverse Hash Formula: salt|status|||||||||||email|firstname|productinfo|amount|txnid|key
            const reverseHashString = `${decryptedSalt}|${status}|||||||||||${email}|${firstname}|${productinfo}|${amount}|${txnid}|${key}`;
            const generatedHash = crypto.createHash('sha512').update(reverseHashString).digest('hex');

            console.log("PayU Received Hash:", hash);
            console.log("PayU Generated Reverse Hash:", generatedHash);

            if (generatedHash === hash && status === 'success') {
                const existingOrder = await Order.findOne({ paymentId: txnid });
                if (existingOrder) {
                    existingOrder.status = 'Paid';
                    existingOrder.paymentStatus = 'Paid';
                    existingOrder.paymentId = req.body.mihpayid;
                    await existingOrder.save();

                    return res.redirect(`/checkout.html?step=3&status=success&orderId=${encodeURIComponent(existingOrder.orderId)}`);
                } else {
                    return res.status(404).send('Pending order not found for this transaction.');
                }
            } else {
                return res.status(400).send('Invalid PayU Signature or Failed Transaction.');
            }
        }

        default: {
            return res.status(400).json({ success: false, error: 'Unknown payment provider.' });
        }
    }

    if (isSignatureValid) {
        let normalizedOrderAmount = 0;
        let orderType = 'agency';
        let resolvedServiceId = '';
        let resolvedQuantity = 0;
        let resolvedTargetLink = '';
        let selectedVariantName = '';
        let selectedVariantId = null;
        let selectedCountry = '';
        let selectedQuality = '';
        let selectedSpeed = '';
        let selectedRefill = '';
        let selectedVariantBasePrice = 0;
        let selectedVariantDiscountPercent = 0;
        let selectedVariantDiscountAmount = 0;
        let selectedVariantEffectivePrice = 0;

        if (isSmm || orderDetails?.isSmm || incomingOrderType === 'smm' || orderDetails?.orderType === 'smm') {
            orderType = 'smm';
            const requestedServiceId = serviceId || orderDetails?.serviceId || '';
            resolvedServiceId = requestedServiceId;
            resolvedQuantity = Number(quantity || orderDetails?.quantity || 0);
            resolvedTargetLink = targetLink || orderDetails?.targetLink || orderDetails?.instaLink || '';
            if (typeof resolvedTargetLink === 'string' && resolvedTargetLink.includes(' (Target Country:')) {
                resolvedTargetLink = resolvedTargetLink.split(' (Target Country:')[0];
            }
            const variantIdx = orderDetails?.variantIndex != null ? orderDetails.variantIndex : (req.body.variantIndex || 0);
            const requestedVariantId = orderDetails?.variantId != null ? orderDetails.variantId : req.body.variantId;

            // Secure recalculation on server side
            try {
                const incomingVariantId = Number(requestedVariantId);
                if (!incomingVariantId) throw new Error("Variant ID is missing");

                const serviceDoc = await SmmService.findOne({ "variants.variantId": incomingVariantId });
                if (!serviceDoc) throw new Error("Service not found");

                const targetVariant = serviceDoc.variants.find(v => v.variantId === incomingVariantId);
                if (!targetVariant) throw new Error("Variant data corrupted");

                resolvedServiceId = serviceDoc.serviceId;
                selectedVariantName = trimSmmText(targetVariant.name);
                selectedVariantId = normalizeSmmServiceIdValue(targetVariant.variantId);
                selectedCountry = trimSmmText(targetVariant.country);
                selectedQuality = selectedVariantName;
                selectedSpeed = trimSmmText(targetVariant.speed);
                selectedRefill = trimSmmText(targetVariant.refill);

                const pricing = getSmmVariantPricing(targetVariant);
                selectedVariantBasePrice = pricing.basePrice;
                selectedVariantDiscountPercent = pricing.discountPercent;
                selectedVariantDiscountAmount = pricing.discountAmount;
                selectedVariantEffectivePrice = pricing.effectivePrice;

                let calculatedPrice = (targetVariant.price / 1000) * resolvedQuantity;
                if (targetVariant.discountPercent && targetVariant.discountPercent > 0) {
                    calculatedPrice = calculatedPrice * (1 - (targetVariant.discountPercent / 100));
                }
                normalizedOrderAmount = parseFloat(calculatedPrice.toFixed(2));
            } catch (err) {
                console.error("Server side recalculation error:", err);
            }
        } else {
            const amountCandidate = orderDetails?.price ?? orderDetails?.amount ?? 0;
            if (typeof amountCandidate === 'number') {
                normalizedOrderAmount = Number.isFinite(amountCandidate) ? amountCandidate : 0;
            } else if (typeof amountCandidate === 'string') {
                const cleanedAmount = amountCandidate.replace(/,/g, '').replace(/[^\d.-]/g, '');
                const parsedAmount = Number(cleanedAmount);
                normalizedOrderAmount = Number.isFinite(parsedAmount) ? parsedAmount : 0;
            }
        }

        const normalizedCouponCode = normalizeCouponCode(orderDetails?.couponCode || req.body.couponCode);
        const normalizedCouponFinalTotal = normalizeCheckoutTotal(orderDetails?.couponFinalTotal ?? req.body.couponFinalTotal);
        if (normalizedCouponCode) {
            if (req.user) {
                try {
                    const couponPricing = await resolveCouponCheckoutPricing({
                        code: normalizedCouponCode,
                        cartTotal: normalizedOrderAmount,
                        moduleName: orderDetails?.couponModule || (orderType === 'smm' ? 'smm' : 'general'),
                        user: req.user
                    });
                    normalizedOrderAmount = couponPricing.finalTotal;
                    if (orderDetails && typeof orderDetails === 'object') {
                        orderDetails.couponCode = couponPricing.coupon.code;
                        orderDetails.couponDiscountAmount = couponPricing.discountAmount;
                        orderDetails.couponFinalTotal = couponPricing.finalTotal;
                        orderDetails.couponModule = couponPricing.module;
                    }
                } catch (couponError) {
                    console.error('Coupon verification failed:', couponError);
                    if (normalizedCouponFinalTotal !== null) {
                        normalizedOrderAmount = normalizedCouponFinalTotal;
                    }
                }
            } else if (normalizedCouponFinalTotal !== null) {
                normalizedOrderAmount = normalizedCouponFinalTotal;
            }
        }

        let resolvedUserId = req.user?._id || null;
        const resolvedOrderItems = Array.isArray(orderDetails?.orderItems) ? orderDetails.orderItems : [];

        // If no active session is available, try to map to an existing user by checkout email.
        if (!resolvedUserId && orderDetails?.email) {
            try {
                const existingUser = await User.findOne({ email: String(orderDetails.email).toLowerCase().trim() }).select('_id').lean();
                resolvedUserId = existingUser?._id || null;
            } catch (_err) {
                resolvedUserId = null;
            }
        }

        const incomingIsDripFeed = req.body.isDripFeed === true || req.body.isDripFeed === 'true' || orderDetails?.isDripFeed === true || orderDetails?.isDripFeed === 'true';
        const incomingRuns = Number(req.body.runs || orderDetails?.runs || 1);
        const incomingInterval = Number(req.body.interval || orderDetails?.interval || 0);

        const isDripActive = (orderType === 'smm') && incomingIsDripFeed;
        const runsVal = isDripActive ? Math.max(2, incomingRuns) : 1;
        const intervalMins = isDripActive ? (incomingInterval * 60) : 0;
        const qtyPerRun = isDripActive ? Math.floor(resolvedQuantity / runsVal) : resolvedQuantity;
        const remainingRunsVal = isDripActive ? runsVal : 0;
        const nextRunTimestamp = isDripActive ? new Date() : null;

        const newOrder = new Order({
            orderId: "#ORD-" + Math.floor(100000 + Math.random() * 900000),
            paymentId: razorpay_payment_id,
            paymentStatus: 'Paid',
            workStatus: 'Work Pending',
            status: 'Work Pending',
            userId: resolvedUserId,
            ...orderDetails,
            orderAmount: normalizedOrderAmount,
            orderItems: resolvedOrderItems,
            orderType: orderType,
            serviceId: resolvedServiceId,
            quantity: resolvedQuantity,
            targetLink: resolvedTargetLink,
            instaLink: resolvedTargetLink || orderDetails?.instaLink || '', // backward compatibility
            selectedVariantName: selectedVariantName,
            selectedVariantId: selectedVariantId,
            selectedCountry: selectedCountry,
            selectedQuality: selectedQuality,
            selectedSpeed: selectedSpeed,
            selectedRefill: selectedRefill,
            selectedVariantBasePrice: selectedVariantBasePrice,
            selectedVariantDiscountPercent: selectedVariantDiscountPercent,
            selectedVariantDiscountAmount: selectedVariantDiscountAmount,
            selectedVariantEffectivePrice: selectedVariantEffectivePrice,
            isDripFeed: isDripActive,
            runs: runsVal,
            interval: intervalMins,
            quantityPerRun: qtyPerRun,
            remainingRuns: remainingRunsVal,
            nextRunAt: nextRunTimestamp,
            extraInput: req.body.extraInput || orderDetails?.extraInput || '',
            extraInputType: req.body.extraInputType || orderDetails?.extraInputType || 'none',
            date: new Date().toLocaleString()
        });

        try { if (mongoose.connection.readyState === 1) await newOrder.save(); } catch (e) { }

        if (req.user && normalizeCouponCode(orderDetails?.couponCode)) {
            try {
                await incrementCouponUsageByCode(orderDetails.couponCode);
            } catch (usageErr) {
                console.error('Failed to increment coupon usage after payment verification:', usageErr);
            }
        }

        // 🟢 MAGIC: Generate PDF in memory & Send Email
        try {
            const doc = new PDFDocument({ margin: 0, size: 'A4' });
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
                if (activeProvider === 'payu') return res.redirect('/checkout.html?step=3&status=success&orderId=' + encodeURIComponent(newOrder.orderId));
                res.json({ success: true, orderId: newOrder.orderId });
            });

            // Make the PDF content (Same as download logic)
            buildProfessionalInvoice(doc, newOrder);

        } catch (emailErr) {
            console.log("Failed to process email", emailErr);
            if (activeProvider === 'payu') return res.redirect('/checkout.html?step=3&status=success&orderId=' + encodeURIComponent(newOrder.orderId));
            res.json({ success: true, orderId: newOrder.orderId }); // Fallback response if PDF generation completely fails
        }
    } else {
        res.json({ success: false });
    }
});

// Admin Auth
app.post('/api/login', loginLimiter, async (req, res) => {
    const { email, password } = req.body;
    
    // Legacy fallback for transition / seeding
    if (!email && password === CURRENT_ADMIN_PASSWORD) {
        const token = jwt.sign({ role: 'Admin' }, process.env.JWT_SECRET, { expiresIn: '2h' });
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'Strict',
            maxAge: 2 * 60 * 60 * 1000 // 2 hours
        });
        return res.json({ success: true });
    }

    try {
        if (!email || !password) return res.json({ success: false, message: 'Email and password required' });
        
        const adminUser = await AdminUser.findOne({ email: email.toLowerCase(), isActive: true });
        if (!adminUser) return res.json({ success: false, message: 'Invalid credentials' });

        const isMatch = await bcrypt.compare(password, adminUser.password);
        if (!isMatch) return res.json({ success: false, message: 'Invalid credentials' });

        const token = jwt.sign({ 
            role: adminUser.role,
            adminId: adminUser._id,
            name: adminUser.name,
            email: adminUser.email,
            permissions: adminUser.permissions
        }, process.env.JWT_SECRET, { expiresIn: '12h' });

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'Strict',
            maxAge: 12 * 60 * 60 * 1000 // 12 hours
        });

        res.json({ success: true });
    } catch (err) {
        console.error("Admin login error:", err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});



// Global Cookie Logout
app.post('/api/auth/logout', (req, res) => {
    res.clearCookie('token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'Strict'
    });
    res.json({ success: true, message: "Logged out completely." });
});

// GET Current Session Info (Replacement for /api/client/me)
// Guest-safe: return success=false instead of 401 when no valid session exists.
app.get('/api/auth/me', optionalAuth, (req, res) => {
    if (!req.user) {
        return res.json({ success: false, user: null });
    }

    res.json({
        success: true,
        user: {
            _id: req.user._id || null,
            name: req.user.name || null,
            email: req.user.email || null,
            phone: req.user.phone || null,
            role: req.user.role || 'Client'
        }
    });
});

// GET Current Admin Context via Cookie
app.get('/api/admin/me', (req, res) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ success: false, message: "No active session." });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (['Admin', 'SuperAdmin', 'SubAdmin'].includes(decoded.role)) {
            res.json({ success: true, user: { 
                role: decoded.role,
                adminId: decoded.adminId,
                name: decoded.name,
                email: decoded.email,
                permissions: decoded.permissions || {} 
            } });
        } else {
            res.status(401).json({ success: false, message: "Role mismatch." });
        }
    } catch (err) {
        res.status(401).json({ success: false, message: "Token invalid or expired." });
    }
});

// ==========================================
// 🛡️ ADMIN MANAGEMENT APIs (SuperAdmin Only)
// ==========================================

app.get('/api/admin/admins', checkAuth, checkSuperAdmin, async (req, res) => {
    try {
        const admins = await AdminUser.find().select('-password').sort({ createdAt: -1 }).lean();
        res.json({ success: true, admins });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

app.post('/api/admin/admins', checkAuth, checkSuperAdmin, async (req, res) => {
    try {
        const { name, email, password, role, permissions } = req.body;
        if (!name || !email || !password) return res.status(400).json({ success: false, message: 'Missing required fields' });
        
        const existing = await AdminUser.findOne({ email: email.toLowerCase() });
        if (existing) return res.status(400).json({ success: false, message: 'Email already exists' });

        const hashedPassword = await bcrypt.hash(password, 10);
        const newAdmin = new AdminUser({
            name,
            email: email.toLowerCase(),
            password: hashedPassword,
            role: role || 'SubAdmin',
            permissions: permissions || {}
        });
        
        await newAdmin.save();
        res.json({ success: true, message: 'Admin created successfully' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

app.put('/api/admin/admins/:id', checkAuth, checkSuperAdmin, async (req, res) => {
    try {
        const { name, email, password, role, permissions, isActive } = req.body;
        const adminToUpdate = await AdminUser.findById(req.params.id);
        if (!adminToUpdate) return res.status(404).json({ success: false, message: 'Admin not found' });
        
        if (email && email.toLowerCase() !== adminToUpdate.email) {
            const existing = await AdminUser.findOne({ email: email.toLowerCase() });
            if (existing) return res.status(400).json({ success: false, message: 'Email already in use' });
            adminToUpdate.email = email.toLowerCase();
        }
        
        if (name) adminToUpdate.name = name;
        if (role) adminToUpdate.role = role;
        if (permissions) adminToUpdate.permissions = permissions;
        if (isActive !== undefined) adminToUpdate.isActive = isActive;
        if (password) adminToUpdate.password = await bcrypt.hash(password, 10);
        
        // Prevent disabling last SuperAdmin
        if (isActive === false && adminToUpdate.role === 'SuperAdmin') {
            const activeSupers = await AdminUser.countDocuments({ role: 'SuperAdmin', isActive: true });
            if (activeSupers <= 1) return res.status(400).json({ success: false, message: 'Cannot disable the last SuperAdmin' });
        }
        
        await adminToUpdate.save();
        res.json({ success: true, message: 'Admin updated successfully' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

app.delete('/api/admin/admins/:id', checkAuth, checkSuperAdmin, async (req, res) => {
    try {
        if (req.params.id === req.user.adminId) {
            return res.status(403).json({ success: false, message: 'Self-deletion is strictly prohibited.' });
        }
        
        const adminToDelete = await AdminUser.findById(req.params.id);
        if (!adminToDelete) return res.status(404).json({ success: false, message: 'Admin not found' });
        
        if (adminToDelete.role === 'SuperAdmin') {
            const activeSupers = await AdminUser.countDocuments({ role: 'SuperAdmin' });
            if (activeSupers <= 1) return res.status(400).json({ success: false, message: 'Cannot delete the last SuperAdmin' });
        }
        
        await AdminUser.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Admin deleted successfully' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// GET Current Client Context via Cookie
app.get('/api/client/me', async (req, res) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ success: false, message: "No active session." });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded.role === 'Client') {
            const user = await User.findOne({ email: decoded.email });
            if (!user) {
                console.log(`❌ Client not found: ${decoded.email}`);
                return res.status(401).json({ success: false });
            }
            res.json({ success: true, user: { _id: user._id, name: user.name, email: user.email, phone: user.phone } });
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

// ==========================================
// 💳 USER WALLET API (Client-Facing)
// ==========================================
app.get('/api/user/wallet', checkAuth, async (req, res) => {
    try {
        // Guard: this route is for clients only
        if (req.user.role === 'Admin') {
            return res.status(403).json({ success: false, error: 'Admins do not have a wallet.' });
        }

        const user = await User.findById(req.user._id).select('walletBalance walletId walletStatus name email');
        if (!user) return res.status(404).json({ success: false, error: 'User not found.' });

        const transactions = await Transaction.find({ userId: user._id }).sort({ createdAt: -1 });

        res.json({
            success: true,
            wallet: {
                walletBalance: user.walletBalance || 0,
                walletId: user.walletId || null,
                walletStatus: user.walletStatus || 'Active',
                name: user.name,
                email: user.email
            },
            transactions
        });
    } catch (e) {
        console.error('❌ User Wallet Error:', e);
        res.status(500).json({ success: false, error: e.message });
    }
});

// ==========================================
// 💳 USER WALLET PAYMENTS (Razorpay Top-up)
// ==========================================

// POST /api/payment/create-order
app.post('/api/payment/create-order', checkAuth, async (req, res) => {
    try {
        if (req.user.role === 'Admin') {
            return res.status(403).json({ success: false, error: 'Admins do not have a wallet.' });
        }

        const { amount } = req.body;
        const parsedAmount = Number(amount);
        if (!parsedAmount || isNaN(parsedAmount) || parsedAmount <= 0) {
            return res.status(400).json({ success: false, error: 'Invalid amount. Must be a positive number.' });
        }

        const options = {
            amount: Math.round(parsedAmount * 100), // convert to paise
            currency: 'INR',
            receipt: 'wallet_topup_' + Date.now()
        };

        const razorpayKeyId = process.env.RAZORPAY_KEY_ID;
        if (!razorpayKeyId) {
            return res.status(500).json({ success: false, error: 'Razorpay Key ID missing.' });
        }

        const order = await razorpay.orders.create(options);
        res.json({
            success: true,
            order_id: order.id,
            order,
            razorpayKeyId
        });
    } catch (e) {
        console.error('❌ Wallet Create Order Error:', e);
        res.status(500).json({ success: false, error: e.message || 'Razorpay order creation failed.' });
    }
});

// POST /api/payment/verify
app.post('/api/payment/verify', checkAuth, async (req, res) => {
    try {
        if (req.user.role === 'Admin') {
            return res.status(403).json({ success: false, error: 'Admins do not have a wallet.' });
        }

        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, amount } = req.body;
        const parsedAmount = Number(amount);

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || isNaN(parsedAmount) || parsedAmount <= 0) {
            return res.status(400).json({ success: false, error: 'Missing or invalid parameters.' });
        }

        // Verify signature using crypto
        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(body.toString()).digest('hex');

        if (expectedSignature !== razorpay_signature) {
            return res.status(400).json({ success: false, error: 'Payment signature verification failed.' });
        }

        // Find and update client user
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found.' });
        }

        // Check wallet status first
        if (user.walletStatus === 'Frozen' || user.walletStatus === 'Hold') {
            return res.status(403).json({ success: false, error: 'Your wallet is temporarily restricted.' });
        }

        // Add amount to user's walletBalance
        user.walletBalance = (user.walletBalance || 0) + parsedAmount;
        await user.save();

        // Create transaction history document
        const transaction = new Transaction({
            userId: user._id,
            type: 'Credit',
            amount: parsedAmount,
            description: 'Wallet Top-up via Razorpay',
            transactionId: razorpay_payment_id,
            status: 'Success'
        });
        await transaction.save();

        res.json({
            success: true,
            message: 'Wallet topped up successfully.',
            walletBalance: user.walletBalance
        });
    } catch (e) {
        console.error('❌ Wallet Verify Payment Error:', e);
        res.status(500).json({ success: false, error: e.message || 'Payment verification failed.' });
    }
});

// POST /api/checkout/wallet
app.post('/api/checkout/wallet', checkAuth, async (req, res) => {
    try {
        if (req.user.role === 'Admin') {
            return res.status(403).json({ success: false, error: 'Admins do not have a wallet.' });
        }

        const { amount, baseAmount, orderDetails, isSmm, serviceId, quantity, targetLink, orderType: incomingOrderType } = req.body;
        const couponCode = orderDetails?.couponCode || req.body.couponCode || '';
        const couponModule = orderDetails?.couponModule || req.body.couponModule || (incomingOrderType === 'smm' || orderDetails?.orderType === 'smm' ? 'smm' : 'general');
        const normalizedCouponCode = normalizeCouponCode(couponCode);
        let finalChargeAmount = Number(amount);
        const numericBaseAmount = Number(baseAmount);
        let appliedCouponPricing = null;
        let orderType = 'agency';
        let resolvedServiceId = '';
        let resolvedQuantity = 0;
        let resolvedTargetLink = '';
        let selectedVariantName = '';
        let selectedVariantId = null;
        let selectedCountry = '';
        let selectedQuality = '';
        let selectedSpeed = '';
        let selectedRefill = '';
        let selectedVariantBasePrice = 0;
        let selectedVariantDiscountPercent = 0;
        let selectedVariantDiscountAmount = 0;
        let selectedVariantEffectivePrice = 0;

        if (isSmm || orderDetails?.isSmm || incomingOrderType === 'smm' || orderDetails?.orderType === 'smm') {
            orderType = 'smm';
            resolvedQuantity = Number(quantity || orderDetails?.quantity || 0);
            resolvedTargetLink = targetLink || orderDetails?.targetLink || orderDetails?.instaLink || '';
            if (typeof resolvedTargetLink === 'string' && resolvedTargetLink.includes(' (Target Country:')) {
                resolvedTargetLink = resolvedTargetLink.split(' (Target Country:')[0];
            }

            const requestedVariantId = orderDetails?.variantId != null ? orderDetails.variantId : req.body.variantId;

            const incomingVariantId = Number(requestedVariantId);
            if (!incomingVariantId) return res.status(400).json({ success: false, error: "Variant ID is missing" });

            const serviceDoc = await SmmService.findOne({ "variants.variantId": incomingVariantId });
            if (!serviceDoc) return res.status(404).json({ success: false, error: "SMM Service not found." });

            const targetVariant = serviceDoc.variants.find(v => v.variantId === incomingVariantId);
            if (!targetVariant) return res.status(404).json({ success: false, error: "Variant data corrupted" });

            resolvedServiceId = serviceDoc.serviceId;
            selectedVariantName = trimSmmText(targetVariant.name);
            selectedVariantId = normalizeSmmServiceIdValue(targetVariant.variantId);
            selectedCountry = trimSmmText(targetVariant.country);
            selectedQuality = selectedVariantName;
            selectedSpeed = trimSmmText(targetVariant.speed);
            selectedRefill = trimSmmText(targetVariant.refill);

            const pricing = getSmmVariantPricing(targetVariant);
            selectedVariantBasePrice = pricing.basePrice;
            selectedVariantDiscountPercent = pricing.discountPercent;
            selectedVariantDiscountAmount = pricing.discountAmount;
            selectedVariantEffectivePrice = pricing.effectivePrice;

            let calculatedPrice = (targetVariant.price / 1000) * resolvedQuantity;
            if (targetVariant.discountPercent && targetVariant.discountPercent > 0) {
                calculatedPrice = calculatedPrice * (1 - (targetVariant.discountPercent / 100));
            }
            finalChargeAmount = parseFloat(calculatedPrice.toFixed(2));

            if (!Number.isFinite(finalChargeAmount) || finalChargeAmount <= 0) {
                return res.status(400).json({ success: false, error: 'Invalid SMM variant price.' });
            }
        } else if (isNaN(finalChargeAmount) || finalChargeAmount <= 0) {
            return res.status(400).json({ success: false, error: 'Invalid checkout amount.' });
        }

        // Fetch User and check wallet balance
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found.' });
        }

        if (normalizedCouponCode) {
            const couponBaseAmount = Number.isFinite(numericBaseAmount) && numericBaseAmount > 0 ? numericBaseAmount : finalChargeAmount;
            if (!Number.isFinite(couponBaseAmount) || couponBaseAmount <= 0) {
                return res.status(400).json({ success: false, error: 'Original amount is required when applying a coupon.' });
            }

            appliedCouponPricing = await resolveCouponCheckoutPricing({
                code: normalizedCouponCode,
                cartTotal: couponBaseAmount,
                moduleName: couponModule,
                user
            });
            finalChargeAmount = appliedCouponPricing.finalTotal;
            if (orderDetails && typeof orderDetails === 'object') {
                orderDetails.couponCode = appliedCouponPricing.coupon.code;
                orderDetails.couponDiscountAmount = appliedCouponPricing.discountAmount;
                orderDetails.couponFinalTotal = appliedCouponPricing.finalTotal;
                orderDetails.couponModule = appliedCouponPricing.module;
            }
        }

        const resolvedOrderItems = Array.isArray(orderDetails?.orderItems) ? orderDetails.orderItems : [];

        if (finalChargeAmount <= 0 && appliedCouponPricing) {
            const freeOrder = await createFreeCheckoutOrder({
                userId: user._id,
                orderDetails,
                orderType,
                resolvedServiceId,
                resolvedQuantity,
                resolvedTargetLink,
                selectedVariantName,
                selectedVariantId,
                selectedCountry,
                selectedQuality,
                selectedSpeed,
                selectedRefill,
                selectedVariantBasePrice,
                selectedVariantDiscountPercent,
                selectedVariantDiscountAmount,
                selectedVariantEffectivePrice,
                isDripActive: false,
                runsVal: 1,
                intervalMins: 0,
                qtyPerRun: 0,
                remainingRunsVal: 0,
                nextRunTimestamp: null,
                resolvedOrderItems,
                currency: orderDetails?.currency || req.body.currency || 'INR',
                couponPricing: appliedCouponPricing
            });

            try {
                await incrementCouponUsageByCode(appliedCouponPricing.coupon.code);
            } catch (usageErr) {
                console.error('Failed to increment coupon usage after free wallet checkout:', usageErr);
            }

            return res.json({
                status: 'success_free',
                success: true,
                message: 'Order placed for free!',
                orderId: freeOrder.orderId
            });
        }

        // Check if wallet is Active
        if (user.walletStatus !== 'Active') {
            return res.status(403).json({ success: false, error: `Your wallet is currently ${user.walletStatus || 'restricted'}.` });
        }

        // Check wallet balance
        if ((user.walletBalance || 0) < finalChargeAmount) {
            return res.status(400).json({ success: false, error: 'Insufficient Wallet Balance.' });
        }

        // Deduct balance
        user.walletBalance = (user.walletBalance || 0) - finalChargeAmount;
        await user.save();

        // Pre-generate Order ID for transaction linking
        const generatedOrderId = "#ORD-" + Math.floor(100000 + Math.random() * 900000);

        const incomingIsDripFeed = req.body.isDripFeed === true || req.body.isDripFeed === 'true' || orderDetails?.isDripFeed === true || orderDetails?.isDripFeed === 'true';
        const incomingRuns = Number(req.body.runs || orderDetails?.runs || 1);
        const incomingInterval = Number(req.body.interval || orderDetails?.interval || 0);

        const isDripActive = (orderType === 'smm') && incomingIsDripFeed;
        const runsVal = isDripActive ? Math.max(2, incomingRuns) : 1;
        const intervalMins = isDripActive ? (incomingInterval * 60) : 0;
        const qtyPerRun = isDripActive ? Math.floor(resolvedQuantity / runsVal) : resolvedQuantity;
        const remainingRunsVal = isDripActive ? runsVal : 0;
        const nextRunTimestamp = isDripActive ? new Date() : null;

        // Create transaction history document first to get its unique _id
        const packageName = orderDetails?.package || 'Service Package';
        let txnDescription = `Purchased ${packageName} (Order ${generatedOrderId})`;
        if (orderType === 'smm') {
            const detailParts = [selectedVariantName, selectedCountry, selectedSpeed].filter(Boolean);
            if (detailParts.length) {
                txnDescription = `Purchased ${packageName} (${detailParts.join(', ')}) (Order ${generatedOrderId})`;
            }
        }
        const transaction = new Transaction({
            userId: user._id,
            type: 'Debit',
            amount: finalChargeAmount,
            description: txnDescription,
            status: 'Success'
        });
        const finalTxnId = `#TXN-${transaction._id.toString().slice(-8).toUpperCase()}`;
        transaction.transactionId = finalTxnId;
        await transaction.save();

        const newOrder = new Order({
            orderId: generatedOrderId,
            paymentId: finalTxnId,
            paymentStatus: 'Paid via Wallet',
            workStatus: 'Work Pending',
            status: 'Work Pending',
            userId: user._id,
            ...orderDetails,
            orderAmount: finalChargeAmount,
            orderItems: resolvedOrderItems,
            orderType: orderType,
            serviceId: resolvedServiceId,
            quantity: resolvedQuantity,
            targetLink: resolvedTargetLink,
            instaLink: resolvedTargetLink || orderDetails?.instaLink || '', // backward compatibility
            selectedVariantName: selectedVariantName,
            selectedVariantId: selectedVariantId,
            selectedCountry: selectedCountry,
            selectedQuality: selectedQuality,
            selectedSpeed: selectedSpeed,
            selectedRefill: selectedRefill,
            selectedVariantBasePrice: selectedVariantBasePrice,
            selectedVariantDiscountPercent: selectedVariantDiscountPercent,
            selectedVariantDiscountAmount: selectedVariantDiscountAmount,
            selectedVariantEffectivePrice: selectedVariantEffectivePrice,
            isDripFeed: isDripActive,
            runs: runsVal,
            interval: intervalMins,
            quantityPerRun: qtyPerRun,
            remainingRuns: remainingRunsVal,
            nextRunAt: nextRunTimestamp,
            extraInput: req.body.extraInput || orderDetails?.extraInput || '',
            extraInputType: req.body.extraInputType || orderDetails?.extraInputType || 'none',
            date: new Date().toLocaleString()
        });

        if (mongoose.connection.readyState === 1) {
            await newOrder.save();
        }

        if (normalizeCouponCode(orderDetails?.couponCode)) {
            try {
                await incrementCouponUsageByCode(orderDetails.couponCode);
            } catch (usageErr) {
                console.error('Failed to increment coupon usage after wallet checkout:', usageErr);
            }
        }

        // Generate PDF and Send Invoice Email (Background process with callback)
        try {
            const doc = new PDFDocument({ margin: 0, size: 'A4' });
            let buffers = [];
            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', async () => {
                let pdfData = Buffer.concat(buffers);

                let mailOptions = {
                    from: process.env.EMAIL_USER,
                    to: newOrder.email || user.email,
                    subject: `Order Confirmed! Your Invoice ${newOrder.orderId} - VibeSphere Media`,
                    text: `Hi ${newOrder.customerName || user.name},\n\nThank you for choosing VibeSphere Media! Your payment was successful using your VibeSphere Wallet, and your order (${newOrder.orderId}) is now confirmed.\n\nPlease find your official invoice attached to this email.\n\nOur team will contact you shortly to start the work.\n\nRegards,\nTeam VibeSphere`,
                    attachments: [{ filename: `Invoice-${newOrder.orderId}.pdf`, content: pdfData }]
                };

                transporter.sendMail(mailOptions).catch(err => console.error('Background Email Error:', err));

                res.json({ success: true, orderId: newOrder.orderId, transactionId: transaction.transactionId });
            });

            buildProfessionalInvoice(doc, newOrder);
        } catch (emailErr) {
            console.log("Failed to process email", emailErr);
            res.json({ success: true, orderId: newOrder.orderId, transactionId: transaction.transactionId }); // Fallback response
        }
    } catch (e) {
        console.error('❌ Wallet Checkout Error:', e);
        res.status(e.status || 500).json({ success: false, error: e.message || 'Wallet checkout failed.' });
    }
});

// POST /api/billing/apply-coupon
app.post('/api/billing/apply-coupon', optionalAuth, async (req, res) => {
    try {
        console.log('--- COUPON API HIT ---');
        console.log('User ID:', req.user ? (req.user._id || req.user.role || 'UNKNOWN') : 'NO USER');
        console.log('Payload Received:', req.body);

        if (!req.user) {
            return res.status(401).json({ error: 'Please login first to apply promo codes.' });
        }

        const pricing = await resolveCouponCheckoutPricing({
            code: req.body?.code,
            cartTotal: req.body?.cartTotal,
            moduleName: req.body?.module,
            user: req.user
        });

        res.json({
            success: true,
            module: pricing.module,
            cartTotal: pricing.cartTotal,
            discountAmount: pricing.discountAmount,
            finalTotal: pricing.finalTotal,
            coupon: {
                code: pricing.coupon.code,
                discountType: pricing.coupon.discountType,
                discountValue: pricing.coupon.discountValue,
                maxDiscountAmount: pricing.coupon.maxDiscountAmount,
                minOrderValue: pricing.coupon.minOrderValue,
                applicableModules: pricing.coupon.applicableModules,
                usageLimit: pricing.coupon.usageLimit,
                usageCount: pricing.coupon.usageCount,
                isGlobal: pricing.coupon.isGlobal,
                expiryDate: pricing.coupon.expiryDate || null,
                expiresAt: pricing.coupon.expiresAt || null
            }
        });
    } catch (e) {
        console.error('❌ Apply Coupon Error:', e);
        res.status(e.status || 500).json({ success: false, error: e.message || 'Failed to apply coupon.' });
    }
});

// ==========================================
// 💳 PAYMENT GATEWAY ADMIN ROUTES
// ==========================================
app.get('/api/admin/gateways', checkAuth, async (req, res) => {
    try {
        if (!['Admin', 'SuperAdmin', 'SubAdmin'].includes(req.user.role)) {
            return res.status(403).json({ success: false, error: 'Unauthorized admin access.' });
        }
        const gateways = await PaymentGateway.find().lean();

        // Mask the apiSecret before sending to frontend
        const maskedGateways = gateways.map(gw => ({
            ...gw,
            apiSecret: gw.apiSecret ? 'sk_live_********' : ''
        }));

        res.json({ success: true, gateways: maskedGateways });
    } catch (error) {
        console.error('Error fetching gateways:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch gateways' });
    }
});

app.post('/api/admin/gateways', checkAuth, async (req, res) => {
    try {
        if (!['Admin', 'SuperAdmin', 'SubAdmin'].includes(req.user.role)) {
            return res.status(403).json({ success: false, error: 'Unauthorized admin access.' });
        }

        const { gatewayId, isActive, apiKey, apiSecret, minOrder, maxOrder } = req.body;

        if (!gatewayId) return res.status(400).json({ success: false, error: 'gatewayId is required' });

        const existingGateway = await PaymentGateway.findOne({ gatewayId });

        let encryptedSecret = existingGateway ? existingGateway.apiSecret : '';
        // If a new secret was provided and it's not the masked placeholder, encrypt it
        if (apiSecret && apiSecret !== 'sk_live_********') {
            encryptedSecret = encryptGatewaySecret(apiSecret);
        }

        const updated = await PaymentGateway.findOneAndUpdate(
            { gatewayId },
            {
                isActive: !!isActive,
                apiKey,
                apiSecret: encryptedSecret,
                minOrder: Number(minOrder) || 0,
                maxOrder: Number(maxOrder) || 0
            },
            { new: true, upsert: true }
        ).lean();

        res.json({ success: true, gateway: { ...updated, apiSecret: 'sk_live_********' } });
    } catch (error) {
        console.error('Error saving gateway:', error);
        res.status(500).json({ success: false, error: 'Failed to save gateway' });
    }
});

app.get('/api/admin/coupons', checkAuth, async (req, res) => {
    try {
        if (!['Admin', 'SuperAdmin', 'SubAdmin'].includes(req.user.role)) {
            return res.status(403).json({ success: false, error: 'Unauthorized admin access.' });
        }

        const coupons = await Coupon.find().sort({ createdAt: -1 }).lean();
        res.json({
            success: true,
            coupons: coupons.map((coupon) => formatCouponAdminResponse(coupon))
        });
    } catch (e) {
        console.error('Error in GET /api/admin/coupons:', e);
        res.status(500).json({ success: false, error: e.message || 'Failed to fetch coupons.' });
    }
});

app.post('/api/admin/coupons', checkAuth, async (req, res) => {
    try {
        if (!['Admin', 'SuperAdmin', 'SubAdmin'].includes(req.user.role)) {
            return res.status(403).json({ success: false, error: 'Unauthorized admin access.' });
        }

        const code = normalizeCouponCode(req.body?.code);
        const discountType = trimSmmText(req.body?.discountType).toLowerCase() === 'fixed' ? 'fixed' : 'percent';
        const discountValue = Number(req.body?.discountValue);
        const maxDiscountAmount = normalizeCouponAmount(req.body?.maxDiscountAmount, 0);
        const minOrderValue = normalizeCouponAmount(req.body?.minOrderValue, 0);
        const usageLimit = normalizeCouponLimit(req.body?.usageLimit, 0);
        const applicableModules = normalizeCouponModules(req.body?.applicableModules, { defaultToAll: true });
        const expiryDate = normalizeCouponExpiryDate(req.body?.expiryDate);
        const restrictedEmail = String(req.body?.restrictedEmail || '').trim().toLowerCase();
        let isGlobalUser = true;
        let allowedUsers = [];

        if (!code) {
            return res.status(400).json({ success: false, error: 'Coupon code is required.' });
        }

        if (!Number.isFinite(discountValue) || discountValue <= 0) {
            return res.status(400).json({ success: false, error: 'Discount value must be a positive number.' });
        }

        if (discountType === 'percent' && discountValue > 100) {
            return res.status(400).json({ success: false, error: 'Percent discounts cannot exceed 100.' });
        }

        const existing = await Coupon.findOne({ code: new RegExp(`^${escapeRegex(code)}$`, 'i') }).lean();
        if (existing) {
            return res.status(409).json({ success: false, error: 'A coupon with this code already exists.' });
        }

        if (restrictedEmail) {
            const targetUser = await User.findOne({ email: new RegExp(`^${escapeRegex(restrictedEmail)}$`, 'i') }).select('_id email').lean();
            if (!targetUser) {
                return res.status(404).json({ success: false, error: 'User with this email not found in database.' });
            }

            isGlobalUser = false;
            allowedUsers = [targetUser._id];
        }

        const coupon = await Coupon.create({
            code,
            discountType,
            discountValue: Number(discountValue.toFixed(2)),
            maxDiscountAmount,
            minOrderValue,
            applicableModules,
            usageLimit,
            usageCount: 0,
            expiryDate,
            expiresAt: expiryDate,
            isGlobal: applicableModules.includes('all'),
            isGlobalUser,
            allowedUsers
        });

        res.json({
            success: true,
            coupon: formatCouponAdminResponse(coupon.toObject())
        });
    } catch (e) {
        console.error('Error in POST /api/admin/coupons:', e);
        if (e && e.code === 11000) {
            return res.status(409).json({ success: false, error: 'A coupon with this code already exists.' });
        }
        res.status(500).json({ success: false, error: e.message || 'Failed to create coupon.' });
    }
});

app.delete('/api/admin/coupons/:id', checkAuth, async (req, res) => {
    try {
        if (!['Admin', 'SuperAdmin', 'SubAdmin'].includes(req.user.role)) {
            return res.status(403).json({ success: false, error: 'Unauthorized admin access.' });
        }

        const deleted = await Coupon.findByIdAndDelete(req.params.id);
        if (!deleted) {
            return res.status(404).json({ success: false, error: 'Coupon not found.' });
        }

        res.json({ success: true, message: 'Coupon deleted successfully.' });
    } catch (e) {
        console.error('Error in DELETE /api/admin/coupons/:id:', e);
        res.status(500).json({ success: false, error: e.message || 'Failed to delete coupon.' });
    }
});

app.put('/api/admin/coupons/:id/toggle', checkAuth, async (req, res) => {
    try {
        if (!['Admin', 'SuperAdmin', 'SubAdmin'].includes(req.user.role)) {
            return res.status(403).json({ success: false, error: 'Unauthorized admin access.' });
        }

        const coupon = await Coupon.findById(req.params.id);
        if (!coupon) {
            return res.status(404).json({ success: false, error: 'Coupon not found.' });
        }

        coupon.isActive = !coupon.isActive;
        await coupon.save();

        res.json({
            success: true,
            coupon: formatCouponAdminResponse(coupon.toObject())
        });
    } catch (e) {
        console.error('Error in PUT /api/admin/coupons/:id/toggle:', e);
        res.status(500).json({ success: false, error: e.message || 'Failed to update coupon status.' });
    }
});


app.get('/api/admin/orders', checkAuth, async (req, res) => {
    try {
        const type = String(req.query.type || '').trim().toLowerCase();
        let query = {};
        if (type === 'smm') {
            query = { orderType: 'smm' };
        } else if (type === 'agency') {
            query = {
                $or: [
                    { orderType: 'agency' },
                    { orderType: { $exists: false } },
                    { orderType: null }
                ]
            };
        }
        let orders = await Order.find(query).sort({ _id: -1 });
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
    const { id, status, workStatus } = req.body;
    const rawWorkStatus = String(workStatus || status || '').trim() || 'Work Pending';
    const nextWorkStatus = rawWorkStatus === 'Processing' ? 'In Progress' : rawWorkStatus;

    try {
        const order = await Order.findOne({ orderId: id });
        if (!order) return res.status(404).json({ success: false, message: "Order not found" });

        // 🟢 COMMISSION ENGINE LOGIC
        if (nextWorkStatus === 'Completed' && String(order.workStatus || order.status || '').trim() !== 'Completed' && order.assignedStaff) {
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

        order.workStatus = nextWorkStatus;
        order.status = nextWorkStatus; // compatibility alias for legacy UI/code paths
        const updatedOrder = await order.save();

        // Client dashboard live signal
        if (updatedOrder && updatedOrder.email) {
            io.to(updatedOrder.email).emit('status_updated', {
                orderId: updatedOrder.orderId,
                status: updatedOrder.workStatus,
                paymentStatus: updatedOrder.paymentStatus,
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
        const now = Date.now();
        const reassignmentWindowMs = 24 * 60 * 60 * 1000;

        // 🛡️ NAYA FIX: Pehle check karo ki ye email exist bhi karta hai ya nahi?
        const staffExists = await Staff.findOne({ email: cleanEmail });
        if (!staffExists) {
            return res.json({ success: false, message: "Staff account not found! Email ki spelling check karo." });
        }

        if (order.assignedStaff === cleanEmail) {
            return res.json({ success: true, message: 'Order is already assigned to this staff member.' });
        }

        const isReassignment = Boolean(order.assignedStaff && order.assignedStaff !== cleanEmail);
        if (isReassignment && order.assignedAt) {
            const assignedAtMs = new Date(order.assignedAt).getTime();
            if (Number.isFinite(assignedAtMs) && (now - assignedAtMs) > reassignmentWindowMs) {
                return res.status(400).json({ success: false, message: 'Cannot reassign after 24 hours' });
            }
        }

        order.assignedStaff = cleanEmail;
        order.assignedAt = new Date(now);

        // 🚀 SUPER FIX: Agar order pehle se Completed hai, toh assignment ke waqt hi commission de do!
        if ((order.workStatus === 'Completed' || order.status === 'Completed') && (!order.commissionValue || order.commissionValue === 0)) {
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

        res.json({
            success: true,
            message: isReassignment
                ? 'Order reassigned successfully. Assignment timer reset.'
                : 'Staff assigned successfully.'
        });
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
app.post('/api/add-blog', checkAuth, checkAdmin, async (req, res) => {
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
app.put('/api/edit-blog/:id', checkAuth, checkAdmin, async (req, res) => {
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
app.delete('/api/delete-blog/:id', checkAuth, checkAdmin, async (req, res) => {
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
        }, process.env.JWT_SECRET, { expiresIn: '7d' });

        res.cookie('token', jwtToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'Strict',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        // Login Success
        res.json({ success: true, message: "Google account connected" });

    } catch (e) {
        console.error("Google Auth Error:", e);
        res.status(500).json({ success: false, error: "Google Auth Failed" });
    }
});
// ==========================================
// 👮‍♂️ ADMIN: STAFF MANAGEMENT APIs
// ==========================================

app.get('/api/admin/dashboard-summary', checkAuth, async (req, res) => {
    try {
        if (!['Admin', 'SuperAdmin', 'SubAdmin'].includes(req.user?.role)) {
            return res.status(403).json({ success: false, message: 'Admin access required.' });
        }

        const todayDateString = getISTDateString(0);
        const [totalStaff, presentToday, onlineNow, pendingApprovals, pendingLeaves] = await Promise.all([
            Staff.countDocuments({}),
            Attendance.countDocuments({ dateString: todayDateString, status: 'Present' }),
            Staff.countDocuments({ isOnline: true }),
            DocumentApproval.countDocuments({ approvalStatus: 'Pending_Approval' }),
            Leave.countDocuments({ status: 'Pending' })
        ]);

        res.json({
            success: true,
            stats: {
                totalStaff,
                presentToday,
                onlineNow,
                pendingApprovals,
                pendingLeaves
            }
        });
    } catch (e) {
        console.error('Admin dashboard summary error:', e.message);
        res.status(500).json({ success: false, message: 'Failed to fetch dashboard summary.' });
    }
});

app.get('/api/admin/staff-directory', checkAuth, async (req, res) => {
    try {
        if (!['Admin', 'SuperAdmin', 'SubAdmin'].includes(req.user?.role)) {
            return res.status(403).json({ success: false, message: 'Admin access required.' });
        }

        const search = String(req.query.search || '').trim();
        const status = String(req.query.status || 'all').toLowerCase();
        const page = parsePositiveInt(req.query.page, 1);
        const limit = Math.min(parsePositiveInt(req.query.limit, 8), 50);
        const query = {};

        if (status === 'active') query.isOnline = true;
        if (status === 'inactive') query.isOnline = false;
        if (search) {
            const regex = new RegExp(escapeRegex(search), 'i');
            query.$or = [{ name: regex }, { email: regex }, { empId: regex }];
        }

        const projection = 'name email role empId isOnline isMuted monthlyTarget joiningDate profilePhoto';

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayEnd = new Date(today);
        todayEnd.setHours(23, 59, 59, 999);

        // ⚡ Optimized: only fetch leaves where today falls within the approved window
        const approvedLeaves = await Leave.find({
            status: 'Approved',
            dateFrom: { $lte: todayEnd },
            dateTo: { $gte: today }
        })
            .select('staffEmail dateFrom dateTo')
            .lean();

        const leaveByEmail = new Map();
        approvedLeaves.forEach((leave) => {
            leaveByEmail.set(leave.staffEmail, {
                isOnLeave: true,
                dateFrom: leave.dateFrom,
                dateTo: leave.dateTo
            });
        });

        const enrichStaff = (staffList) => staffList.map((staff) => {
            const leaveInfo = leaveByEmail.get(staff.email) || {};
            return {
                ...staff,
                isOnLeave: Boolean(leaveInfo.isOnLeave),
                leaveDateFrom: leaveInfo.dateFrom || '',
                leaveDateTo: leaveInfo.dateTo || ''
            };
        });

        if (String(req.query.all || '') === '1') {
            const staff = await Staff.find(query).select(projection).sort({ name: 1 }).lean();
            return res.json({ success: true, staff: enrichStaff(staff) });
        }

        const total = await Staff.countDocuments(query);
        const totalPages = Math.max(1, Math.ceil(total / limit));
        const safePage = Math.min(page, totalPages);
        const staff = await Staff.find(query)
            .select(projection)
            .sort({ name: 1 })
            .skip((safePage - 1) * limit)
            .limit(limit)
            .lean();

        res.json({
            success: true,
            staff: enrichStaff(staff),
            pagination: {
                page: safePage,
                limit,
                total,
                totalPages
            }
        });
    } catch (e) {
        console.error('Admin staff directory error:', e.message);
        res.status(500).json({ success: false, message: 'Failed to fetch staff directory.' });
    }
});

app.get('/api/admin/staff-list', checkAuth, async (req, res) => {
    try {
        if (!['Admin', 'SuperAdmin', 'SubAdmin'].includes(req.user?.role)) {
            return res.status(403).json({ success: false, message: 'Admin access required.' });
        }

        const staff = await Staff.find({}, 'name email role')
            .sort({ name: 1, email: 1 })
            .lean();

        res.json({ success: true, staff });
    } catch (e) {
        console.error('Admin staff list error:', e.message);
        res.status(500).json({ success: false, message: 'Failed to fetch staff list.' });
    }
});

function parseFinanceMoney(value) {
    const numeric = parseFloat(String(value || '').replace(/[^0-9.]/g, ''));
    return Number.isFinite(numeric) ? numeric : 0;
}

async function buildFinanceDashboardPayload({ year, month }) {
    const now = new Date();
    const selectedYear = parsePositiveInt(year, now.getFullYear());
    const selectedMonthRaw = String(month || 'all').toLowerCase();
    const selectedMonth = selectedMonthRaw === 'all' ? 0 : parsePositiveInt(selectedMonthRaw, 0);

    const [orders, staffRows, paidPayouts, expenses, financeTransactions] = await Promise.all([
        Order.find().lean(),
        Staff.find({}, 'pendingPayout').lean(),
        Payout.find({ status: 'Paid' }).lean(),
        Expense.find().lean(),
        FinancialTransaction.find().sort({ date: -1 }).lean()
    ]);

    const financeTransactionByPayoutId = new Set(
        financeTransactions
            .filter((transaction) => transaction.payoutRequestId)
            .map((transaction) => String(transaction.payoutRequestId))
    );
    const financeTransactionByExpenseId = new Set(
        financeTransactions
            .filter((transaction) => transaction.expenseId)
            .map((transaction) => String(transaction.expenseId))
    );
    const ledgerTransactions = [...financeTransactions];

    paidPayouts.forEach((payout) => {
        const payoutId = String(payout._id);
        if (payout.financeTransactionId || financeTransactionByPayoutId.has(payoutId)) return;
        ledgerTransactions.push({
            _id: `legacy-payout-${payoutId}`,
            title: `Salary payout - ${payout.staffName || payout.staffEmail || 'Staff'}`,
            amount: Number(payout.amount || 0),
            type: 'SALARY',
            kind: 'debit',
            category: 'Payout Approval',
            source: 'LEGACY_PAYOUT',
            meta: 'Approved payout request',
            notes: `Legacy salary payout from request ${payoutId}`,
            staffName: payout.staffName || '',
            staffEmail: payout.staffEmail || '',
            staffEmpId: payout.staffEmpId || '',
            payoutRequestId: payout._id,
            date: payout.date
        });
    });

    expenses.forEach((expense) => {
        const expenseId = String(expense._id);
        if (expense.financeTransactionId || financeTransactionByExpenseId.has(expenseId)) return;
        ledgerTransactions.push({
            _id: `legacy-expense-${expenseId}`,
            title: expense.title || 'Expense',
            amount: Number(expense.amount || 0),
            type: 'EXPENSE',
            kind: 'debit',
            category: expense.category || 'General',
            source: 'LEGACY_EXPENSE',
            meta: expense.category || 'General',
            notes: `Legacy expense entry for ${expense.title || 'Expense'}`,
            expenseId: expense._id,
            date: expense.date
        });
    });

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const months = [];
    const monthMap = new Map();
    const monthIndexes = selectedMonth ? [selectedMonth - 1] : Array.from({ length: 12 }, (_, index) => index);

    monthIndexes.forEach((monthIndex) => {
        const key = `${selectedYear}-${String(monthIndex + 1).padStart(2, '0')}`;
        const bucket = {
            key,
            label: `${monthNames[monthIndex]} ${String(selectedYear).slice(-2)}`,
            revenue: 0,
            expenses: 0,
            salaryPayouts: 0
        };
        months.push(bucket);
        monthMap.set(key, bucket);
    });

    const totalRevenue = orders.reduce((sum, order) => sum + parseFinanceMoney(order.price), 0);
    const totalSalaryPaid = ledgerTransactions
        .filter((transaction) => transaction.type === 'SALARY')
        .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);
    const totalExpenses = ledgerTransactions
        .filter((transaction) => transaction.type === 'EXPENSE')
        .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);
    const pendingSalary = staffRows.reduce((sum, staff) => sum + (Number(staff.pendingPayout) || 0), 0);

    orders.forEach((order) => {
        const date = order.date ? new Date(order.date) : null;
        if (!date || Number.isNaN(date.getTime())) return;
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const bucket = monthMap.get(key);
        if (bucket) bucket.revenue += parseFinanceMoney(order.price);
    });

    ledgerTransactions.forEach((transaction) => {
        const date = transaction.date ? new Date(transaction.date) : null;
        if (!date || Number.isNaN(date.getTime())) return;
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const bucket = monthMap.get(key);
        if (!bucket) return;
        const amount = Number(transaction.amount || 0);
        if (transaction.type === 'SALARY') {
            bucket.salaryPayouts += amount;
        } else if (transaction.type === 'EXPENSE') {
            bucket.expenses += amount;
        }
    });

    const transactions = [
        ...orders.map((order) => ({
            id: `order-${order._id}`,
            kind: 'credit',
            type: 'INCOME',
            expenseId: '',
            title: order.package || order.orderId || 'Order Revenue',
            subtitle: `${order.customerName || 'Client'}${order.orderId ? ` • ${order.orderId}` : ''}`,
            amount: parseFinanceMoney(order.price),
            date: order.date ? new Date(order.date) : null,
            meta: order.status || 'Pending'
        })),
        ...ledgerTransactions.map((transaction) => ({
            id: `finance-${transaction._id}`,
            kind: transaction.kind || 'debit',
            type: transaction.type,
            expenseId: transaction.expenseId ? String(transaction.expenseId) : '',
            title: transaction.title || (transaction.type === 'SALARY' ? 'Salary Payout' : 'Expense'),
            subtitle: transaction.staffName
                ? `${transaction.staffName}${transaction.staffEmpId ? ` • ${transaction.staffEmpId}` : ''}`
                : (transaction.category || transaction.notes || ''),
            amount: Number(transaction.amount || 0),
            date: transaction.date ? new Date(transaction.date) : null,
            meta: transaction.type === 'SALARY'
                ? `Salary • ${transaction.meta || 'Payout Approved'}`
                : (transaction.category || transaction.meta || 'Expense')
        }))
    ]
        .filter((item) => item.date && !Number.isNaN(item.date.getTime()))
        .sort((a, b) => b.date - a.date)
        .slice(0, 25)
        .map((item) => ({
            ...item,
            date: item.date.toISOString()
        }));

    return {
        selectedYear,
        selectedMonth: selectedMonth || 'all',
        summary: {
            totalRevenue,
            totalSalaryPaid,
            totalExpenses,
            pendingSalary,
            netProfit: totalRevenue - totalExpenses - totalSalaryPaid
        },
        chart: months,
        transactions
    };
}

app.get('/api/admin/finance-overview', checkAuth, async (req, res) => {
    try {
        if (!['Admin', 'SuperAdmin', 'SubAdmin'].includes(req.user?.role)) {
            return res.status(403).json({ success: false, message: 'Admin access required.' });
        }
        const payload = await buildFinanceDashboardPayload({ year: req.query.year, month: req.query.month });

        res.json({
            success: true,
            summary: {
                totalRevenue: payload.summary.totalRevenue,
                totalExpenses: payload.summary.totalExpenses,
                totalSalariesPaid: payload.summary.totalSalaryPaid,
                totalSalaryPaid: payload.summary.totalSalaryPaid,
                pendingDues: payload.summary.pendingSalary,
                totalExpectedPayouts: payload.summary.pendingSalary,
                pendingStaffSalary: payload.summary.pendingSalary,
                pendingSalary: payload.summary.pendingSalary,
                netProfit: payload.summary.netProfit
            },
            chart: payload.chart,
            filters: {
                year: payload.selectedYear,
                month: payload.selectedMonth
            },
            transactions: payload.transactions
        });
    } catch (e) {
        console.error('Admin finance overview error:', e.message);
        res.status(500).json({ success: false, message: 'Failed to fetch finance overview.' });
    }
});

app.get('/api/finance/stats', checkAuth, checkAdmin, async (req, res) => {
    try {
        const payload = await buildFinanceDashboardPayload({ year: req.query.year, month: req.query.month });
        res.json({
            success: true,
            totalRevenue: payload.summary.totalRevenue,
            totalSalaryPaid: payload.summary.totalSalaryPaid,
            totalExpenses: payload.summary.totalExpenses,
            pendingSalary: payload.summary.pendingSalary,
            netProfit: payload.summary.netProfit,
            chart: payload.chart,
            transactions: payload.transactions,
            filters: {
                year: payload.selectedYear,
                month: payload.selectedMonth
            }
        });
    } catch (e) {
        console.error('Finance stats error:', e.message);
        res.status(500).json({ success: false, message: 'Failed to fetch finance stats.' });
    }
});

app.get('/api/admin/attendance-log', checkAuth, async (req, res) => {
    try {
        if (!['Admin', 'SuperAdmin', 'SubAdmin'].includes(req.user?.role)) {
            return res.status(403).json({ success: false, message: 'Admin access required.' });
        }

        const search = String(req.query.search || '').trim();
        const status = String(req.query.status || 'all').trim();
        const month = parsePositiveInt(req.query.month, 0);
        const year = parsePositiveInt(req.query.year, 0);
        const page = parsePositiveInt(req.query.page, 1);
        const limit = Math.min(parsePositiveInt(req.query.limit, 10), 50);
        const query = {};

        if (month && year) {
            query.dateString = { $regex: new RegExp(monthRegexString(month, year)) };
        }
        if (status && status.toLowerCase() !== 'all') {
            query.status = status;
        }
        if (search) {
            const regex = new RegExp(escapeRegex(search), 'i');
            query.$or = [{ staffName: regex }, { staffEmail: regex }, { empId: regex }];
        }

        const total = await Attendance.countDocuments(query);
        const totalPages = Math.max(1, Math.ceil(total / limit));
        const safePage = Math.min(page, totalPages);
        const rows = await Attendance.find(query)
            .sort({ dateString: -1, date: -1, checkInTime: -1 })
            .skip((safePage - 1) * limit)
            .limit(limit)
            .lean();

        const attendance = rows.map((rec) => {
            const metrics = calculateAttendanceMetrics(rec, new Date());
            return {
                ...rec,
                totalWorkingMsLive: rec.checkOutTime ? Number(rec.totalWorkingMs || 0) : metrics.netWorkingMs,
                totalBreakMsLive: metrics.totalBreakMs
            };
        });

        res.json({
            success: true,
            attendance,
            pagination: {
                page: safePage,
                limit,
                total,
                totalPages
            }
        });
    } catch (e) {
        console.error('Admin attendance log error:', e.message);
        res.status(500).json({ success: false, message: 'Failed to fetch attendance log.' });
    }
});

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
        const { name, email, password, role, joiningDate } = req.body;

        const existingStaff = await Staff.findOne({ email });
        if (existingStaff) return res.status(400).json({ success: false, error: "Email already exists!" });
        if (typeof password !== 'string' || !password.length) {
            return res.status(400).json({ success: false, error: "Password is required!" });
        }

        // 🟢 Naya code: Ek unique EMP ID generate karo (e.g., VS-4821)
        let newEmpId;
        let isUnique = false;
        while (!isUnique) {
            newEmpId = 'VS-' + Math.floor(1000 + Math.random() * 9000);
            const checkId = await Staff.findOne({ empId: newEmpId });
            if (!checkId) isUnique = true; // Agar ID pehle se kisi ke paas nahi hai, toh confirm karo
        }

        const rawEnteredPassword = password;
        const hashedPassword = await bcrypt.hash(rawEnteredPassword, 10);
        const parsedJoiningDate = joiningDate ? new Date(joiningDate) : null;
        const normalizedJoiningDate = parsedJoiningDate && !Number.isNaN(parsedJoiningDate.getTime()) ? parsedJoiningDate : null;
        const qrCodeString = getStaffVerificationUrl(newEmpId, req);

        const newStaff = new Staff({
            empId: newEmpId,
            qrCodeString,
            name,
            email,
            password: hashedPassword,
            role: normalizeStaffRoleInput(role),
            joiningDate: normalizedJoiningDate
        });
        await newStaff.save();

        // 🟢 ONBOARDING EMAIL: Generate PDFs and send welcome email (background — don't block response)
        (async () => {
            const staffName = newStaff.name || 'Team Member';
            const staffRole = newStaff.role || 'Staff';
            const staffEmail = newStaff.email;
            const staffEmpId = newStaff.empId || 'N/A';
            const joinDate = newStaff.joiningDate
                ? new Date(newStaff.joiningDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
                : new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
            const joiningLetterHtml = buildJoiningLetterHtml({
                staffName,
                staffRole,
                staffEmail,
                staffEmpId,
                joinDate
            });
            const roleLetterHtml = buildRoleDescriptionHtml({
                staffName,
                staffRole,
                staffEmpId,
                joinDate
            });
            const welcomeGuideHtml = buildWelcomeGuideHtml({
                staffName,
                staffEmail,
                staffEmpId,
                joinDate
            });

            try {
                const [joiningBuf, roleBuf, welcomeBuf] = await Promise.all([
                    renderHtmlToPdfBuffer(joiningLetterHtml),
                    renderHtmlToPdfBuffer(roleLetterHtml),
                    renderHtmlToPdfBuffer(welcomeGuideHtml)
                ]);

                console.log(`📄 Onboarding PDFs generated for ${staffName} (${staffEmpId}).`);

                const joiningPdfBase64 = Buffer.from(joiningBuf).toString('base64');
                const rolePdfBase64 = Buffer.from(roleBuf).toString('base64');
                const welcomePdfBase64 = Buffer.from(welcomeBuf).toString('base64');
                const safeStaffName = escapeHtml(staffName);
                const safeStaffRole = escapeHtml(staffRole);
                const safeStaffEmail = escapeHtml(staffEmail);
                const safeStaffEmpId = escapeHtml(staffEmpId);
                const safeJoinDate = escapeHtml(joinDate);
                const safeEnteredPassword = escapeHtml(rawEnteredPassword);
                const loginPortal = 'https://vibespheremedia.in/staff-login.html';

                const mailOptions = {
                    from: process.env.EMAIL_USER,
                    fromName: 'VibeSphere Media - HR',
                    to: staffEmail,
                    subject: `Welcome to VibeSphere Media, ${staffName}`,
                    text: `Hello ${staffName},

Welcome to VibeSphere Media. We are excited to have you join as ${staffRole}.

Login ID: ${staffEmail}
Password: ${rawEnteredPassword}
Employee ID: ${staffEmpId}
Login Portal: ${loginPortal}

Your onboarding pack is attached:
- Joining Letter
- Role Description
- Welcome Guide

Joining Date: ${joinDate}

Team VibeSphere
People & Culture`,
                    html: `
                        <div style="font-family:'Lato','Segoe UI',Arial,sans-serif;max-width:640px;margin:0 auto;padding:28px 20px;background:linear-gradient(180deg,#edf4ff 0%,#f8fbff 42%,#ffffff 100%);">
                            <div style="background:#ffffff;border:1px solid #dce7f5;border-radius:28px;overflow:hidden;box-shadow:0 22px 54px rgba(15,23,42,0.10);">
                                <div style="padding:30px 30px 22px;background:linear-gradient(135deg,#16233b 0%,#203759 48%,#4e7bff 100%);color:#ffffff;">
                                    <div style="display:flex;align-items:center;gap:14px;margin-bottom:18px;">
                                        <div style="width:52px;height:52px;border-radius:18px;background:rgba(255,255,255,0.12);display:flex;align-items:center;justify-content:center;font-family:'Montserrat','Segoe UI',Arial,sans-serif;font-size:20px;font-weight:800;">VS</div>
                                        <div>
                                            <div style="font-family:'Montserrat','Segoe UI',Arial,sans-serif;font-size:24px;font-weight:800;letter-spacing:-0.03em;">Welcome to VibeSphere</div>
                                            <div style="margin-top:6px;font-size:13px;color:rgba(255,255,255,0.78);">Your staff account and onboarding documents are ready.</div>
                                        </div>
                                    </div>
                                    <div style="font-size:15px;line-height:1.75;color:rgba(255,255,255,0.92);">
                                        Dear <strong>${safeStaffName}</strong>,<br>
                                        We are pleased to welcome you to <strong>VibeSphere Media</strong> as <strong>${safeStaffRole}</strong>. Your official onboarding pack is attached below for reference.
                                    </div>
                                </div>

                                <div style="padding:28px 30px 30px;">
                                    <div style="background:linear-gradient(135deg,#eff6ff 0%,#f8fafc 100%);border:1px solid #d8e6fb;border-radius:22px;padding:20px 22px;margin-bottom:18px;">
                                        <div style="font-family:'Montserrat','Segoe UI',Arial,sans-serif;font-size:16px;font-weight:800;color:#16233b;margin-bottom:14px;">Your Login Details</div>
                                        <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;">
                                            <div style="background:#ffffff;border:1px solid #dce7f5;border-radius:16px;padding:14px 16px;">
                                                <div style="font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#6d7788;margin-bottom:6px;">Login ID</div>
                                                <div style="font-size:14px;font-weight:700;color:#16233b;word-break:break-word;">${safeStaffEmail}</div>
                                            </div>
                                            <div style="background:#ffffff;border:1px solid #dce7f5;border-radius:16px;padding:14px 16px;">
                                                <div style="font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#6d7788;margin-bottom:6px;">Password</div>
                                                <div style="font-size:15px;font-weight:800;color:#16233b;font-family:'SFMono-Regular','Consolas','Liberation Mono',monospace;">${safeEnteredPassword}</div>
                                            </div>
                                            <div style="background:#ffffff;border:1px solid #dce7f5;border-radius:16px;padding:14px 16px;">
                                                <div style="font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#6d7788;margin-bottom:6px;">Employee ID</div>
                                                <div style="font-size:14px;font-weight:700;color:#16233b;">${safeStaffEmpId}</div>
                                            </div>
                                            <div style="background:#ffffff;border:1px solid #dce7f5;border-radius:16px;padding:14px 16px;">
                                                <div style="font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#6d7788;margin-bottom:6px;">Login Portal</div>
                                                <div style="font-size:14px;font-weight:700;color:#16233b;word-break:break-word;"><a href="${loginPortal}" style="color:#4e7bff;text-decoration:none;">${loginPortal}</a></div>
                                            </div>
                                        </div>
                                    </div>

                                    <div style="background:#ffffff;border:1px solid #dce7f5;border-radius:22px;padding:20px 22px;margin-bottom:18px;">
                                        <div style="font-family:'Montserrat','Segoe UI',Arial,sans-serif;font-size:16px;font-weight:800;color:#16233b;margin-bottom:12px;">Attached Onboarding Pack</div>
                                        <div style="font-size:14px;line-height:1.75;color:#334155;">
                                            Three documents are attached for your onboarding:
                                            <ul style="margin:10px 0 0;padding-left:18px;color:#334155;">
                                                <li><strong>Joining Letter</strong> for your official appointment confirmation</li>
                                                <li><strong>Role Description</strong> for your responsibilities and expectations</li>
                                                <li><strong>Welcome Guide</strong> for a walkthrough of the VibeSphere Staff Dashboard</li>
                                            </ul>
                                        </div>
                                    </div>

                                    <div style="font-size:14px;line-height:1.75;color:#334155;">
                                        Your joining date is <strong>${safeJoinDate}</strong>. If you face any access issue on your first login, please contact the Admin or People &amp; Culture team promptly.
                                    </div>

                                    <div style="margin-top:22px;padding-top:18px;border-top:1px solid #e2e8f0;">
                                        <div style="font-family:'Montserrat','Segoe UI',Arial,sans-serif;font-size:15px;font-weight:800;color:#16233b;">Team VibeSphere</div>
                                        <div style="margin-top:4px;font-size:13px;color:#64748b;">People &amp; Culture | VibeSphere Media</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `,
                    attachments: [
                        { filename: `Joining_Letter_${staffEmpId}.pdf`, content: joiningPdfBase64 },
                        { filename: `Role_Description_${staffEmpId}.pdf`, content: rolePdfBase64 },
                        { filename: `Welcome_Guide_${staffEmpId}.pdf`, content: welcomePdfBase64 }
                    ]
                };

                await transporter.sendMail(mailOptions);
                console.log(`📧 Onboarding email sent to ${staffEmail} with 3 PDF attachments.`);
            } catch (onboardErr) {
                console.error(`❌ Onboarding email failed for ${staffEmail}:`, onboardErr.message);
            }
        })();

        res.json({ success: true, message: `Staff Added! ID is ${newEmpId}` });
    } catch (e) {
        console.error('Add staff error:', e.message);
        res.status(500).json({ success: false, error: "Server error!" });
    }
});

app.patch('/api/admin/staff/:id', checkAuth, async (req, res) => {
    try {
        if (!['Admin', 'SuperAdmin', 'SubAdmin'].includes(req.user?.role)) {
            return res.status(403).json({ success: false, message: 'Admin access required.' });
        }

        const staff = await Staff.findById(req.params.id);
        if (!staff) {
            return res.status(404).json({ success: false, message: 'Staff profile not found.' });
        }

        const nextName = String(req.body.name || '').trim();
        const nextRole = normalizeStaffRoleInput(req.body.role);

        if (!nextName) {
            return res.status(400).json({ success: false, message: 'Staff name is required.' });
        }

        staff.name = nextName;
        staff.role = nextRole;

        if (!staff.joiningDate) {
            const parsedJoiningDate = req.body.joiningDate ? new Date(req.body.joiningDate) : null;
            if (parsedJoiningDate && !Number.isNaN(parsedJoiningDate.getTime())) {
                staff.joiningDate = parsedJoiningDate;
            }
        }

        await staff.save();
        io.emit('staff_list_updated');

        res.json({
            success: true,
            message: 'Staff profile updated successfully.',
            staff: {
                _id: staff._id,
                name: staff.name,
                email: staff.email,
                role: staff.role,
                empId: staff.empId,
                joiningDate: staff.joiningDate,
                profilePhoto: staff.profilePhoto,
                isOnline: staff.isOnline,
                isMuted: staff.isMuted,
                monthlyTarget: staff.monthlyTarget
            }
        });
    } catch (e) {
        console.error('Update staff profile error:', e.message);
        res.status(500).json({ success: false, message: 'Failed to update staff profile.' });
    }
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
        const normalizedAssignedTo = String(assignedTo || '').trim().toLowerCase();

        if (!normalizedAssignedTo) {
            return res.status(400).json({ success: false, error: 'Assigned staff is required.' });
        }

        const staffExists = await Staff.findOne({ email: normalizedAssignedTo }).select('_id').lean();
        if (!staffExists) {
            return res.status(404).json({ success: false, error: 'Assigned staff member not found.' });
        }

        const newTask = new Task({
            clientName,
            contactNumber,
            servicePitch,
            assignedTo: normalizedAssignedTo,
            status: 'pending'
        });
        await newTask.save();

        // 🟢 REAL-TIME: Notify assigned staff and Admin
        io.to(normalizedAssignedTo).emit('lead_assigned', { clientName, servicePitch });
        io.emit('staff_list_updated'); // Refresh Admin's staffView if needed

        // 🧠 AI Lead Scoring (Background - Non-blocking)
        scoreLeadWithAI(newTask._id, newTask);

        res.json({ success: true, message: "Lead Assigned Successfully!" });
    } catch (e) { res.status(500).json({ success: false, error: "Failed to assign lead" }); }
});

app.post('/api/admin/reassign-task', checkAuth, async (req, res) => {
    try {
        const { taskId, assignedTo } = req.body;
        const task = await Task.findById(taskId);

        if (!task) {
            return res.status(404).json({ success: false, message: 'Task not found.' });
        }

        const normalizedAssignedTo = String(assignedTo || '').trim().toLowerCase();
        if (!normalizedAssignedTo) {
            return res.status(400).json({ success: false, message: 'Assigned staff is required.' });
        }

        const staffExists = await Staff.findOne({ email: normalizedAssignedTo }).select('_id').lean();
        if (!staffExists) {
            return res.status(404).json({ success: false, message: 'Assigned staff member not found.' });
        }

        const currentAssignedTo = String(task.assignedTo || '').trim().toLowerCase();
        if (currentAssignedTo && currentAssignedTo === normalizedAssignedTo) {
            return res.json({ success: true, message: 'Task is already assigned to this staff member.' });
        }

        if (currentAssignedTo && currentAssignedTo !== normalizedAssignedTo) {
            const assignedAtMs = new Date(task.dateAssigned).getTime();
            const reassignmentWindowMs = 24 * 60 * 60 * 1000;

            if (Number.isFinite(assignedAtMs) && (Date.now() - assignedAtMs) > reassignmentWindowMs) {
                return res.status(400).json({ success: false, message: 'Cannot reassign after 24 hours' });
            }
        }

        task.assignedTo = normalizedAssignedTo;
        task.dateAssigned = new Date();
        await task.save();

        io.to(normalizedAssignedTo).emit('lead_assigned', {
            clientName: task.clientName,
            servicePitch: task.servicePitch
        });
        io.emit('task_updated', task);
        io.emit('staff_list_updated');

        res.json({ success: true, message: 'Task reassigned successfully.' });
    } catch (e) {
        console.error('Task reassign error:', e.message);
        res.status(500).json({ success: false, message: 'Failed to reassign task.' });
    }
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

app.post('/api/admin/bounty-tasks', checkAuth, async (req, res) => {
    try {
        if (!['Admin', 'SuperAdmin', 'SubAdmin'].includes(req.user?.role)) {
            return res.status(403).json({ success: false, message: 'Admin access required.' });
        }

        const title = String(req.body.title || '').trim();
        const description = String(req.body.description || '').trim();
        const assignedStaffEmail = String(req.body.assignedStaffEmail || '').trim().toLowerCase();
        const bountyAmount = Number(req.body.bountyAmount || 0);

        if (!title || !assignedStaffEmail || bountyAmount <= 0) {
            return res.status(400).json({ success: false, message: 'Title, staff email, and bounty amount are required.' });
        }

        const staff = await Staff.findOne({ email: assignedStaffEmail }).select('name email').lean();
        if (!staff) {
            return res.status(404).json({ success: false, message: 'Assigned staff member not found.' });
        }

        const task = await StaffBountyTask.create({
            title,
            description,
            assignedStaffEmail,
            bountyAmount
        });

        io.to(assignedStaffEmail).emit('bounty_task_assigned', {
            taskId: task._id,
            title: task.title,
            bountyAmount: task.bountyAmount,
            assignedStaffEmail
        });
        io.to('Admin').emit('bounty_task_updated', { action: 'created', taskId: task._id });

        res.json({ success: true, message: 'Task assigned successfully.', task });
    } catch (e) {
        console.error('Create bounty task error:', e.message);
        res.status(500).json({ success: false, message: 'Failed to create bounty task.' });
    }
});

app.get('/api/admin/bounty-tasks', checkAuth, async (req, res) => {
    try {
        if (!['Admin', 'SuperAdmin', 'SubAdmin'].includes(req.user?.role)) {
            return res.status(403).json({ success: false, message: 'Admin access required.' });
        }

        const status = String(req.query.status || '').trim();
        const query = status ? { status } : {};
        const tasks = await StaffBountyTask.find(query).sort({ createdAt: -1, updatedAt: -1 }).lean();
        const enriched = await enrichStaffBountyTasks(tasks);

        res.json({ success: true, tasks: enriched });
    } catch (e) {
        console.error('List bounty tasks error:', e.message);
        res.status(500).json({ success: false, message: 'Failed to fetch bounty tasks.' });
    }
});

app.patch('/api/admin/bounty-tasks/:id', checkAuth, async (req, res) => {
    try {
        if (!['Admin', 'SuperAdmin', 'SubAdmin'].includes(req.user?.role)) {
            return res.status(403).json({ success: false, message: 'Admin access required.' });
        }

        const task = await StaffBountyTask.findById(req.params.id);
        if (!task) {
            return res.status(404).json({ success: false, message: 'Task not found.' });
        }
        if (task.status === 'Approved') {
            return res.status(400).json({ success: false, message: 'Approved tasks cannot be edited.' });
        }

        const previousAssignedEmail = task.assignedStaffEmail;
        const title = String(req.body.title || task.title || '').trim();
        const description = String(req.body.description || '').trim();
        const assignedStaffEmail = String(req.body.assignedStaffEmail || task.assignedStaffEmail || '').trim().toLowerCase();
        const bountyAmount = Number(req.body.bountyAmount ?? task.bountyAmount ?? 0);

        if (!title || !assignedStaffEmail || bountyAmount <= 0) {
            return res.status(400).json({ success: false, message: 'Title, staff email, and bounty amount are required.' });
        }

        const staff = await Staff.findOne({ email: assignedStaffEmail }).select('name email').lean();
        if (!staff) {
            return res.status(404).json({ success: false, message: 'Assigned staff member not found.' });
        }

        task.title = title;
        task.description = description;
        task.assignedStaffEmail = assignedStaffEmail;
        task.bountyAmount = bountyAmount;
        await task.save();

        if (previousAssignedEmail && previousAssignedEmail !== assignedStaffEmail) {
            io.to(previousAssignedEmail).emit('bounty_task_updated', { action: 'reassigned', taskId: task._id });
        }
        io.to(assignedStaffEmail).emit('bounty_task_updated', { action: 'edited', taskId: task._id });
        io.to('Admin').emit('bounty_task_updated', { action: 'edited', taskId: task._id });

        res.json({ success: true, message: 'Task updated successfully.', task });
    } catch (e) {
        console.error('Update bounty task error:', e.message);
        res.status(500).json({ success: false, message: 'Failed to update task.' });
    }
});

app.patch('/api/admin/bounty-tasks/:id/revision', checkAuth, async (req, res) => {
    try {
        if (!['Admin', 'SuperAdmin', 'SubAdmin'].includes(req.user?.role)) {
            return res.status(403).json({ success: false, message: 'Admin access required.' });
        }

        const adminFeedback = String(req.body.adminFeedback || '').trim();
        if (!adminFeedback) {
            return res.status(400).json({ success: false, message: 'Revision feedback is required.' });
        }

        const task = await StaffBountyTask.findById(req.params.id);
        if (!task) {
            return res.status(404).json({ success: false, message: 'Task not found.' });
        }
        if (task.status === 'Approved') {
            return res.status(400).json({ success: false, message: 'Approved tasks cannot be moved back to revision.' });
        }
        if (task.status !== 'Submitted') {
            return res.status(400).json({ success: false, message: 'Only submitted tasks can be sent for revision.' });
        }

        task.status = 'Revision';
        task.adminFeedback = adminFeedback;
        await task.save();

        io.to(task.assignedStaffEmail).emit('bounty_task_updated', { action: 'revision', taskId: task._id });
        io.to('Admin').emit('bounty_task_updated', { action: 'revision', taskId: task._id });

        res.json({ success: true, message: 'Revision requested successfully.' });
    } catch (e) {
        console.error('Request bounty task revision error:', e.message);
        res.status(500).json({ success: false, message: 'Failed to request revision.' });
    }
});

app.patch('/api/admin/bounty-tasks/:id/approve', checkAuth, async (req, res) => {
    try {
        if (!['Admin', 'SuperAdmin', 'SubAdmin'].includes(req.user?.role)) {
            return res.status(403).json({ success: false, message: 'Admin access required.' });
        }

        const task = await StaffBountyTask.findById(req.params.id);
        if (!task) {
            return res.status(404).json({ success: false, message: 'Task not found.' });
        }
        if (task.status === 'Approved') {
            return res.status(400).json({ success: false, message: 'Task is already approved.' });
        }
        if (task.status !== 'Submitted') {
            return res.status(400).json({ success: false, message: 'Only submitted tasks can be approved.' });
        }

        const staff = await Staff.findOne({ email: task.assignedStaffEmail });
        if (!staff) {
            return res.status(404).json({ success: false, message: 'Assigned staff member not found.' });
        }

        task.status = 'Approved';
        task.approvedAt = new Date();
        task.adminFeedback = '';
        await task.save();

        await Staff.updateOne(
            { _id: staff._id },
            { $inc: { pendingPayout: Number(task.bountyAmount || 0), totalEarnings: Number(task.bountyAmount || 0) } }
        );

        io.to(task.assignedStaffEmail).emit('bounty_task_updated', { action: 'approved', taskId: task._id, bountyAmount: task.bountyAmount });
        io.to('Admin').emit('bounty_task_updated', { action: 'approved', taskId: task._id, bountyAmount: task.bountyAmount });

        res.json({ success: true, message: 'Task approved and bounty added to pending payout.' });
    } catch (e) {
        console.error('Approve bounty task error:', e.message);
        res.status(500).json({ success: false, message: 'Failed to approve task.' });
    }
});

app.delete('/api/admin/bounty-tasks/:id', checkAuth, async (req, res) => {
    try {
        if (!['Admin', 'SuperAdmin', 'SubAdmin'].includes(req.user?.role)) {
            return res.status(403).json({ success: false, message: 'Admin access required.' });
        }

        const task = await StaffBountyTask.findByIdAndDelete(req.params.id).lean();
        if (!task) {
            return res.status(404).json({ success: false, message: 'Task not found.' });
        }

        io.to(task.assignedStaffEmail).emit('bounty_task_updated', { action: 'deleted', taskId: task._id });
        io.to('Admin').emit('bounty_task_updated', { action: 'deleted', taskId: task._id });

        res.json({ success: true, message: 'Task deleted successfully.' });
    } catch (e) {
        console.error('Delete bounty task error:', e.message);
        res.status(500).json({ success: false, message: 'Failed to delete task.' });
    }
});

// ==========================================
// 🎧 HELPDESK TICKETING APIs
// ==========================================

// Client creates a ticket
app.post('/api/client/create-ticket', async (req, res) => {
    try {
        const { email, name, subject, issue, orderId, category, subcategory, actionRequired, status, chatActive, isLiveChat, offlineQuery } = req.body;
        if (!subject || !issue) return res.status(400).json({ success: false, message: 'Subject and issue are required' });

        let finalSubject = subject;
        if (typeof finalSubject === 'string' && finalSubject.startsWith('Offline Query')) {
            finalSubject = finalSubject.replace('Offline Query', 'Support Ticket');
        }

        const ticket = new Ticket({
            clientEmail: email,
            clientName: name,
            subject: finalSubject,
            issue,
            orderId: orderId || '',
            category: category === 'Offline Support' ? 'Standard Support' : (category || ''),
            subcategory: subcategory === 'Offline Query' ? 'Standard Query' : (subcategory || ''),
            actionRequired: actionRequired || '',
            status: status || 'Open',
            chatActive: chatActive || false,
            isLiveChat: isLiveChat || false,
            offlineQuery: offlineQuery || false
        });
        await ticket.save();
        io.to('admin_room').emit('new_support_ticket', ticket);
        res.json({ success: true, message: 'Ticket created successfully! 🎫', ticketId: ticket._id });
    } catch (e) { res.status(500).json({ success: false, error: 'Failed to create ticket' }); }
});

// Client verifies their Order ID to fetch details
app.post('/api/client/verify-order', checkAuth, async (req, res) => {
    try {
        const { orderId } = req.body;
        if (!orderId) return res.status(400).json({ success: false, message: 'Order ID is required' });
        const cleanedId = orderId.trim();
        const order = await Order.findOne({
            $or: [
                { orderId: cleanedId },
                { orderId: '#' + cleanedId },
                { orderId: cleanedId.replace('#', '') }
            ],
            email: req.user.email
        });
        if (!order) {
            return res.json({ success: false, message: 'Order not found or does not belong to you.' });
        }
        res.json({
            success: true,
            orderType: order.orderType || 'agency',
            packageName: order.package || 'Custom Project',
            orderId: order.orderId
        });
    } catch (e) {
        res.status(500).json({ success: false, message: 'Server error verifying order.' });
    }
});

// Client checks if any agent is currently online
app.get('/api/client/check-agent-online', async (req, res) => {
    try {
        const onlineStaff = await Staff.findOne({ isOnline: true });
        res.json({ success: true, online: !!onlineStaff });
    } catch (e) {
        res.status(500).json({ success: false, online: false });
    }
});

// Admin/Staff views all refill tickets
app.get('/api/admin/refills', checkAuth, async (req, res) => {
    try {
        const tickets = await Ticket.find({ actionRequired: 'Refill' }).sort({ date: -1 });
        res.json({ success: true, tickets });
    } catch (e) { res.status(500).json({ success: false }); }
});

// Admin/Staff initiates a refill request
app.post('/api/admin/start-refill', checkAuth, async (req, res) => {
    try {
        const { ticketId } = req.body;
        const ticket = await Ticket.findById(ticketId);
        if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });
        const startMsg = '🚀 Your refill request has been initiated and is currently in progress.';
        ticket.status = 'Pending';
        ticket.replies.push({ sender: 'System/Admin', message: startMsg, text: startMsg, createdAt: new Date() });
        await ticket.save();
        // Broadcast the initiate message live into the ticket's socket room
        io.to(`support_ticket_${ticketId}`).emit('support_receive_msg', {
            sender: 'System/Admin',
            text: startMsg,
            ticketId: String(ticketId),
            createdAt: new Date()
        });
        if (ticket.isLiveChat) {
            io.to(`support_ticket_${ticketId}`).emit('support_chat_terminated', { ticketId, userType: 'Admin', status: 'Pending' });
        }
        res.json({ success: true, message: 'Refill started!' });
    } catch (e) {
        res.status(500).json({ success: false, message: 'Failed to start refill' });
    }
});

// Admin/Staff processes a refill request in one click
app.post('/api/admin/process-refill', checkAuth, async (req, res) => {
    try {
        const { ticketId } = req.body;
        const ticket = await Ticket.findById(ticketId);
        if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });
        const successMsg = '✅ Your refill request has been successfully processed and completed!';
        ticket.actionRequired = 'Completed';
        ticket.status = 'Resolved';
        ticket.chatActive = false;
        ticket.replies.push({ sender: 'System/Admin', message: successMsg, text: successMsg, createdAt: new Date() });
        await ticket.save();
        // Broadcast the success message live into the ticket's socket room
        io.to(`support_ticket_${ticketId}`).emit('support_receive_msg', {
            sender: 'System/Admin',
            text: successMsg,
            ticketId: String(ticketId),
            createdAt: new Date()
        });
        // Signal the user frontend to lock the input (session resolved) only if it's a live chat
        if (ticket.isLiveChat) {
            io.to(`support_ticket_${ticketId}`).emit('support_chat_closed', { resolved: true });
        }
        res.json({ success: true, message: 'Refill processed!' });
    } catch (e) {
        res.status(500).json({ success: false, message: 'Failed to process refill' });
    }
});

// Client views own tickets
app.post('/api/client/my-tickets', checkAuth, async (req, res) => {
    try {
        const tickets = await Ticket.find({ clientEmail: req.user.email }).sort({ date: -1 });
        res.json({ success: true, tickets });
    } catch (e) { res.status(500).json({ success: false }); }
});

// Client reopens a closed ticket
app.post('/api/client/reopen-ticket', checkAuth, async (req, res) => {
    try {
        const { ticketId } = req.body;
        if (!ticketId) return res.status(400).json({ success: false, message: 'Ticket ID is required.' });
        const ticket = await Ticket.findOne({ _id: ticketId, clientEmail: req.user.email });
        if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found or access denied.' });
        if (ticket.status !== 'Closed' && ticket.status !== 'Resolved') return res.json({ success: false, message: 'Only closed or resolved tickets can be reopened.' });
        ticket.status = 'Pending';
        ticket.chatActive = true;
        ticket.replies.push({
            sender: 'System',
            message: 'User reopened this ticket.',
            text: 'User reopened this ticket.',
            createdAt: new Date()
        });
        await ticket.save();
        res.json({ success: true, ticket });
    } catch (e) {
        console.error('Reopen ticket error:', e.message);
        res.status(500).json({ success: false, message: 'Failed to reopen ticket.' });
    }
});

// Admin/Staff views all tickets
app.get('/api/admin/tickets', checkAuth, async (req, res) => {
    try {
        const { search } = req.query;
        let query = {};
        if (search && search.trim() !== '') {
            const regex = new RegExp(search.trim(), 'i');
            query = {
                $or: [
                    { ticketNumber: regex },
                    { orderId: regex },
                    { clientName: regex },
                    { clientEmail: regex }
                ]
            };
        }
        const tickets = await Ticket.find(query).sort({ date: -1 });
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
        if (status) {
            ticket.status = status;
            if (status === 'Resolved' || status === 'Closed') {
                ticket.chatActive = false;
                if (ticket.actionRequired === 'Refill') {
                    ticket.actionRequired = 'Completed';
                }
            }
        }
        if (reply) ticket.replies.push({ sender: sender || 'Admin', message: reply });
        await ticket.save();
        res.json({ success: true, message: 'Ticket updated! ✅' });
    } catch (e) { res.status(500).json({ success: false, error: 'Failed to update ticket' }); }
});

// Admin resolves a ticket
app.post('/api/admin/resolve-ticket', checkAuth, async (req, res) => {
    try {
        const { ticketId } = req.body;
        const ticket = await Ticket.findById(ticketId);
        if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found.' });

        ticket.status = 'Resolved';
        ticket.chatActive = false;
        if (ticket.actionRequired === 'Refill') {
            ticket.actionRequired = 'Completed';
        }
        if (ticket.isLiveChat) {
            const msg = 'Support Executive marked this ticket as Resolved.';
            ticket.replies.push({
                sender: 'System',
                text: msg,
                message: msg,
                createdAt: new Date(),
                date: new Date()
            });
        }
        await ticket.save();

        if (ticket.isLiveChat) {
            // Broadcast to dynamic client rooms that session terminated & resolved
            io.to(`support_ticket_${ticketId}`).emit('support_chat_terminated', { ticketId, userType: 'Admin', status: 'Resolved' });
            io.to(`support_ticket_${ticketId}`).emit('support_chat_closed');
        }

        res.json({ success: true, message: 'Ticket marked as Resolved successfully! ✅' });
    } catch (e) {
        res.status(500).json({ success: false, error: 'Failed to resolve ticket.' });
    }
});

// Staff mobile inbox: view all customer tickets
app.get('/api/staff/customer-support/tickets', checkStaffSession, async (req, res) => {
    try {
        const tickets = await Ticket.find().sort({ date: -1 });
        res.json({ success: true, tickets });
    } catch (e) {
        res.status(500).json({ success: false, message: 'Failed to fetch customer tickets.' });
    }
});

// Staff mobile inbox: reply to customer tickets or resolve them
app.post('/api/staff/customer-support/reply', checkStaffSession, async (req, res) => {
    try {
        const { ticketId, reply, status } = req.body;
        const ticket = await Ticket.findById(ticketId);

        if (!ticket) {
            return res.status(404).json({ success: false, message: 'Ticket not found' });
        }

        if (status) {
            ticket.status = status;
        }

        if (reply) {
            ticket.replies.push({
                sender: req.staff?.name || 'Staff',
                message: String(reply).trim()
            });
        }

        await ticket.save();

        res.json({
            success: true,
            message: 'Customer ticket updated successfully.',
            ticket
        });
    } catch (e) {
        res.status(500).json({ success: false, message: 'Failed to update customer ticket.' });
    }
});

// ==========================================
// 🏢 STAFF INTERNAL HELPDESK APIs
// ==========================================

// Staff creates an internal ticket (HR / IT / Accounts / General)
app.post('/api/staff-helpdesk/create', checkStaffSession, async (req, res) => {
    try {
        const { category, subject, issue, priority } = req.body;
        if (!subject || !issue) {
            return res.status(400).json({ success: false, message: 'Subject and issue are required.' });
        }
        const staffEmail = req.staff?.email || req.body.email;
        const staffName = req.staff?.name || req.body.name || 'Staff';
        if (!staffEmail) {
            return res.status(400).json({ success: false, message: 'Staff email is required.' });
        }
        const ticket = new StaffTicket({
            staffEmail,
            staffName,
            category: category || 'General',
            subject: subject.trim(),
            issue: issue.trim(),
            priority: priority || 'Normal'
        });
        await ticket.save();
        res.json({ success: true, message: 'Internal ticket created successfully! 🎫' });
    } catch (e) {
        console.error('Staff helpdesk create error:', e.message);
        res.status(500).json({ success: false, message: 'Failed to create internal ticket.' });
    }
});

// Staff fetches their own internal tickets
app.get('/api/staff-helpdesk/my-tickets', checkStaffSession, async (req, res) => {
    try {
        const email = req.query.email || req.staff?.email;
        if (!email) {
            return res.status(400).json({ success: false, message: 'Email is required.' });
        }
        const tickets = await StaffTicket.find({ staffEmail: email }).sort({ date: -1 });
        res.json({ success: true, tickets });
    } catch (e) {
        console.error('Staff helpdesk fetch error:', e.message);
        res.status(500).json({ success: false, message: 'Failed to fetch internal tickets.' });
    }
});

// Admin views all staff internal tickets
app.get('/api/admin/staff-tickets', checkAuth, async (req, res) => {
    try {
        const tickets = await StaffTicket.find().sort({ date: -1 });
        res.json({ success: true, tickets });
    } catch (e) {
        console.error('Admin staff tickets fetch error:', e.message);
        res.status(500).json({ success: false, message: 'Failed to fetch staff tickets.' });
    }
});

// Admin replies to or updates status of a staff internal ticket
app.post('/api/admin/update-staff-ticket', checkAuth, async (req, res) => {
    try {
        const { ticketId, status, reply, sender } = req.body;
        const ticket = await StaffTicket.findById(ticketId);
        if (!ticket) {
            return res.status(404).json({ success: false, message: 'Staff ticket not found.' });
        }
        if (status) ticket.status = status;
        if (reply) {
            ticket.replies.push({
                sender: sender || 'Admin',
                message: String(reply).trim()
            });
        }
        await ticket.save();
        res.json({ success: true, message: 'Staff ticket updated! ✅', ticket });
    } catch (e) {
        console.error('Admin staff ticket update error:', e.message);
        res.status(500).json({ success: false, message: 'Failed to update staff ticket.' });
    }
});

// ==========================================
// 💰 EXPENSE TRACKER APIs (Admin Only)
// ==========================================

app.post('/api/admin/add-expense', checkAuth, async (req, res) => {
    try {
        const { title, amount, category } = req.body;
        if (!title || !amount) return res.status(400).json({ success: false, message: 'Title and amount required' });
        const expense = new Expense({
            title,
            amount: Number(amount),
            category: category || 'General',
            transactionType: 'EXPENSE'
        });
        await expense.save();
        const financeTransaction = await FinancialTransaction.create({
            title,
            amount: Number(amount),
            type: 'EXPENSE',
            kind: 'debit',
            category: category || 'General',
            source: 'MANUAL_EXPENSE',
            meta: category || 'General',
            notes: `Manual expense entry for ${title}`,
            expenseId: expense._id,
            date: expense.date
        });
        expense.financeTransactionId = financeTransaction._id;
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
        const expense = await Expense.findById(req.params.id);
        if (expense?.financeTransactionId) {
            await FinancialTransaction.findByIdAndDelete(expense.financeTransactionId);
        }
        await FinancialTransaction.deleteMany({ expenseId: req.params.id, type: 'EXPENSE' });
        await Expense.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Expense deleted! 🗑️' });
    } catch (e) { res.status(500).json({ success: false, error: 'Failed to delete expense' }); }
});

app.get('/api/admin/finance-summary', checkAuth, async (req, res) => {
    try {
        const payload = await buildFinanceDashboardPayload({ year: req.query.year, month: req.query.month });

        res.json({
            success: true,
            totalRevenue: payload.summary.totalRevenue,
            totalExpenses: payload.summary.totalExpenses,
            totalSalaryPaid: payload.summary.totalSalaryPaid,
            pendingSalary: payload.summary.pendingSalary,
            netProfit: payload.summary.netProfit
        });
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
            resourceContent = await uploadToCloudinary(req.file.buffer, req.file.originalname, req.file.mimetype);
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

// 5. Get Client Wallet details & transaction history
app.get('/api/admin/clients/:id/wallet', checkAuth, async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('walletBalance walletId walletStatus name email');
        if (!user) return res.status(404).json({ success: false, error: "User not found!" });

        const transactions = await Transaction.find({ userId: req.params.id }).sort({ createdAt: -1 });

        res.json({
            success: true,
            wallet: {
                walletBalance: user.walletBalance || 0,
                walletId: user.walletId || null,
                walletStatus: user.walletStatus || 'Active',
                name: user.name,
                email: user.email
            },
            transactions
        });
    } catch (e) {
        console.error("❌ Get Wallet Error:", e);
        res.status(500).json({ success: false, error: e.message });
    }
});

// 6. Manual Balance Adjustment
app.post('/api/admin/clients/:id/wallet/adjust', checkAuth, async (req, res) => {
    try {
        const { amount, type, description, allowNegative } = req.body;
        const adjustAmount = Number(amount);

        if (isNaN(adjustAmount) || adjustAmount <= 0) {
            return res.status(400).json({ success: false, error: "Invalid amount. Must be a positive number." });
        }

        if (type !== 'Credit' && type !== 'Debit') {
            return res.status(400).json({ success: false, error: "Invalid transaction type. Must be 'Credit' or 'Debit'." });
        }

        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ success: false, error: "User not found!" });

        if (type === 'Credit') {
            user.walletBalance = (user.walletBalance || 0) + adjustAmount;
        } else if (type === 'Debit') {
            if (!allowNegative && (user.walletBalance || 0) - adjustAmount < 0) {
                return res.status(400).json({ success: false, error: "Insufficient wallet balance." });
            }
            user.walletBalance = (user.walletBalance || 0) - adjustAmount;
        }

        // Create and save Transaction
        const txn = new Transaction({
            userId: user._id,
            type,
            amount: adjustAmount,
            description: description || `Manual ${type} adjustment`,
            status: 'Success'
        });
        await txn.save();

        await user.save();

        res.json({
            success: true,
            message: "Wallet balance adjusted successfully.",
            walletBalance: user.walletBalance,
            transaction: txn
        });
    } catch (e) {
        console.error("❌ Wallet Adjustment Error:", e);
        res.status(500).json({ success: false, error: e.message });
    }
});

// 7. Update Wallet Status
app.patch('/api/admin/clients/:id/wallet/status', checkAuth, async (req, res) => {
    try {
        const { walletStatus } = req.body;

        if (!['Active', 'Frozen', 'Hold'].includes(walletStatus)) {
            return res.status(400).json({ success: false, error: "Invalid wallet status. Must be 'Active', 'Frozen', or 'Hold'." });
        }

        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ success: false, error: "User not found!" });

        user.walletStatus = walletStatus;
        await user.save();

        res.json({
            success: true,
            message: `Wallet status updated to ${walletStatus} successfully.`,
            walletStatus: user.walletStatus
        });
    } catch (e) {
        console.error("❌ Update Wallet Status Error:", e);
        res.status(500).json({ success: false, error: e.message });
    }
});

// 8. Update Client Profile Details
app.patch('/api/admin/clients/:id', checkAuth, async (req, res) => {
    try {
        const { name, email, phone } = req.body;
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ success: false, error: "User not found!" });

        if (email && email.toLowerCase().trim() !== user.email.toLowerCase().trim()) {
            const existing = await User.findOne({ email: email.toLowerCase().trim() });
            if (existing) {
                return res.status(400).json({ success: false, error: "Email is already taken by another user." });
            }
            user.email = email.toLowerCase().trim();
        }

        if (name) user.name = name.trim();
        if (phone !== undefined) user.phone = phone.trim();

        await user.save();

        res.json({
            success: true,
            message: "Client profile updated successfully.",
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone
            }
        });
    } catch (e) {
        console.error("❌ Update Client Error:", e);
        res.status(500).json({ success: false, error: e.message });
    }
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

// ==========================================
// ⏱️ AUTOMATED SMM DRIP FEED WORKER
// ==========================================
function startDripFeedWorker() {
    console.log("⏱️ Drip Feed worker initialized. Checking for scheduled runs every 2 minutes.");

    const checkAndProcess = async () => {
        try {
            const now = new Date();
            // Find active SMM orders with remaining runs and due run times
            const orders = await Order.find({
                orderType: 'smm',
                isDripFeed: true,
                remainingRuns: { $gt: 0 },
                nextRunAt: { $lte: now }
            });

            if (orders.length > 0) {
                console.log(`⏱️ Drip Feed Worker: Found ${orders.length} orders to process.`);

                for (const order of orders) {
                    try {
                        // Simulate or trigger delivery action for this run
                        order.remainingRuns -= 1;

                        console.log(`⚡ Drip Feed Run: Processing sub-run for order ${order.orderId}. Quantity: ${order.quantityPerRun}. Runs left: ${order.remainingRuns}`);

                        if (order.remainingRuns > 0) {
                            // Schedule next run
                            const intervalMs = order.interval * 60 * 1000;
                            order.nextRunAt = new Date(Date.now() + intervalMs);
                            order.workStatus = 'In Progress';
                            order.status = 'In Progress';
                            console.log(`📅 Order ${order.orderId} rescheduled next run for: ${order.nextRunAt}`);
                        } else {
                            // Completed all runs
                            order.nextRunAt = null;
                            order.workStatus = 'Completed';
                            order.status = 'Completed';
                            console.log(`🏁 Order ${order.orderId} has completed all drip feed runs!`);
                        }

                        await order.save();
                    } catch (orderErr) {
                        console.error(`❌ Drip Feed Worker: Error processing order ${order.orderId}:`, orderErr);
                    }
                }
            }
        } catch (err) {
            console.error("❌ Drip Feed Worker Error:", err);
        }
    };

    // Run once immediately on connection
    checkAndProcess();

    // Then run every 2 minutes
    setInterval(checkAndProcess, 2 * 60 * 1000);
}

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
