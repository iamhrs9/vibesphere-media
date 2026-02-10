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
}