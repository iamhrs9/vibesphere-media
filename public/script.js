// --- DOM ELEMENTS SELECTION ---
const hamburgerBtn = document.getElementById('hamburger-btn');
const navMenu = document.getElementById('nav-menu');

// --- HAMBURGER MENU LOGIC ---
if (hamburgerBtn && navMenu) {
    hamburgerBtn.addEventListener('click', () => {
        navMenu.classList.toggle('active');
    });

    const navLinks = document.querySelectorAll('.nav-links li a');
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            navMenu.classList.remove('active');
        });
    });
}

// --- MODAL FUNCTIONS ---
function openModal(planName, price) {
    const modal = document.getElementById('detailsModal');
    const pkgInput = document.getElementById('selectedPackage');
    const priceInput = document.getElementById('selectedPrice');

    if (modal) {
        modal.style.display = 'flex';
        if(pkgInput) pkgInput.value = planName;
        if(priceInput) priceInput.value = price;
    }
}

function closeModal() {
    const modal = document.getElementById('detailsModal');
    if (modal) modal.style.display = 'none';
}

// --- CHECKOUT LOGIC ---
// --- script.js ---

function openModal(packageName, priceText) {
    document.getElementById('detailsModal').style.display = 'flex';
    document.getElementById('selectedPackage').value = packageName;
    document.getElementById('selectedPrice').value = priceText; // e.g. "19 USD" or "₹399"
}

function closeModal() {
    document.getElementById('detailsModal').style.display = 'none';
}

function goToCheckout() {
    const pkg = document.getElementById('selectedPackage').value;
    const priceStr = document.getElementById('selectedPrice').value;
    const insta = document.getElementById('instaId').value;

    if (!insta) return alert("Please enter Instagram ID");

    // 🧠 SMART LOGIC: Price string me se Currency nikalna
    let currency = "INR"; // Default
    
    if (priceStr.includes("USD") || priceStr.includes("$")) currency = "USD";
    else if (priceStr.includes("NPR")) currency = "NPR";
    else if (priceStr.includes("EUR") || priceStr.includes("€")) currency = "EUR";
    // Aur bhi add kar sakte ho

    // URL banate waqt Currency bhi saath bhejo
    window.location.href = `checkout.html?package=${encodeURIComponent(pkg)}&price=${encodeURIComponent(priceStr)}&currency=${currency}&insta=${encodeURIComponent(insta)}`;
}

// ==========================================
// 🤖 AI CHATBOT LOGIC (MEMORY + ERROR HANDLING)
// ==========================================
let chatHistory = []; // Memory Array

function toggleChat() {
    const box = document.getElementById('chat-box');
    if (box.style.display === 'flex') {
        box.style.display = 'none';
    } else {
        box.style.display = 'flex';
    }
}

function handleEnter(e) { 
    if(e.key === 'Enter') {
        sendMessage(); 
    }
}

async function sendMessage() {
    const input = document.getElementById('user-input');
    const chatBody = document.getElementById('chat-body');
    const txt = input.value.trim();

    if(!txt) return;

    // 1. User Message Show
    chatBody.innerHTML += `<div class="user-msg">${txt}</div>`;
    input.value = "";
    chatBody.scrollTop = chatBody.scrollHeight;

    // 2. Loading Indicator
    const loadingId = "load_" + Date.now();
    chatBody.innerHTML += `<div class="bot-msg" id="${loadingId}">Thinking... 🤔</div>`;
    chatBody.scrollTop = chatBody.scrollHeight;

    // 3. Update History
    chatHistory.push({ role: "user", parts: [{ text: txt }] });

    try {
        // 4. Send to Server
        const res = await fetch('/api/chat', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ history: chatHistory }) 
        });

        const data = await res.json();
        
        // 5. Remove Loading
        const loader = document.getElementById(loadingId);
        if(loader) loader.remove();

        // 6. Show Reply
        if (data.reply) {
            chatBody.innerHTML += `<div class="bot-msg">${data.reply}</div>`;
            chatHistory.push({ role: "model", parts: [{ text: data.reply }] });
        } else {
            chatBody.innerHTML += `<div class="bot-msg" style="color:red;">⚠️ Server Error.</div>`;
        }
        
    } catch (err) {
        console.error("Chat Error:", err);
        const loader = document.getElementById(loadingId);
        if(loader) loader.remove();
        chatBody.innerHTML += `<div class="bot-msg" style="color:red;">❌ Connection Failed.</div>`;
    }

    chatBody.scrollTop = chatBody.scrollHeight;
}// ==========================================
// 🌟 REVIEW SYSTEM (UPDATED)
// ==========================================

// 1. Schema (Added Avatar Field)
const reviewSchema = new mongoose.Schema({
    name: String,
    instaId: String,
    message: String,
    rating: { type: Number, default: 5 },
    avatar: { type: String, default: "" }, // Base64 Image String
    date: { type: Date, default: Date.now }
});
const Review = mongoose.model('Review', reviewSchema);

// 2. API: Get Reviews + Dynamic Stats
app.get('/api/reviews', async (req, res) => {
    try {
        // Saare reviews lao (Latest first)
        const reviews = await Review.find().sort({ date: -1 }).limit(50);
        
        // --- 🧮 Calculate Average Rating ---
        const allReviews = await Review.find(); // Stats ke liye saare chahiye
        let totalStars = 0;
        
        allReviews.forEach(r => totalStars += r.rating);
        
        // Agar koi review nahi hai to default 4.9, warna calculate karo
        const avgRating = allReviews.length > 0 ? (totalStars / allReviews.length).toFixed(1) : "4.9";
        const totalCount = allReviews.length > 0 ? allReviews.length : "1200+"; // 1200 Fake start base

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

// 3. API: Add Review (With Image)
app.post('/api/add-review', async (req, res) => {
    try {
        const { name, instaId, message, rating, avatar } = req.body;
        
        const newReview = new Review({
            name,
            instaId,
            message,
            rating: rating || 5,
            avatar: avatar || "" // Image string (Compressed)
        });

        await newReview.save();
        res.json({ success: true, message: "Review Saved!" });
    } catch (err) {
        console.error("Save Error:", err);
        res.status(500).json({ success: false, error: "Failed to add review" });
    }
});
