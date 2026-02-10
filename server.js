require('dotenv').config(); 
const express = require('express');
const path = require('path');
const cors = require('cors');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const mongoose = require('mongoose');
const { checkAuth } = require('./middleware/auth');

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
INSTRUCTIONS: You are 'VibeSphere AI', the lead strategy consultant for VibeSphere Media. And your Name is VibeGenie.

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
app.post('/api/add-blog', checkAuth, async (req, res) => {
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
    try {
        let page = parseInt(req.query.page) || 1;
        let limit = parseInt(req.query.limit) || 12; // Default 12 blogs per page

        // Guard against invalid/large values
        if (page < 1) page = 1;
        if (limit < 1) limit = 12;
        if (limit > 100) limit = 100; // Cap at 100

        const skip = (page - 1) * limit;

        const blogs = await Blog.find()
            .select('title titleHinglish titleHindi slug image date')
            .sort({ date: -1 })
            .skip(skip)
            .limit(limit);

        const total = await Blog.countDocuments();

        res.json({
            blogs,
            pagination: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error("Fetch Blogs Error:", error);
        res.status(500).json({ error: "Failed to fetch blogs" });
    }
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
app.delete('/api/delete-blog/:id', checkAuth, async (req, res) => {
    try {
        await Blog.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: "Blog Deleted!" });
    } catch (error) {
        res.status(500).json({ success: false, error: "Delete failed" });
    }
});

// 2. Edit (Update) Blog
app.put('/api/edit-blog/:id', checkAuth, async (req, res) => {
    try {
        // req.body mein naya data aayega (title, content etc.)
        await Blog.findByIdAndUpdate(req.params.id, req.body);
        res.json({ success: true, message: "Blog Updated Successfully!" });
    } catch (error) {
        res.status(500).json({ success: false, error: "Update failed" });
    }
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
