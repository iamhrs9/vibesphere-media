require('dotenv').config(); 
const express = require('express');
const path = require('path');
const cors = require('cors');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const mongoose = require('mongoose');
const { OAuth2Client } = require('google-auth-library');
const GOOGLE_CLIENT_ID = "877277700036-mk598mhkp55jdqmtcdi3k8tks1dhi045.apps.googleusercontent.com"; // ⚠️ Isse baad mein replace karna padega
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);


const app = express();
const PORT = process.env.PORT || 3000;

// --- 1. Variables ---
let localOrders = [];
let CURRENT_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123"; 

app.use(cors());

// ✅ 10MB Limit for Photos
app.use(express.json({ limit: '10mb' })); 
app.use(express.urlencoded({ limit: '10mb', extended: true }));

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
    picture: String, // 👈 Photo ke liye naya field
    googleId: String, // 👈 Google ID store karne ke liye
    date: { type: Date, default: Date.now }
});
const User = mongoose.model('User', userSchema);


// --- 🔐 CLIENT AUTH & DASHBOARD APIs ---

// 1. Client Signup
app.post('/api/auth/signup', async (req, res) => {
    try {
        const { name, email, password, phone } = req.body;
        const existingUser = await User.findOne({ email });
        if (existingUser) return res.json({ success: false, message: "Email already exists!" });

        const newUser = new User({ name, email, password, phone });
        await newUser.save();
        res.json({ success: true, message: "Account Created! Please Login." });
    } catch (e) { res.status(500).json({ success: false, error: "Signup Failed" }); }
});

// 2. Client Login
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email, password });
        
        if (user) {
            res.json({ success: true, user: { name: user.name, email: user.email }, token: "CLIENT_LOGGED_IN" });
        } else {
            res.json({ success: false, message: "Invalid Email or Password" });
        }
    } catch (e) { res.status(500).json({ success: false, error: "Login Error" }); }
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
    status: { type: String, default: 'Pending' }
});
const Order = mongoose.model('Order', orderSchema);
// --- Blog Schema ---
// --- Blog Schema (UPDATED) ---
// --- Blog Schema (UPDATED FOR MULTI-TITLE) ---
const blogSchema = new mongoose.Schema({
    slug: String,
    image: String,
    date: { type: Date, default: Date.now },
    
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
    dateAssigned: { type: Date, default: Date.now }
});
const Task = mongoose.model('Task', taskSchema);

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
        const staff = await Staff.findOne({ email, password });
        if (staff) {
            // 🟢 Naya code: empId bhi frontend ko bhejo
            res.json({ success: true, staff: { empId: staff.empId, name: staff.name, email: staff.email, role: staff.role, profilePhoto: staff.profilePhoto } });
        } else {
            res.json({ success: false, message: "Invalid Staff ID or Password" });
        }
    } catch (e) { res.status(500).json({ success: false, error: "Login Error" }); }
});
// API 2: Get Staff Tasks (Dashbaord Load Hote Hi Chalegi)
app.post('/api/staff/tasks', async (req, res) => {
    try {
        const { email } = req.body; // Kis staff ne login kiya hai
        const tasks = await Task.find({ assignedTo: email }).sort({ dateAssigned: -1 });
        res.json({ success: true, tasks: tasks });
    } catch (e) { res.status(500).json({ success: false, error: "Fetch Error" }); }
});

// API 3: Update Task (Jab Staff 'Save' button dabayega)
app.post('/api/staff/update-task', async (req, res) => {
    try {
        const { taskId, status, notes } = req.body;
        await Task.findByIdAndUpdate(taskId, { status: status, notes: notes });
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
// API 5: Change Password
app.post('/api/staff/update-password', async (req, res) => {
    try {
        const { email, currentPassword, newPassword } = req.body;
        const staff = await Staff.findOne({ email: email, password: currentPassword });
        
        if (staff) {
            staff.password = newPassword;
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
    const userMessage = req.body.message;
    const API_KEY = process.env.GEMINI_API_KEY; 

    if (!API_KEY) return res.json({ reply: "API Key Missing" });

   
      const systemPrompt = `
INSTRUCTIONS: You are 'VibeSphere AI', the lead strategy consultant for VibeSphere Media.

--- YOUR IDENTITY ---
• Created by: VibeSphere Media Tech Team.
• Founder (VibeSphere Media) & Payments Head: Mr. Mukesh Prajapat.
• CEO & Head of Tech Department: Mr. Harsh Panwar.
• Establishment: 2022.
• Headquarters: Jaipur, Rajasthan, India.
• Mission: Helping businesses grow through digital excellence.

--- YOUR GOAL ---
Build Trust, Solve Queries, and Aggressively Sell Growth Packages (Instagram & Web).
Your aim is not just to answer, but to **CLOSE THE DEAL** using psychological persuasion.

--- 🚨 CRITICAL RULES (NON-NEGOTIABLE) ---
1. NO INFO DUMPS: Keep messages short (1-3 sentences).
2. STEP-BY-STEP: Ask only ONE question at a time.
3. IDENTIFY INTENT FIRST:
   - "Reach badhani hai" → Ask: "Kis type ka page hai? (Personal/Business?)"
   - "Website banwani hai" → Ask: "Kis cheez ka business hai aapka?"
   - "Mera business nahi chal raha" → First Pitch MARKETING, then upsell WEBSITE.

--- 🗣️ LANGUAGE PROTOCOL ---
• Default: ENGLISH.
• Auto-Adapt: Hindi → Hindi | Hinglish → Hinglish | English → English.

--- 📦 PACKAGES & PRICING (INSTAGRAM GROWTH) ---
1. 🥈 SILVER - ₹399 (1k Followers | Beginner)
2. 🥇 GOLD - ₹669 (2k Followers | Small Boost)
3. 💎 PLATINUM (🔥 Hot Seller) - ₹1199 (5k Followers | 3 Posts | Serious Growth)
4. 🚀 INFLUENCER - ₹1889 (7k Followers | Face of Week)
5. 🏢 BUSINESS - ₹2699 (13k Followers | Full Branding)
6. 👑 SPECIAL - ₹4690/Month (26k Followers | Full Management)

--- 💻 PACKAGES & PRICING (WEB DEVELOPMENT) ---
1. 🌐 PORTFOLIO / LANDING - ₹4,999 ($199)
   - 1-5 Pages | Mobile Ready | Free Hosting (1 Yr).
   - Pitch: "Apna Digital Visiting Card banwayein."
2. 💼 BUSINESS / CORPORATE (🔥 Best Value) - ₹14,999 ($499)
   - 8-12 Pages | SEO Setup | Admin Panel | Pro Email.
   - Pitch: "Google par rank karein aur trust jeetein."
3. 🛒 E-COMMERCE STORE - ₹24,999 ($899)
   - Online Store | Payment Gateway | 50 Products.
   - Pitch: "Dukaan band hone ke baad bhi maal bechein (24/7 Sales)."

--- 🧠 PSYCHOLOGICAL SALES TACTICS (BE PERSUASIVE) ---
1. **The Fear of Loss (FOMO):**
   - Instead of "Buy a website", say: "Sir, bina website ke aap 50% customers loose kar rahe hain jo Google par search kar rahe hain."
   - "Competitors aage nikal jayenge agar aapne online branding nahi ki."

2. **Authority & Trust:**
   - "Humari agency Jaipur based hai, 1200+ clients hain. Local freelancer bhag jayega, hum yahi hain."

3. **Urgency (Artificial Scarcity):**
   - "Sir, Web Dev team ke paas sirf 2 slots bache hain iss week ke liye. Aaj lock karenge toh free Domain mil jayega."
   - "Price hike hone wala hai 1st se, abhi purane rate pe lock kar lijiye."

4. **The "Investment" Frame:**
   - If user says "Mehenga hai", reply: "Sir, ye kharcha nahi, Investment hai. Ek client bhi website se aaya toh pura paisa wapas!"

--- 📜 COMPANY POLICIES ---
• Refund (Before Work): 100% Refund if cancelled within 24 Hours.
• Refund (After Work): NO Refunds once work starts.
• Process: Email help@vibespheremedia.in.

--- 🧪 SCENARIO SCRIPTS ---
• Scenario: "Is this fake/scam?"
  Reply: "Sir, VibeSphere Media ek Registered Indian Agency hai. Razorpay secure gateway use karte hain. Scammers ₹100-200 mangte hain, hum brand banate hain. ✅"

• Scenario: "Who is owner?"
  Reply: "VibeSphere Media is founded by Mr. Harsh Panwar (Tech Head) & Mr. Mukesh Prajapat. We are a team, not individuals."

• Scenario: "Web Dev expensive hai"
  Reply: "Sir, Market mein yahi kaam ₹25,000+ ka hai. Hum ₹14,999 mein 'Business Package' de rahe hain with SEO. Quality chahiye toh thoda invest karna padega. 🚀"

--- 🛒 CLOSING THE DEAL ---
Always end with a Call to Action (CTA):
- "Kaunsa package final karein? Silver ya Gold? 😉"
- "Link bhejun payment ka?"
- "Start karein aaj se hi?"

    `;

    try {
        let contents = JSON.parse(JSON.stringify(userHistory));

        if (contents.length === 0 && userMessage) {
            contents = [{ 
                role: "user", 
                parts: [{ text: `${systemPrompt}\n\nUser Question: ${userMessage}` }] 
            }];
        } else if (contents.length > 0 && contents[0].role === 'user') {
             if (!contents[0].parts[0].text.includes("INSTRUCTIONS:")) {
                contents[0].parts[0].text = `${systemPrompt}\n\n${contents[0].parts[0].text}`;
             }
        }

        // ✅ Updated to Gemini 1.5 Flash (Faster & More Stable)
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: contents })
        });

        const data = await response.json();
        const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text || "System busy.";
        res.json({ reply: replyText });

    } catch (error) {
        res.status(500).json({ reply: "Server busy. Try later." });
    }
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
        localOrders.push(newOrder);
        try { if (mongoose.connection.readyState === 1) await newOrder.save(); } catch (e) {}
        res.json({ success: true });
    } else {
        res.json({ success: false });
    }
});

// Admin Auth
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
        let orders = await Order.find().sort({ _id: -1 });
        if (orders.length === 0) orders = [...localOrders].reverse();
        res.json(orders);
    } catch (err) { res.status(500).json({ error: "Fetch Failed" }); }
});

app.post('/api/admin/update-status', checkAuth, async (req, res) => {
    const { id, status } = req.body;
    try {
        await Order.findOneAndUpdate({ orderId: id }, { status: status });
        const localOrder = localOrders.find(o => o.orderId === id);
        if (localOrder) localOrder.status = status;
        res.json({ success: true });
    } catch (error) { res.status(500).json({ success: false }); }
});

// --- BLOG API ROUTES ---

// 1. Save New Blog (Admin Only)
app.post('/api/add-blog', async (req, res) => {
    try {
        const { title, image, content, slug } = req.body;
        const newBlog = new Blog({ title, image, content, slug });
        await newBlog.save();
        res.json({ success: true, message: "Blog Posted Successfully!" });
    } catch (error) {
        res.status(500).json({ success: false, error: "Error saving blog" });
    }
});

// 2. Get All Blogs (For Blog Page)
app.get('/api/blogs', async (req, res) => {
    const blogs = await Blog.find().sort({ date: -1 }); // Newest first
    res.json(blogs);
});

// 3. Get Single Blog (For Reading)
app.get('/api/blog/:slug', async (req, res) => {
    const blog = await Blog.findOne({ slug: req.params.slug });
    if (blog) {
        res.json(blog);
    } else {
        res.status(404).json({ error: "Blog not found" });
    }
});

// 4. Serve Single Blog Page (Frontend)
app.get('/blog/:slug', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'read-blog.html'));
});
// Delete Review API
app.delete('/api/admin/delete-review/:id', checkAuth, async (req, res) => {
    try {
        await Review.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: "Review Deleted Successfully!" });
    } catch (err) {
        res.status(500).json({ success: false, error: "Failed to delete review" });
    }
});
// --- BLOG MANAGEMENT APIS (NEW) ---

// 1. Delete Blog
app.delete('/api/delete-blog/:id', async (req, res) => {
    try {
        await Blog.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: "Blog Deleted!" });
    } catch (error) {
        res.status(500).json({ success: false, error: "Delete failed" });
    }
});

// 2. Edit (Update) Blog
app.put('/api/edit-blog/:id', async (req, res) => {
    try {
        // req.body mein naya data aayega (title, content etc.)
        await Blog.findByIdAndUpdate(req.params.id, req.body);
        res.json({ success: true, message: "Blog Updated Successfully!" });
    } catch (error) {
        res.status(500).json({ success: false, error: "Update failed" });
    }
});
// 4. Google Login API (NEW)
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

        // Login Success
        res.json({ success: true, user: { name: user.name, email: user.email, picture: user.picture } });

    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, error: "Google Auth Failed" });
    }
});// ==========================================
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
        if(existingStaff) return res.status(400).json({ success: false, error: "Email already exists!" });

        // 🟢 Naya code: Ek unique EMP ID generate karo (e.g., VS-4821)
        let newEmpId;
        let isUnique = false;
        while(!isUnique) {
            newEmpId = 'VS-' + Math.floor(1000 + Math.random() * 9000);
            const checkId = await Staff.findOne({ empId: newEmpId });
            if(!checkId) isUnique = true; // Agar ID pehle se kisi ke paas nahi hai, toh confirm karo
        }

        const newStaff = new Staff({ empId: newEmpId, name, email, password, role });
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

// 4. Get Staff Performance (Work Chart) - UPDATED FOR FULL DETAILS
app.get('/api/admin/staff-performance', checkAuth, async (req, res) => {
    try {
        const tasks = await Task.find().sort({ dateAssigned: -1 });
        const performance = {};
        
        tasks.forEach(task => {
            const email = task.assignedTo;
            if(!email) return;

            if(!performance[email]) {
                // 'details' naam ka array add kiya hai jisme saari leads hongi
                performance[email] = { total: 0, completed: 0, pending: 0, details: [] }; 
            }
            performance[email].total++;
            
            if(task.status === 'interested' || task.status === 'rejected') {
                performance[email].completed++;
            } else {
                performance[email].pending++;
            }

            // Lead ka poora data (aur staff ka review/notes) array mein save karo
            performance[email].details.push(task); 
        });
        res.json({ success: true, performance: performance });
    } catch (e) { res.status(500).json({ error: "Failed to fetch performance" }); }
});
// 5. Assign New Lead (Task)
app.post('/api/admin/add-task', checkAuth, async (req, res) => {
    try {
        const { clientName, contactNumber, servicePitch, assignedTo } = req.body;
        
        // Naya task banakar database mein save karo
        const newTask = new Task({ 
            clientName, 
            contactNumber, 
            servicePitch, 
            assignedTo,
            status: 'pending' // Naya kaam hamesha pending rahega
        });
        await newTask.save();
        res.json({ success: true, message: "Lead Assigned Successfully!" });
    } catch (e) { res.status(500).json({ success: false, error: "Failed to assign lead" }); }
});

// 6. Post a Notice (Notification)
app.post('/api/admin/add-notice', checkAuth, async (req, res) => {
    try {
        const { title, message } = req.body;
        
        const newNotice = new Notice({ title, message, author: "Admin" });
        await newNotice.save();
        res.json({ success: true, message: "Notice Posted on Staff Board!" });
    } catch (e) { res.status(500).json({ success: false, error: "Failed to post notice" }); }
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
        res.json({ success: true, message: "Notice Deleted Successfully!" });
    } catch (e) { res.status(500).json({ success: false, error: "Failed to delete notice" }); }
});

// 2. Get All Jobs (Public & Admin ke liye)
app.get('/api/jobs', async (req, res) => {
    try {
        const jobs = await Job.find().sort({ date: -1 });
        res.json({ success: true, jobs });
    } catch(e) { res.status(500).json({ error: "Failed to fetch jobs" }); }
});

// 3. Post a New Job (Sirf Admin ke liye)
app.post('/api/admin/add-job', checkAuth, async (req, res) => {
    try {
        const { title, type, location, description } = req.body;
        const newJob = new Job({ title, type, location, description });
        await newJob.save();
        res.json({ success: true, message: "Job Posted Successfully 🚀" });
    } catch(e) { res.status(500).json({ success: false, error: "Failed to post job" }); }
});

// 4. Delete a Job (Sirf Admin ke liye)
app.delete('/api/admin/delete-job/:id', checkAuth, async (req, res) => {
    try {
        await Job.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: "Job Deleted!" });
    } catch(e) { res.status(500).json({ success: false, error: "Failed to delete job" }); }
});
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

app.listen(PORT, () => {
    console.log(`🚀 Server Running on http://localhost:${PORT}`);
});
